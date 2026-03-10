import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';

const webhookPayloadSchema = z.object({
  summary: z.string().min(1, 'summary is required'),
  severity: z.enum(['CRITICAL', 'ERROR', 'WARNING', 'INFO']).optional().default('ERROR'),
  dedupKey: z.string().optional(),
  rawPayload: z.record(z.string(), z.unknown()).optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ integrationKey: string }> }
) {
  try {
    const { integrationKey } = await params;

    // Validate integration key exists
    const integration = await prisma.integration.findUnique({
      where: { integrationKey },
      include: { service: true },
    });

    if (!integration) {
      return NextResponse.json(
        { error: 'Invalid integration key' },
        { status: 404 }
      );
    }

    // Parse and validate request body
    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json(
        { error: 'Invalid JSON payload' },
        { status: 400 }
      );
    }

    const parsed = webhookPayloadSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid payload', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { summary, severity, dedupKey, rawPayload } = parsed.data;
    const serviceId = integration.serviceId;

    // Dedup logic: check for existing open alert with same dedupKey + service
    if (dedupKey) {
      const existingAlert = await prisma.alert.findFirst({
        where: {
          dedupKey,
          serviceId,
          status: 'OPEN',
        },
      });

      if (existingAlert) {
        // Update existing alert instead of creating new
        const updatedAlert = await prisma.alert.update({
          where: { id: existingAlert.id },
          data: {
            summary,
            severity,
            rawPayload: rawPayload ?? undefined,
          },
        });

        return NextResponse.json(
          {
            message: 'Alert updated (dedup)',
            alertId: updatedAlert.id,
            incidentId: updatedAlert.incidentId,
            deduplicated: true,
          },
          { status: 200 }
        );
      }
    }

    // Create new alert and incident in a transaction
    const result = await prisma.$transaction(async (tx: typeof prisma) => {
      // Create the incident
      const incident = await tx.incident.create({
        data: {
          title: summary,
          status: 'TRIGGERED',
          urgency: severity === 'CRITICAL' || severity === 'ERROR' ? 'HIGH' : 'LOW',
          serviceId,
        },
      });

      // Create the alert linked to the incident
      const alert = await tx.alert.create({
        data: {
          summary,
          severity,
          dedupKey: dedupKey ?? null,
          rawPayload: rawPayload ?? undefined,
          status: 'OPEN',
          serviceId,
          integrationId: integration.id,
          incidentId: incident.id,
        },
      });

      // Create incident log entry
      await tx.incidentLog.create({
        data: {
          type: 'CREATED',
          message: `Incident created from webhook alert: ${summary}`,
          incidentId: incident.id,
        },
      });

      return { alert, incident };
    });

    return NextResponse.json(
      {
        message: 'Alert created',
        alertId: result.alert.id,
        incidentId: result.incident.id,
        deduplicated: false,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Webhook handler error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

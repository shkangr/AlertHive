import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/db';
import { cancelEscalation } from '@/lib/escalation';
import { incidentEvents } from '@/lib/event-emitter';
import { getSlackSigningSecret, updateIncidentMessage } from '@/lib/slack';

export async function POST(request: NextRequest) {
  try {
    // Read raw body for signature verification
    const rawBody = await request.text();

    // Verify Slack signing secret
    const signingSecret = await getSlackSigningSecret();
    if (signingSecret) {
      const timestamp = request.headers.get('x-slack-request-timestamp') ?? '';
      const slackSignature = request.headers.get('x-slack-signature') ?? '';

      // Prevent replay attacks (5 minute window)
      const now = Math.floor(Date.now() / 1000);
      if (Math.abs(now - parseInt(timestamp)) > 300) {
        return NextResponse.json({ error: 'Request too old' }, { status: 403 });
      }

      const sigBasestring = `v0:${timestamp}:${rawBody}`;
      const hmac = crypto
        .createHmac('sha256', signingSecret)
        .update(sigBasestring)
        .digest('hex');
      const expectedSignature = `v0=${hmac}`;

      if (
        !crypto.timingSafeEqual(
          Buffer.from(slackSignature),
          Buffer.from(expectedSignature)
        )
      ) {
        return NextResponse.json({ error: 'Invalid signature' }, { status: 403 });
      }
    }

    // Parse the Slack interaction payload
    const params = new URLSearchParams(rawBody);
    const payloadStr = params.get('payload');
    if (!payloadStr) {
      return NextResponse.json({ error: 'Missing payload' }, { status: 400 });
    }

    const payload = JSON.parse(payloadStr);

    if (payload.type !== 'block_actions') {
      return NextResponse.json({ ok: true });
    }

    const action = payload.actions?.[0];
    if (!action) {
      return NextResponse.json({ ok: true });
    }

    const incidentId = action.value;
    const actionId = action.action_id;

    if (actionId === 'acknowledge_incident') {
      await handleAcknowledge(incidentId, payload);
    } else if (actionId === 'resolve_incident') {
      await handleResolve(incidentId, payload);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[Slack Interactions] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function handleAcknowledge(
  incidentId: string,
  payload: { user?: { name?: string; username?: string }; message?: { ts?: string }; channel?: { id?: string } }
) {
  const incident = await prisma.incident.findUnique({
    where: { id: incidentId },
    include: { service: { select: { id: true, name: true } } },
  });

  if (!incident || incident.status !== 'TRIGGERED') {
    console.log(`[Slack] Incident ${incidentId} cannot be acknowledged (status: ${incident?.status})`);
    return;
  }

  const slackUserName = payload.user?.name ?? payload.user?.username ?? 'Slack user';
  const now = new Date();

  const updated = await prisma.$transaction(async (tx) => {
    const updatedIncident = await tx.incident.update({
      where: { id: incidentId },
      data: {
        status: 'ACKNOWLEDGED',
        acknowledgedAt: now,
      },
      include: { service: { select: { id: true, name: true } } },
    });

    await tx.incidentLog.create({
      data: {
        type: 'ACKNOWLEDGED',
        message: `Acknowledged via Slack by ${slackUserName}`,
        incidentId,
      },
    });

    return updatedIncident;
  });

  await cancelEscalation(incidentId);

  // Emit SSE event
  incidentEvents.emitIncidentUpdate({
    type: 'acknowledged',
    incident: {
      id: updated.id,
      number: updated.number,
      title: updated.title,
      status: updated.status,
      urgency: updated.urgency,
      serviceId: updated.serviceId,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
      acknowledgedAt: updated.acknowledgedAt?.toISOString() ?? null,
      resolvedAt: updated.resolvedAt?.toISOString() ?? null,
    },
    timestamp: now.toISOString(),
  });

  // Update the Slack message to reflect new status
  const messageTs = payload.message?.ts;
  if (messageTs) {
    await updateIncidentMessage(updated, messageTs);
  }
}

async function handleResolve(
  incidentId: string,
  payload: { user?: { name?: string; username?: string }; message?: { ts?: string }; channel?: { id?: string } }
) {
  const incident = await prisma.incident.findUnique({
    where: { id: incidentId },
    include: { service: { select: { id: true, name: true } } },
  });

  if (!incident || incident.status === 'RESOLVED') {
    console.log(`[Slack] Incident ${incidentId} cannot be resolved (status: ${incident?.status})`);
    return;
  }

  const slackUserName = payload.user?.name ?? payload.user?.username ?? 'Slack user';
  const now = new Date();

  const updated = await prisma.$transaction(async (tx) => {
    const updatedIncident = await tx.incident.update({
      where: { id: incidentId },
      data: {
        status: 'RESOLVED',
        resolvedAt: now,
      },
      include: { service: { select: { id: true, name: true } } },
    });

    await tx.incidentLog.create({
      data: {
        type: 'RESOLVED',
        message: `Resolved via Slack by ${slackUserName}`,
        incidentId,
      },
    });

    return updatedIncident;
  });

  await cancelEscalation(incidentId);

  // Emit SSE event
  incidentEvents.emitIncidentUpdate({
    type: 'resolved',
    incident: {
      id: updated.id,
      number: updated.number,
      title: updated.title,
      status: updated.status,
      urgency: updated.urgency,
      serviceId: updated.serviceId,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
      acknowledgedAt: updated.acknowledgedAt?.toISOString() ?? null,
      resolvedAt: updated.resolvedAt?.toISOString() ?? null,
    },
    timestamp: now.toISOString(),
  });

  // Update the Slack message to reflect new status
  const messageTs = payload.message?.ts;
  if (messageTs) {
    await updateIncidentMessage(updated, messageTs);
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { cancelEscalation } from '@/lib/escalation';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const incident = await prisma.incident.findUnique({
      where: { id },
    });

    if (!incident) {
      return NextResponse.json({ error: 'Incident not found' }, { status: 404 });
    }

    if (incident.status === 'RESOLVED') {
      return NextResponse.json(
        { error: 'Incident is already resolved' },
        { status: 400 }
      );
    }

    const now = new Date();

    const updated = await prisma.$transaction(async (tx) => {
      const updatedIncident = await tx.incident.update({
        where: { id },
        data: {
          status: 'RESOLVED',
          resolvedAt: now,
        },
      });

      await tx.incidentLog.create({
        data: {
          type: 'RESOLVED',
          message: `Resolved by ${session.user?.name ?? session.user?.email ?? 'unknown'}`,
          incidentId: id,
          userId: session.user?.id,
        },
      });

      return updatedIncident;
    });

    // Cancel escalation timer
    await cancelEscalation(id);

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Resolve incident error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

import { prisma } from '@/lib/db';
import { calculateOnCall } from '@/lib/oncall';
import { incidentEvents } from '@/lib/event-emitter';
import { ensureBossStarted, ESCALATION_QUEUE } from '@/lib/queue';

interface EscalationJobData {
  incidentId: string;
  currentStep: number;
  currentRepeat: number;
}

/**
 * Trigger escalation for a newly created incident.
 * Loads the incident's service → escalation policy → rules (ordered),
 * starts at Step 1 (order 0), notifies targets, and schedules timeout.
 */
export async function triggerEscalation(incidentId: string): Promise<void> {
  const incident = await prisma.incident.findUnique({
    where: { id: incidentId },
    include: {
      service: {
        include: {
          escalationPolicy: {
            include: {
              rules: {
                orderBy: { order: 'asc' },
                include: {
                  targets: {
                    include: {
                      user: { select: { id: true, name: true } },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!incident) {
    console.error(`[Escalation] Incident ${incidentId} not found`);
    return;
  }

  const policy = incident.service.escalationPolicy;
  if (!policy || policy.rules.length === 0) {
    console.log(`[Escalation] No escalation policy for service ${incident.service.name}`);
    return;
  }

  // Start at step 0 (first rule)
  await notifyAndSchedule(incidentId, policy, 0, 0);
}

/**
 * Escalate to the next step when timeout expires.
 * If more steps exist → notify next targets, schedule next timeout.
 * If no more steps and repeat > 0 → restart from Step 0.
 */
export async function escalateToNextStep(
  incidentId: string,
  currentStep: number,
  currentRepeat: number
): Promise<void> {
  // Re-check incident status — if already acknowledged/resolved, skip
  const incident = await prisma.incident.findUnique({
    where: { id: incidentId },
    include: {
      service: {
        include: {
          escalationPolicy: {
            include: {
              rules: {
                orderBy: { order: 'asc' },
                include: {
                  targets: {
                    include: {
                      user: { select: { id: true, name: true } },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!incident || incident.status !== 'TRIGGERED') {
    console.log(`[Escalation] Incident ${incidentId} is no longer TRIGGERED, skipping escalation`);
    return;
  }

  const policy = incident.service.escalationPolicy;
  if (!policy) return;

  const nextStep = currentStep + 1;

  if (nextStep < policy.rules.length) {
    // More steps in this cycle — escalate to next
    await prisma.incidentLog.create({
      data: {
        type: 'ESCALATED',
        message: `Escalated from step ${currentStep + 1} to step ${nextStep + 1}`,
        incidentId,
      },
    });

    emitEscalationEvent(incident);
    await notifyAndSchedule(incidentId, policy, nextStep, currentRepeat);
  } else if (currentRepeat + 1 < policy.repeatCount) {
    // No more steps but can repeat — restart from step 0
    const nextRepeat = currentRepeat + 1;

    await prisma.incidentLog.create({
      data: {
        type: 'ESCALATED',
        message: `Escalation cycle restarted (repeat ${nextRepeat + 1}/${policy.repeatCount})`,
        incidentId,
      },
    });

    emitEscalationEvent(incident);
    await notifyAndSchedule(incidentId, policy, 0, nextRepeat);
  } else {
    console.log(`[Escalation] All escalation steps exhausted for incident ${incidentId}`);
  }
}

/**
 * Cancel pending escalation jobs for an incident.
 */
export async function cancelEscalation(incidentId: string): Promise<void> {
  const boss = await ensureBossStarted();
  const jobKey = `escalation-${incidentId}`;

  try {
    // Find pending jobs with this singletonKey
    const jobs = await boss.findJobs(ESCALATION_QUEUE, { key: jobKey, queued: true });
    const jobIds = jobs.map((j) => j.id);

    if (jobIds.length > 0) {
      await boss.cancel(ESCALATION_QUEUE, jobIds);
      console.log(`[Escalation] Cancelled ${jobIds.length} pending job(s) for incident ${incidentId}`);
    }
  } catch {
    // Job may have already completed or been cancelled — that's fine
    console.log(`[Escalation] No pending job to cancel for incident ${incidentId}`);
  }
}

/**
 * Initialize the escalation worker that processes timeout jobs.
 */
export async function startEscalationWorker(): Promise<void> {
  const boss = await ensureBossStarted();

  await boss.work<EscalationJobData>(ESCALATION_QUEUE, async (jobs) => {
    for (const job of jobs) {
      const { incidentId, currentStep, currentRepeat } = job.data;
      console.log(`[Escalation Worker] Processing timeout for incident ${incidentId}, step ${currentStep}`);
      await escalateToNextStep(incidentId, currentStep, currentRepeat);
    }
  });

  console.log('[Escalation Worker] Started listening for escalation timeout jobs');
}

// ─── Internal Helpers ────────────────────────────────────────

interface IncidentForEvent {
  id: string;
  number: number;
  title: string;
  status: string;
  urgency: string;
  serviceId: string;
  createdAt: Date;
  updatedAt: Date;
  acknowledgedAt: Date | null;
  resolvedAt: Date | null;
}

function emitEscalationEvent(incident: IncidentForEvent) {
  incidentEvents.emitIncidentUpdate({
    type: 'escalated',
    incident: {
      id: incident.id,
      number: incident.number,
      title: incident.title,
      status: incident.status,
      urgency: incident.urgency,
      serviceId: incident.serviceId,
      createdAt: incident.createdAt.toISOString(),
      updatedAt: incident.updatedAt.toISOString(),
      acknowledgedAt: incident.acknowledgedAt?.toISOString() ?? null,
      resolvedAt: incident.resolvedAt?.toISOString() ?? null,
    },
    timestamp: new Date().toISOString(),
  });
}

interface PolicyWithRules {
  id: string;
  repeatCount: number;
  rules: Array<{
    id: string;
    order: number;
    timeoutMinutes: number;
    targets: Array<{
      id: string;
      targetType: string;
      userId: string | null;
      scheduleId: string | null;
      user: { id: string; name: string } | null;
    }>;
  }>;
}

/**
 * Notify targets at the given step and schedule the timeout job for the next step.
 */
async function notifyAndSchedule(
  incidentId: string,
  policy: PolicyWithRules,
  step: number,
  repeat: number
): Promise<void> {
  const rule = policy.rules[step];
  if (!rule) return;

  // Resolve all targets for this step
  const notifiedUsers: string[] = [];

  for (const target of rule.targets) {
    if (target.targetType === 'USER' && target.user) {
      notifiedUsers.push(target.user.name);

      await prisma.incidentLog.create({
        data: {
          type: 'NOTIFIED',
          message: `Notified ${target.user.name} (step ${step + 1})`,
          incidentId,
          userId: target.user.id,
        },
      });
    } else if (target.targetType === 'SCHEDULE' && target.scheduleId) {
      // Resolve who's on-call right now
      const onCallResult = await calculateOnCall(target.scheduleId, new Date());

      if (onCallResult && onCallResult.onCallUsers.length > 0) {
        for (const onCallUser of onCallResult.onCallUsers) {
          notifiedUsers.push(onCallUser.userName);

          await prisma.incidentLog.create({
            data: {
              type: 'NOTIFIED',
              message: `Notified ${onCallUser.userName} (on-call from ${onCallResult.scheduleName}, step ${step + 1})`,
              incidentId,
              userId: onCallUser.userId,
            },
          });
        }
      } else {
        console.warn(`[Escalation] No on-call users found for schedule ${target.scheduleId}`);
      }
    }
  }

  console.log(`[Escalation] Step ${step + 1}: Notified [${notifiedUsers.join(', ')}] for incident ${incidentId}`);

  // Schedule the timeout job for the next escalation step
  const boss = await ensureBossStarted();
  const jobKey = `escalation-${incidentId}`;

  const jobData: EscalationJobData = {
    incidentId,
    currentStep: step,
    currentRepeat: repeat,
  };

  await boss.send(ESCALATION_QUEUE, jobData, {
    startAfter: rule.timeoutMinutes * 60, // seconds
    singletonKey: jobKey,
  });

  console.log(`[Escalation] Scheduled timeout in ${rule.timeoutMinutes}m for incident ${incidentId}`);
}

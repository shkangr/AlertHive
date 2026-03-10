import { prisma } from '@/lib/db';

export interface OnCallUser {
  userId: string;
  userName: string;
  layerName: string;
}

export interface OnCallResult {
  scheduleId: string;
  scheduleName: string;
  at: string;
  onCallUsers: OnCallUser[];
}

/**
 * Calculate who is on-call for a given schedule at a specific time.
 *
 * For each layer (ordered), determines the on-call participant based on
 * rotation type and shift duration. Overrides take precedence over
 * calculated rotations.
 */
export async function calculateOnCall(
  scheduleId: string,
  at: Date
): Promise<OnCallResult | null> {
  const schedule = await prisma.schedule.findUnique({
    where: { id: scheduleId },
    include: {
      layers: {
        orderBy: { order: 'asc' },
        include: {
          participants: {
            orderBy: { order: 'asc' },
          },
        },
      },
      overrides: {
        where: {
          startTime: { lte: at },
          endTime: { gt: at },
        },
        include: {
          user: { select: { id: true, name: true } },
        },
      },
    },
  });

  if (!schedule) {
    return null;
  }

  const onCallUsers: OnCallUser[] = [];

  for (const layer of schedule.layers) {
    if (layer.participants.length === 0) continue;

    // Check if an override covers this time
    // Overrides apply to the entire schedule (all layers)
    if (schedule.overrides.length > 0) {
      // Use the most recently created override
      const override = schedule.overrides[schedule.overrides.length - 1];
      const overrideUser = override.user;

      // Check if this override user is already in the result from a different layer
      const alreadyAdded = onCallUsers.some(
        (u) => u.userId === overrideUser.id
      );
      if (!alreadyAdded) {
        onCallUsers.push({
          userId: overrideUser.id,
          userName: overrideUser.name,
          layerName: layer.name,
        });
      }
      continue;
    }

    // Calculate rotation position
    const participantIndex = getRotationIndex(
      layer.startTime,
      at,
      layer.rotationType,
      layer.shiftDuration,
      layer.participants.length
    );

    const participant = layer.participants[participantIndex];
    if (!participant) continue;

    // Fetch user details for the participant
    const user = await prisma.user.findUnique({
      where: { id: participant.userId },
      select: { id: true, name: true },
    });

    if (user) {
      onCallUsers.push({
        userId: user.id,
        userName: user.name,
        layerName: layer.name,
      });
    }
  }

  return {
    scheduleId: schedule.id,
    scheduleName: schedule.name,
    at: at.toISOString(),
    onCallUsers,
  };
}

/**
 * Calculate which participant index is on-call based on rotation settings.
 *
 * - DAILY: rotates every `shiftDuration` hours (typically 24)
 * - WEEKLY: rotates every `shiftDuration` hours (typically 168 = 7*24)
 * - CUSTOM: rotates every `shiftDuration` hours
 *
 * All types use the same math — the enum primarily communicates intent.
 */
function getRotationIndex(
  layerStartTime: Date,
  queryTime: Date,
  rotationType: string,
  shiftDurationHours: number,
  participantCount: number
): number {
  if (participantCount === 0) return 0;

  const msPerHour = 60 * 60 * 1000;

  // Effective shift duration based on rotation type
  let effectiveShiftHours: number;
  switch (rotationType) {
    case 'DAILY':
      effectiveShiftHours = 24;
      break;
    case 'WEEKLY':
      effectiveShiftHours = 168; // 7 * 24
      break;
    case 'CUSTOM':
    default:
      effectiveShiftHours = shiftDurationHours;
      break;
  }

  const elapsed = queryTime.getTime() - layerStartTime.getTime();
  if (elapsed < 0) return 0; // Query time is before the layer started

  const shiftsSinceStart = Math.floor(elapsed / (effectiveShiftHours * msPerHour));
  return shiftsSinceStart % participantCount;
}

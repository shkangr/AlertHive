import { WebClient } from '@slack/web-api';
import type { KnownBlock } from '@slack/types';
import { prisma } from '@/lib/db';

/**
 * Get a Slack WebClient from the first SlackConfig in the database.
 * Returns null if no config exists (gracefully skip).
 */
export async function getSlackClient(): Promise<{
  client: WebClient;
  channelId: string;
} | null> {
  const config = await prisma.slackConfig.findFirst();
  if (!config?.botToken) {
    console.log('[Slack] No SlackConfig found, skipping Slack notification');
    return null;
  }

  return {
    client: new WebClient(config.botToken),
    channelId: config.channelId,
  };
}

/**
 * Get the Slack signing secret for verifying requests.
 */
export async function getSlackSigningSecret(): Promise<string | null> {
  const config = await prisma.slackConfig.findFirst();
  return config?.signingSecret ?? null;
}

interface IncidentForSlack {
  id: string;
  number: number;
  title: string;
  status: string;
  urgency: string;
  service: { name: string };
  createdAt: Date;
}

/**
 * Send an incident notification to the configured Slack channel.
 * Returns the message timestamp (ts) for later updates.
 */
export async function sendIncidentNotification(
  incident: IncidentForSlack
): Promise<string | null> {
  const slack = await getSlackClient();
  if (!slack) return null;

  try {
    const result = await slack.client.chat.postMessage({
      channel: slack.channelId,
      text: `🚨 Incident #${incident.number}: ${incident.title}`,
      blocks: buildIncidentBlocks(incident),
    });

    return result.ts ?? null;
  } catch (error) {
    console.error('[Slack] Failed to send incident notification:', error);
    return null;
  }
}

/**
 * Update an existing Slack message after incident state change.
 */
export async function updateIncidentMessage(
  incident: IncidentForSlack & {
    acknowledgedAt?: Date | null;
    resolvedAt?: Date | null;
  },
  messageTs: string
): Promise<void> {
  const slack = await getSlackClient();
  if (!slack) return;

  try {
    await slack.client.chat.update({
      channel: slack.channelId,
      ts: messageTs,
      text: `Incident #${incident.number}: ${incident.title} [${incident.status}]`,
      blocks: buildIncidentBlocks(incident),
    });
  } catch (error) {
    console.error('[Slack] Failed to update incident message:', error);
  }
}

/**
 * Send an escalation DM to a user (if they have a slackUserId).
 */
export async function sendEscalationDM(
  userId: string,
  incident: IncidentForSlack
): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { slackUserId: true, name: true },
  });

  if (!user?.slackUserId) {
    console.log(`[Slack] User ${userId} has no slackUserId, skipping DM`);
    return;
  }

  const slack = await getSlackClient();
  if (!slack) return;

  try {
    await slack.client.chat.postMessage({
      channel: user.slackUserId,
      text: `🔔 You've been escalated for Incident #${incident.number}: ${incident.title}`,
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `🔔 *You've been escalated*\n\n*Incident #${incident.number}:* ${incident.title}\n*Service:* ${incident.service.name}\n*Urgency:* ${incident.urgency}\n*Created:* <!date^${Math.floor(incident.createdAt.getTime() / 1000)}^{date_short_pretty} at {time}|${incident.createdAt.toISOString()}>`,
          },
        },
        {
          type: 'actions',
          elements: [
            {
              type: 'button' as const,
              text: { type: 'plain_text' as const, text: 'Acknowledge' },
              style: 'primary' as const,
              action_id: 'acknowledge_incident',
              value: incident.id,
            },
            {
              type: 'button' as const,
              text: { type: 'plain_text' as const, text: 'Resolve' },
              style: 'danger' as const,
              action_id: 'resolve_incident',
              value: incident.id,
            },
          ],
        },
      ] as KnownBlock[],
    });
  } catch (error) {
    console.error(`[Slack] Failed to send escalation DM to ${user.name}:`, error);
  }
}

// ─── Block Kit Helpers ───────────────────────────────────────

function buildIncidentBlocks(
  incident: IncidentForSlack & {
    acknowledgedAt?: Date | null;
    resolvedAt?: Date | null;
  }
) {
  const statusEmoji = getStatusEmoji(incident.status);
  const urgencyEmoji = incident.urgency === 'HIGH' ? '🔴' : '🟡';

  const blocks: KnownBlock[] = [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: `${statusEmoji} Incident #${incident.number}`,
        emoji: true,
      },
    },
    {
      type: 'section',
      fields: [
        {
          type: 'mrkdwn',
          text: `*Title:*\n${incident.title}`,
        },
        {
          type: 'mrkdwn',
          text: `*Status:*\n${incident.status}`,
        },
        {
          type: 'mrkdwn',
          text: `*Service:*\n${incident.service.name}`,
        },
        {
          type: 'mrkdwn',
          text: `*Urgency:*\n${urgencyEmoji} ${incident.urgency}`,
        },
      ],
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*Created:* <!date^${Math.floor(incident.createdAt.getTime() / 1000)}^{date_short_pretty} at {time}|${incident.createdAt.toISOString()}>`,
      },
    },
  ];

  // Only show action buttons for non-resolved incidents
  if (incident.status !== 'RESOLVED') {
    blocks.push({
      type: 'actions',
      elements: [
        ...(incident.status === 'TRIGGERED'
          ? [
              {
                type: 'button' as const,
                text: { type: 'plain_text' as const, text: 'Acknowledge' },
                style: 'primary' as const,
                action_id: 'acknowledge_incident',
                value: incident.id,
              },
            ]
          : []),
        {
          type: 'button' as const,
          text: { type: 'plain_text' as const, text: 'Resolve' },
          style: 'danger' as const,
          action_id: 'resolve_incident',
          value: incident.id,
        },
      ],
    });
  }

  return blocks;
}

function getStatusEmoji(status: string): string {
  switch (status) {
    case 'TRIGGERED':
      return '🚨';
    case 'ACKNOWLEDGED':
      return '👀';
    case 'RESOLVED':
      return '✅';
    default:
      return '❓';
  }
}

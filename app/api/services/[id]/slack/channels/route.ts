import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { WebClient } from "@slack/web-api";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Use the global bot token
  const config = await prisma.slackConfig.findFirst();
  if (!config?.botToken) {
    return NextResponse.json(
      { error: "Global Slack configuration is not set up. Please configure it in Settings > Slack first." },
      { status: 400 }
    );
  }

  try {
    const client = new WebClient(config.botToken);
    const result = await client.conversations.list({
      types: "public_channel,private_channel",
      exclude_archived: true,
      limit: 200,
    });

    const channels = (result.channels || [])
      .filter((c) => c.id && c.name)
      .map((c) => ({
        id: c.id!,
        name: c.name!,
        is_private: c.is_private || false,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    return NextResponse.json(channels);
  } catch (error) {
    console.error("[Slack] Failed to fetch channels:", error);
    return NextResponse.json(
      { error: "Failed to fetch channels. Please check the global Slack configuration." },
      { status: 400 }
    );
  }
}

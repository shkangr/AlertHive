import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { WebClient } from "@slack/web-api";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const botToken = searchParams.get("botToken");

  if (!botToken) {
    return NextResponse.json(
      { error: "Bot token is required to fetch channels" },
      { status: 400 }
    );
  }

  try {
    const client = new WebClient(botToken);
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
      { error: "Failed to fetch channels. Please check your Bot Token." },
      { status: 400 }
    );
  }
}

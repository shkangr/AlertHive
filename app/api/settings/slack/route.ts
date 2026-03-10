import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const config = await prisma.slackConfig.findFirst();

  if (!config) {
    return NextResponse.json({
      configured: false,
      botToken: "",
      signingSecret: "",
      channelId: "",
      channelName: "",
    });
  }

  // Mask sensitive values — only show last 4 characters
  const maskToken = (token: string) => {
    if (!token || token.length < 8) return token ? "••••" : "";
    return "••••••••" + token.slice(-4);
  };

  return NextResponse.json({
    configured: true,
    botToken: maskToken(config.botToken),
    signingSecret: maskToken(config.signingSecret),
    channelId: config.channelId,
    channelName: config.channelName || "",
  });
}

export async function PUT(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { botToken, signingSecret, channelId, channelName } = body;

  if (!botToken || !signingSecret || !channelId) {
    return NextResponse.json(
      { error: "Bot Token, Signing Secret, and Channel are required" },
      { status: 400 }
    );
  }

  const existing = await prisma.slackConfig.findFirst();

  // If token values are masked (contain ••••), keep the existing values
  const resolvedBotToken =
    botToken.includes("••••") && existing ? existing.botToken : botToken;
  const resolvedSigningSecret =
    signingSecret.includes("••••") && existing
      ? existing.signingSecret
      : signingSecret;

  if (existing) {
    await prisma.slackConfig.update({
      where: { id: existing.id },
      data: {
        botToken: resolvedBotToken,
        signingSecret: resolvedSigningSecret,
        channelId,
        channelName: channelName || null,
      },
    });
  } else {
    await prisma.slackConfig.create({
      data: {
        botToken: resolvedBotToken,
        signingSecret: resolvedSigningSecret,
        channelId,
        channelName: channelName || null,
      },
    });
  }

  return NextResponse.json({ success: true });
}

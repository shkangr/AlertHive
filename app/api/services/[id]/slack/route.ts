import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const service = await prisma.service.findUnique({
    where: { id },
    select: { slackChannelId: true, slackChannelName: true },
  });

  if (!service) {
    return NextResponse.json({ error: "Service not found" }, { status: 404 });
  }

  return NextResponse.json({
    channelId: service.slackChannelId || "",
    channelName: service.slackChannelName || "",
  });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const { channelId, channelName } = body;

  const service = await prisma.service.findUnique({ where: { id } });
  if (!service) {
    return NextResponse.json({ error: "Service not found" }, { status: 404 });
  }

  await prisma.service.update({
    where: { id },
    data: {
      slackChannelId: channelId || null,
      slackChannelName: channelName || null,
    },
  });

  return NextResponse.json({ success: true });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const service = await prisma.service.findUnique({ where: { id } });
  if (!service) {
    return NextResponse.json({ error: "Service not found" }, { status: 404 });
  }

  await prisma.service.update({
    where: { id },
    data: {
      slackChannelId: null,
      slackChannelName: null,
    },
  });

  return NextResponse.json({ success: true });
}

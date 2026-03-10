import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const { userId, startTime, endTime } = body;

  if (!userId || !startTime || !endTime) {
    return NextResponse.json(
      { error: "userId, startTime, and endTime are required" },
      { status: 400 }
    );
  }

  const start = new Date(startTime);
  const end = new Date(endTime);

  if (end <= start) {
    return NextResponse.json(
      { error: "End time must be after start time" },
      { status: 400 }
    );
  }

  const schedule = await prisma.schedule.findUnique({ where: { id } });
  if (!schedule) {
    return NextResponse.json(
      { error: "Schedule not found" },
      { status: 404 }
    );
  }

  const override = await prisma.scheduleOverride.create({
    data: {
      scheduleId: id,
      userId,
      startTime: start,
      endTime: end,
    },
    include: {
      user: { select: { id: true, name: true, email: true } },
    },
  });

  return NextResponse.json(override, { status: 201 });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const overrideId = searchParams.get("overrideId");

  if (!overrideId) {
    return NextResponse.json(
      { error: "overrideId query param is required" },
      { status: 400 }
    );
  }

  await prisma.scheduleOverride.delete({ where: { id: overrideId } });

  return NextResponse.json({ success: true });
}

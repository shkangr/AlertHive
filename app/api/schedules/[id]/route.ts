import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const schedule = await prisma.schedule.findUnique({
    where: { id },
    include: {
      layers: {
        orderBy: { order: "asc" },
        include: {
          participants: {
            orderBy: { order: "asc" },
          },
        },
      },
      overrides: {
        orderBy: { startTime: "desc" },
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
      },
    },
  });

  if (!schedule) {
    return NextResponse.json({ error: "Schedule not found" }, { status: 404 });
  }

  return NextResponse.json(schedule);
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const { name, timezone, layers } = body;

  if (!name?.trim()) {
    return NextResponse.json(
      { error: "Schedule name is required" },
      { status: 400 }
    );
  }

  const existing = await prisma.schedule.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json(
      { error: "Schedule not found" },
      { status: 404 }
    );
  }

  // Delete existing layers and recreate
  await prisma.scheduleLayer.deleteMany({ where: { scheduleId: id } });

  const schedule = await prisma.schedule.update({
    where: { id },
    data: {
      name: name.trim(),
      timezone: timezone || "Asia/Seoul",
      layers: layers?.length
        ? {
            create: layers.map(
              (
                layer: {
                  name: string;
                  rotationType: string;
                  shiftDuration: number;
                  startTime: string;
                  participants: { userId: string }[];
                },
                i: number
              ) => ({
                name: layer.name,
                order: i,
                rotationType: layer.rotationType,
                shiftDuration: layer.shiftDuration,
                startTime: new Date(layer.startTime),
                participants: {
                  create: layer.participants.map(
                    (p: { userId: string }, j: number) => ({
                      userId: p.userId,
                      order: j,
                    })
                  ),
                },
              })
            ),
          }
        : undefined,
    },
    include: {
      layers: {
        orderBy: { order: "asc" },
        include: { participants: { orderBy: { order: "asc" } } },
      },
    },
  });

  return NextResponse.json(schedule);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const existing = await prisma.schedule.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json(
      { error: "Schedule not found" },
      { status: 404 }
    );
  }

  await prisma.schedule.delete({ where: { id } });

  return NextResponse.json({ success: true });
}

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const schedules = await prisma.schedule.findMany({
    include: {
      layers: {
        orderBy: { order: "asc" },
        include: {
          participants: {
            orderBy: { order: "asc" },
          },
        },
      },
      _count: { select: { overrides: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json(schedules);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { name, timezone, layers } = body;

  if (!name?.trim()) {
    return NextResponse.json(
      { error: "Schedule name is required" },
      { status: 400 }
    );
  }

  const schedule = await prisma.schedule.create({
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

  return NextResponse.json(schedule, { status: 201 });
}

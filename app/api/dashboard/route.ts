import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;
  const now = new Date();

  // Active incidents summary
  const [triggeredCount, acknowledgedCount] = await Promise.all([
    prisma.incident.count({ where: { status: "TRIGGERED" } }),
    prisma.incident.count({ where: { status: "ACKNOWLEDGED" } }),
  ]);

  // Service health overview
  const services = await prisma.service.findMany({
    select: { status: true },
  });

  const serviceHealth = {
    active: services.filter((s) => s.status === "ACTIVE").length,
    warning: services.filter((s) => s.status === "WARNING").length,
    critical: services.filter((s) => s.status === "CRITICAL").length,
    maintenance: services.filter((s) => s.status === "MAINTENANCE").length,
    disabled: services.filter((s) => s.status === "DISABLED").length,
    total: services.length,
  };

  // Recent incidents (last 10)
  const recentIncidents = await prisma.incident.findMany({
    take: 10,
    orderBy: { createdAt: "desc" },
    include: {
      service: { select: { id: true, name: true } },
      responders: {
        include: {
          user: { select: { id: true, name: true } },
        },
      },
    },
  });

  // My on-call status — check if user is in any active on-call entry
  const onCallEntries = await prisma.onCallEntry.findMany({
    where: {
      userId,
      startTime: { lte: now },
      endTime: { gte: now },
    },
    include: {
      schedule: { select: { id: true, name: true } },
    },
  });

  // Also check if user is a responder on active incidents
  const myActiveIncidents = await prisma.incident.findMany({
    where: {
      status: { in: ["TRIGGERED", "ACKNOWLEDGED"] },
      responders: {
        some: { userId },
      },
    },
    include: {
      service: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    incidents: {
      triggered: triggeredCount,
      acknowledged: acknowledgedCount,
    },
    serviceHealth,
    recentIncidents,
    onCall: {
      isOnCall: onCallEntries.length > 0,
      schedules: onCallEntries.map((e) => ({
        scheduleId: e.schedule.id,
        scheduleName: e.schedule.name,
        startTime: e.startTime,
        endTime: e.endTime,
      })),
    },
    myActiveIncidents,
  });
}

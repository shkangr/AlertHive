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

  const incident = await prisma.incident.findUnique({
    where: { id },
    include: {
      service: {
        select: {
          id: true,
          name: true,
          escalationPolicy: { select: { id: true, name: true } },
        },
      },
      responders: {
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
        orderBy: { createdAt: "asc" },
      },
      logs: {
        include: {
          user: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "asc" },
      },
      alerts: {
        select: {
          id: true,
          summary: true,
          severity: true,
          rawPayload: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!incident) {
    return NextResponse.json({ error: "Incident not found" }, { status: 404 });
  }

  return NextResponse.json(incident);
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

  await prisma.incident.delete({ where: { id } });

  return NextResponse.json({ success: true });
}

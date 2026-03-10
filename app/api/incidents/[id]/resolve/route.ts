import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(
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
    select: { status: true },
  });

  if (!incident) {
    return NextResponse.json({ error: "Incident not found" }, { status: 404 });
  }

  if (incident.status === "RESOLVED") {
    return NextResponse.json(
      { error: "Incident is already resolved" },
      { status: 400 }
    );
  }

  const updated = await prisma.incident.update({
    where: { id },
    data: {
      status: "RESOLVED",
      resolvedAt: new Date(),
      logs: {
        create: {
          type: "RESOLVED",
          message: `Resolved by ${session.user.name || session.user.email}`,
          userId: session.user.id,
        },
      },
    },
    include: {
      service: { select: { id: true, name: true } },
      responders: {
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
      },
    },
  });

  return NextResponse.json(updated);
}

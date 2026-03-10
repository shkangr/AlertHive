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

  const service = await prisma.service.findUnique({
    where: { id },
    include: {
      team: { select: { id: true, name: true } },
      escalationPolicy: { select: { id: true, name: true } },
      integrations: {
        select: { id: true, name: true, integrationKey: true, createdAt: true },
        orderBy: { createdAt: "desc" },
      },
      incidents: {
        where: { status: { not: "RESOLVED" } },
        select: {
          id: true,
          title: true,
          status: true,
          urgency: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
        take: 20,
      },
    },
  });

  if (!service) {
    return NextResponse.json({ error: "Service not found" }, { status: 404 });
  }

  return NextResponse.json(service);
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
  const { name, description, status, teamId, escalationPolicyId } = body;

  if (!name || !name.trim()) {
    return NextResponse.json(
      { error: "Service name is required" },
      { status: 400 }
    );
  }

  const existing = await prisma.service.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Service not found" }, { status: 404 });
  }

  const service = await prisma.service.update({
    where: { id },
    data: {
      name: name.trim(),
      description: description?.trim() || null,
      status: status || undefined,
      teamId: teamId || null,
      escalationPolicyId: escalationPolicyId || null,
    },
    include: {
      team: { select: { id: true, name: true } },
      escalationPolicy: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json(service);
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

  const existing = await prisma.service.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Service not found" }, { status: 404 });
  }

  await prisma.service.delete({ where: { id } });

  return NextResponse.json({ success: true });
}

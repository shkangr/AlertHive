import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const status = searchParams.get("status") || "";
  const serviceId = searchParams.get("serviceId") || "";
  const urgency = searchParams.get("urgency") || "";
  const search = searchParams.get("search") || "";

  const where: Record<string, unknown> = {};

  if (status) {
    where.status = status;
  }

  if (serviceId) {
    where.serviceId = serviceId;
  }

  if (urgency) {
    where.urgency = urgency;
  }

  if (search) {
    where.OR = [
      { title: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
    ];
  }

  const incidents = await prisma.incident.findMany({
    where,
    include: {
      service: { select: { id: true, name: true } },
      responders: {
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(incidents);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { title, description, serviceId, urgency, assigneeId } = body;

  if (!title?.trim()) {
    return NextResponse.json(
      { error: "Incident title is required" },
      { status: 400 }
    );
  }

  if (!serviceId) {
    return NextResponse.json(
      { error: "Service is required" },
      { status: 400 }
    );
  }

  const incident = await prisma.incident.create({
    data: {
      title: title.trim(),
      description: description?.trim() || null,
      serviceId,
      urgency: urgency || "HIGH",
      logs: {
        create: {
          type: "CREATED",
          message: `Incident created by ${session.user.name || session.user.email}`,
          userId: session.user.id,
        },
      },
      ...(assigneeId
        ? {
            responders: {
              create: { userId: assigneeId },
            },
          }
        : {}),
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

  // Create assignment log if assignee was set
  if (assigneeId) {
    const assignee = await prisma.user.findUnique({
      where: { id: assigneeId },
      select: { name: true },
    });
    await prisma.incidentLog.create({
      data: {
        incidentId: incident.id,
        type: "RESPONDER_ADDED",
        message: `${assignee?.name || "User"} added as responder`,
        userId: session.user.id,
      },
    });
  }

  return NextResponse.json(incident, { status: 201 });
}

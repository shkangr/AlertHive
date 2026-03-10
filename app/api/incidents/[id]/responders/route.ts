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
  const { userId } = body;

  if (!userId) {
    return NextResponse.json(
      { error: "User ID is required" },
      { status: 400 }
    );
  }

  // Check if already a responder
  const existing = await prisma.incidentResponder.findUnique({
    where: {
      incidentId_userId: { incidentId: id, userId },
    },
  });

  if (existing) {
    return NextResponse.json(
      { error: "User is already a responder" },
      { status: 400 }
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true },
  });

  await prisma.incidentResponder.create({
    data: { incidentId: id, userId },
  });

  await prisma.incidentLog.create({
    data: {
      incidentId: id,
      type: "RESPONDER_ADDED",
      message: `${user?.name || "User"} added as responder`,
      userId: session.user.id,
    },
  });

  const responders = await prisma.incidentResponder.findMany({
    where: { incidentId: id },
    include: {
      user: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(responders, { status: 201 });
}

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
  const { message } = body;

  if (!message?.trim()) {
    return NextResponse.json(
      { error: "Note message is required" },
      { status: 400 }
    );
  }

  const log = await prisma.incidentLog.create({
    data: {
      incidentId: id,
      type: "NOTE",
      message: message.trim(),
      userId: session.user.id,
    },
    include: {
      user: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json(log, { status: 201 });
}

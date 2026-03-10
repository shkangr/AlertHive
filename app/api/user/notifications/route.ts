import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function PUT(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { slackUserId } = body;

  const user = await prisma.user.update({
    where: { id: session.user.id },
    data: { slackUserId: slackUserId || null },
    select: {
      id: true,
      slackUserId: true,
    },
  });

  return NextResponse.json(user);
}

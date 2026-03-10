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

  const policy = await prisma.escalationPolicy.findUnique({
    where: { id },
    include: {
      rules: {
        include: {
          targets: {
            include: {
              user: { select: { id: true, name: true, email: true } },
              schedule: { select: { id: true, name: true } },
            },
          },
        },
        orderBy: { order: "asc" },
      },
      services: {
        select: { id: true, name: true, status: true },
      },
      _count: { select: { services: true } },
    },
  });

  if (!policy) {
    return NextResponse.json({ error: "Policy not found" }, { status: 404 });
  }

  return NextResponse.json(policy);
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
  const { name, description, repeatCount, rules } = body;

  if (!name || !name.trim()) {
    return NextResponse.json(
      { error: "Policy name is required" },
      { status: 400 }
    );
  }

  // Delete existing rules and recreate
  await prisma.escalationRule.deleteMany({
    where: { escalationPolicyId: id },
  });

  const policy = await prisma.escalationPolicy.update({
    where: { id },
    data: {
      name: name.trim(),
      description: description?.trim() || null,
      repeatCount: repeatCount ?? 1,
      rules: {
        create: (rules || []).map(
          (
            rule: {
              order: number;
              timeoutMinutes: number;
              targets: { targetType: string; userId?: string; scheduleId?: string }[];
            },
            index: number
          ) => ({
            order: rule.order ?? index,
            timeoutMinutes: rule.timeoutMinutes ?? 30,
            targets: {
              create: (rule.targets || []).map(
                (target: {
                  targetType: string;
                  userId?: string;
                  scheduleId?: string;
                }) => ({
                  targetType: target.targetType,
                  userId: target.targetType === "USER" ? target.userId : null,
                  scheduleId:
                    target.targetType === "SCHEDULE" ? target.scheduleId : null,
                })
              ),
            },
          })
        ),
      },
    },
    include: {
      rules: {
        include: {
          targets: {
            include: {
              user: { select: { id: true, name: true, email: true } },
              schedule: { select: { id: true, name: true } },
            },
          },
        },
        orderBy: { order: "asc" },
      },
      _count: { select: { services: true } },
    },
  });

  return NextResponse.json(policy);
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

  await prisma.escalationPolicy.delete({ where: { id } });

  return NextResponse.json({ success: true });
}

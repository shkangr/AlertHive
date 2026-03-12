import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const search = searchParams.get("search") || "";
  const teamId = searchParams.get("teamId") || "";
  const status = searchParams.get("status") || "";

  const where: Record<string, unknown> = {};

  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
    ];
  }

  if (teamId) {
    where.teamId = teamId;
  }

  if (status) {
    where.status = status;
  }

  const services = await prisma.service.findMany({
    where,
    include: {
      team: { select: { id: true, name: true } },
      escalationPolicy: { select: { id: true, name: true } },
      _count: { select: { incidents: true, integrations: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json(services);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { name, description, teamId, escalationPolicyId } = body;

  if (!name || !name.trim()) {
    return NextResponse.json(
      { error: "Service name is required" },
      { status: 400 }
    );
  }

  const service = await prisma.service.create({
    data: {
      name: name.trim(),
      description: description?.trim() || null,
      teamId: teamId && teamId !== "none" ? teamId : null,
      escalationPolicyId: escalationPolicyId && escalationPolicyId !== "none" ? escalationPolicyId : null,
    },
    include: {
      team: { select: { id: true, name: true } },
      escalationPolicy: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json(service, { status: 201 });
}

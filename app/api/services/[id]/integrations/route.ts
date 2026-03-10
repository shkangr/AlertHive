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
  const { name } = body;

  if (!name || !name.trim()) {
    return NextResponse.json(
      { error: "Integration name is required" },
      { status: 400 }
    );
  }

  const service = await prisma.service.findUnique({ where: { id } });
  if (!service) {
    return NextResponse.json({ error: "Service not found" }, { status: 404 });
  }

  const integration = await prisma.integration.create({
    data: {
      name: name.trim(),
      serviceId: id,
    },
  });

  return NextResponse.json(integration, { status: 201 });
}

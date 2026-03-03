import { NextRequest, NextResponse } from "next/server";
import { getAuthUserId, unauthorized } from "@/lib/api-auth";
import { db } from "@/db";
import { chemicalApplications } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getAuthUserId();
  if (!userId) return unauthorized();

  const { id } = await params;

  const application = await db.query.chemicalApplications.findFirst({
    where: and(
      eq(chemicalApplications.id, Number(id)),
      eq(chemicalApplications.userId, userId)
    ),
  });

  if (!application) {
    return NextResponse.json(
      { error: "Application not found" },
      { status: 404 }
    );
  }

  return NextResponse.json({ application });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getAuthUserId();
  if (!userId) return unauthorized();

  const { id } = await params;
  const body = await request.json();

  const [updated] = await db
    .update(chemicalApplications)
    .set(body)
    .where(
      and(
        eq(chemicalApplications.id, Number(id)),
        eq(chemicalApplications.userId, userId)
      )
    )
    .returning();

  if (!updated) {
    return NextResponse.json(
      { error: "Application not found" },
      { status: 404 }
    );
  }

  return NextResponse.json({ application: updated });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getAuthUserId();
  if (!userId) return unauthorized();

  const { id } = await params;

  const [deleted] = await db
    .delete(chemicalApplications)
    .where(
      and(
        eq(chemicalApplications.id, Number(id)),
        eq(chemicalApplications.userId, userId)
      )
    )
    .returning();

  if (!deleted) {
    return NextResponse.json(
      { error: "Application not found" },
      { status: 404 }
    );
  }

  return NextResponse.json({ success: true });
}

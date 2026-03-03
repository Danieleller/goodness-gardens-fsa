import { NextResponse } from "next/server";
import { getAuthUserId, unauthorized } from "@/lib/api-auth";
import { db } from "@/db";
import { permissions, rolePermissions } from "@/db/schema";

export async function GET() {
  const userId = await getAuthUserId();
  if (!userId) return unauthorized();

  try {
    const allPermissions = await db.select().from(permissions);
    const allRolePermissions = await db.select().from(rolePermissions);

    return NextResponse.json({
      permissions: allPermissions,
      rolePermissions: allRolePermissions,
    });
  } catch (error) {
    console.error("Failed to fetch permissions matrix:", error);
    return NextResponse.json(
      { error: "Failed to fetch permissions matrix" },
      { status: 500 }
    );
  }
}

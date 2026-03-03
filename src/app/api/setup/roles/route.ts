import { NextResponse } from "next/server";
import { getAuthUserId, unauthorized } from "@/lib/api-auth";
import { db } from "@/db";
import { rolePermissions, permissions } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  const userId = await getAuthUserId();
  if (!userId) return unauthorized();

  try {
    const rolesWithPermissions = await db
      .select()
      .from(rolePermissions)
      .leftJoin(
        permissions,
        eq(rolePermissions.permissionCode, permissions.code)
      );

    return NextResponse.json(rolesWithPermissions);
  } catch (error) {
    console.error("Failed to fetch roles:", error);
    return NextResponse.json(
      { error: "Failed to fetch roles" },
      { status: 500 }
    );
  }
}

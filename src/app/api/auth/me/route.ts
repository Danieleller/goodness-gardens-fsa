import { NextResponse } from "next/server";
import { getAuthUserId, unauthorized } from "@/lib/api-auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  const userId = await getAuthUserId();
  if (!userId) return unauthorized();

  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });

  if (!user) return unauthorized();

  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      first_name: user.firstName,
      last_name: user.lastName,
      organization_name: user.organizationName,
      role: user.role,
      title: user.title,
    },
  });
}

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

/**
 * Verify the current request's auth and return the app-level user ID.
 * For use in API route handlers.
 */
export async function getAuthUserId(): Promise<number | null> {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {
          // Read-only in API routes
        },
      },
    }
  );

  const { data: { user: supaUser } } = await supabase.auth.getUser();
  if (!supaUser?.email) return null;

  const email = supaUser.email.toLowerCase();
  let dbUser = await db.query.users.findFirst({
    where: eq(users.email, email),
  });

  // Auto-provision
  if (!dbUser) {
    const metadata = supaUser.user_metadata || {};
    const firstName = metadata.full_name?.split(" ")[0] || metadata.name?.split(" ")[0] || "";
    const lastName = metadata.full_name?.split(" ").slice(1).join(" ") || metadata.name?.split(" ").slice(1).join(" ") || "";

    await db.insert(users).values({
      email,
      firstName,
      lastName,
      organizationName: "Goodness Gardens",
      role: "worker",
      isActive: 1,
      passwordHash: "supabase-auth",
    });

    dbUser = await db.query.users.findFirst({
      where: eq(users.email, email),
    });
  }

  if (!dbUser || dbUser.isActive !== 1) return null;
  return dbUser.id;
}

/**
 * Helper to return 401 Unauthorized response.
 */
export function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

/**
 * Helper to return 403 Forbidden response.
 */
export function forbidden() {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

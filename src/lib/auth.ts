import { createClient } from "@/lib/supabase/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

export interface SessionUser {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  organizationName: string;
  role: string;
}

export interface Session {
  user: SessionUser;
}

/**
 * Get the current authenticated user session.
 * Bridges Supabase Auth with app-level DB users.
 * Auto-provisions new Supabase users into the app DB.
 */
export async function auth(): Promise<Session | null> {
  const supabase = await createClient();
  const { data: { user: supaUser } } = await supabase.auth.getUser();

  if (!supaUser) return null;

  const email = supaUser.email?.toLowerCase();
  if (!email) return null;

  // Look up the app-level user by email
  let dbUser = await db.query.users.findFirst({
    where: eq(users.email, email),
  });

  // Auto-provision if new Supabase user
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

  return {
    user: {
      id: dbUser.id,
      email: dbUser.email,
      firstName: dbUser.firstName,
      lastName: dbUser.lastName,
      organizationName: dbUser.organizationName || "",
      role: dbUser.role || "worker",
    },
  };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
}

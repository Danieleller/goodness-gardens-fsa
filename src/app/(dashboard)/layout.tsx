export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { appModuleConfig } from "@/db/schema";
import { eq } from "drizzle-orm";
import { Header } from "@/components/Header.next";
import { StoreSync } from "@/components/StoreSync";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  // Fetch enabled modules for the header
  const modules = await db
    .select({ moduleKey: appModuleConfig.moduleKey })
    .from(appModuleConfig)
    .where(eq(appModuleConfig.isEnabled, 1));

  const enabledModules = modules.map((m) => m.moduleKey);

  const userObj = {
    id: session.user.id,
    email: session.user.email,
    first_name: session.user.firstName,
    last_name: session.user.lastName,
    organization_name: session.user.organizationName,
    role: session.user.role,
  };

  return (
    <div className="min-h-screen bg-green-50">
      <StoreSync user={userObj} enabledModules={enabledModules} />
      <Header user={userObj} enabledModules={enabledModules} />
      <main>{children}</main>
    </div>
  );
}

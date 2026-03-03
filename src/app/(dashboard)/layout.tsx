export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { appModuleConfig } from "@/db/schema";
import { eq } from "drizzle-orm";
import { Header } from "@/components/Header.next";

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

  return (
    <div className="min-h-screen bg-green-50">
      <Header
        user={{
          id: session.user.id,
          email: session.user.email,
          first_name: session.user.firstName,
          last_name: session.user.lastName,
          organization_name: session.user.organizationName,
          role: session.user.role,
        }}
        enabledModules={enabledModules}
      />
      <main>{children}</main>
    </div>
  );
}

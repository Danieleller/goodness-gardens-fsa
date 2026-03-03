import { NextResponse } from "next/server";
import { getAuthUserId, unauthorized } from "@/lib/api-auth";
import { db } from "@/db";
import { auditSimulations, supplierCertifications, checklistSubmissions } from "@/db/schema";
import { gte, lte, and } from "drizzle-orm";

export async function GET(request: Request) {
  const userId = await getAuthUserId();
  if (!userId) return unauthorized();

  const { searchParams } = new URL(request.url);
  const days = Number(searchParams.get("days") || 90);

  const now = new Date();
  const endDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
  const startStr = now.toISOString();
  const endStr = endDate.toISOString();

  const events: Array<{
    id: string;
    title: string;
    type: string;
    date: string | null;
    data: Record<string, unknown>;
  }> = [];

  try {
    // Expiring certifications in range
    const certs = await db
      .select()
      .from(supplierCertifications)
      .where(
        and(
          gte(supplierCertifications.expiryDate, startStr),
          lte(supplierCertifications.expiryDate, endStr)
        )
      );

    for (const cert of certs) {
      events.push({
        id: String(cert.id),
        title: `Certification Expiring: ${cert.certType}`,
        type: "certExpirations",
        date: cert.expiryDate,
        data: cert as unknown as Record<string, unknown>,
      });
    }

    // Recent audit simulations
    const simulations = await db
      .select()
      .from(auditSimulations)
      .where(gte(auditSimulations.createdAt, startStr));

    for (const sim of simulations) {
      events.push({
        id: String(sim.id),
        title: "Audit Simulation",
        type: "audit_simulation",
        date: sim.createdAt,
        data: sim as unknown as Record<string, unknown>,
      });
    }
  } catch {
    // Tables may not exist yet
  }

  return NextResponse.json({
    certExpirations: events.filter((e) => e.type === "certExpirations"),
    capaDueDates: [],
    chemicalExpirations: [],
    events,
  });
}

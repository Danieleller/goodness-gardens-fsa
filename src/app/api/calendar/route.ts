import { NextResponse } from "next/server";
import { getAuthUserId, unauthorized } from "@/lib/api-auth";
import { db } from "@/db";
import {
  auditSimulations,
  supplierCertifications,
  suppliers,
  correctiveActions,
  nonconformances,
  chemicalStorage,
} from "@/db/schema";
import { gte, lte, and, eq, sql } from "drizzle-orm";

export async function GET(request: Request) {
  const userId = await getAuthUserId();
  if (!userId) return unauthorized();

  const { searchParams } = new URL(request.url);
  const days = Number(searchParams.get("days") || 90);

  const now = new Date();
  const endDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
  const startStr = now.toISOString().slice(0, 10);
  const endStr = endDate.toISOString().slice(0, 10);

  const certExpirations: Array<Record<string, unknown>> = [];
  const capaDueDates: Array<Record<string, unknown>> = [];
  const chemicalExpirations: Array<Record<string, unknown>> = [];

  try {
    // Expiring certifications with supplier name
    const certs = await db
      .select({
        id: supplierCertifications.id,
        certType: supplierCertifications.certType,
        certName: supplierCertifications.certName,
        expiryDate: supplierCertifications.expiryDate,
        supplierName: suppliers.name,
      })
      .from(supplierCertifications)
      .innerJoin(suppliers, eq(supplierCertifications.supplierId, suppliers.id))
      .where(
        and(
          gte(supplierCertifications.expiryDate, startStr),
          lte(supplierCertifications.expiryDate, endStr)
        )
      );

    for (const cert of certs) {
      const daysUntil = Math.round(
        (new Date(cert.expiryDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );
      certExpirations.push({
        id: cert.id,
        expiry_date: cert.expiryDate,
        supplier_name: cert.supplierName,
        cert_type: cert.certType,
        cert_name: cert.certName,
        days_until: daysUntil,
      });
    }

    // CAPA due dates
    const capas = await db
      .select({
        id: correctiveActions.id,
        actionDescription: correctiveActions.actionDescription,
        targetCompletionDate: correctiveActions.targetCompletionDate,
        responsibleParty: correctiveActions.responsibleParty,
        status: correctiveActions.status,
        severity: nonconformances.severity,
      })
      .from(correctiveActions)
      .innerJoin(nonconformances, eq(correctiveActions.nonconformanceId, nonconformances.id))
      .where(
        and(
          sql`${correctiveActions.status} IN ('open', 'in_progress')`,
          gte(correctiveActions.targetCompletionDate, startStr),
          lte(correctiveActions.targetCompletionDate, endStr)
        )
      );

    for (const capa of capas) {
      capaDueDates.push({
        id: capa.id,
        target_completion_date: capa.targetCompletionDate,
        action_description: capa.actionDescription,
        responsible_party: capa.responsibleParty,
        severity: capa.severity,
      });
    }
  } catch {
    // Tables may not exist yet
  }

  return NextResponse.json({
    certExpirations,
    capaDueDates,
    chemicalExpirations,
    events: [
      ...certExpirations.map((c) => ({ ...c, type: "certExpirations" })),
      ...capaDueDates.map((c) => ({ ...c, type: "capaDueDates" })),
    ],
  });
}

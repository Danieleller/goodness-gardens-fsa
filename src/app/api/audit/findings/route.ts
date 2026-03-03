import { NextResponse } from "next/server";
import { getAuthUserId, unauthorized } from "@/lib/api-auth";
import { db } from "@/db";
import { auditFindings } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function GET(request: Request) {
  const userId = await getAuthUserId();
  if (!userId) return unauthorized();

  const { searchParams } = new URL(request.url);
  const facilityId = searchParams.get("facility_id");
  const severity = searchParams.get("severity");
  const status = searchParams.get("status");
  const moduleId = searchParams.get("module_id");

  const conditions = [];

  if (facilityId) {
    conditions.push(eq(auditFindings.facilityId, Number(facilityId)));
  }
  if (severity) {
    conditions.push(eq(auditFindings.severity, severity));
  }
  if (status) {
    conditions.push(eq(auditFindings.status, status));
  }
  // moduleId filter removed — audit_findings table uses questionId, not moduleId

  let query = db.select().from(auditFindings);

  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as typeof query;
  }

  const findings = await query;
  return NextResponse.json(findings);
}

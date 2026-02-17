import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDb, initDb } from '../_db';
import { verifyToken } from '../_auth';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    await initDb();

    const userId = verifyToken(req);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const db = getDb();

    const waterTestsResult = await db.execute({
      sql: 'SELECT COUNT(*) as count FROM pre_harvest_logs WHERE user_id = ? AND log_type = ?',
      args: [userId, 'water_test'],
    });

    const chemicalAppsResult = await db.execute({
      sql: 'SELECT COUNT(*) as count FROM chemical_applications WHERE user_id = ?',
      args: [userId],
    });

    const openNonconformancesResult = await db.execute({
      sql: 'SELECT COUNT(*) as count FROM corrective_actions WHERE user_id = ? AND status = ?',
      args: [userId, 'open'],
    });

    const closedCapasResult = await db.execute({
      sql: 'SELECT COUNT(*) as count FROM corrective_actions WHERE user_id = ? AND status = ?',
      args: [userId, 'closed'],
    });

    const recentAuditsResult = await db.execute({
      sql: 'SELECT * FROM audit_checklists WHERE user_id = ? ORDER BY audit_date DESC LIMIT 5',
      args: [userId],
    });

    const nonconformanceByCategoryResult = await db.execute({
      sql: `SELECT finding_category, COUNT(*) as count FROM nonconformances 
            WHERE user_id = ? GROUP BY finding_category`,
      args: [userId],
    });

    const chemicalComplianceResult = await db.execute({
      sql: `SELECT COUNT(*) as total,
            SUM(CASE WHEN expected_residue_level_ppm <= mrl_ppm THEN 1 ELSE 0 END) as compliant
            FROM chemical_applications WHERE user_id = ?`,
      args: [userId],
    });

    const waterTests = (waterTestsResult.rows[0] as any)?.count || 0;
    const chemicalApps = (chemicalAppsResult.rows[0] as any)?.count || 0;
    const openNonconformances = (openNonconformancesResult.rows[0] as any)?.count || 0;
    const closedCapas = (closedCapasResult.rows[0] as any)?.count || 0;
    const complianceData = chemicalComplianceResult.rows[0] as any;
    const chemicalCompliance = complianceData?.total
      ? Math.round((complianceData.compliant / complianceData.total) * 100)
      : 0;

    return res.status(200).json({
      kpis: {
        waterTests,
        chemicalApplications: chemicalApps,
        openNonconformances,
        closedCapas,
        chemicalCompliancePercentage: chemicalCompliance,
      },
      recentAudits: recentAuditsResult.rows,
      nonconformanceByCategory: nonconformanceByCategoryResult.rows,
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

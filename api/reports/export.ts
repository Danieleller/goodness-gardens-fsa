import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDb, initDb } from '../_db';
import { verifyToken } from '../_auth';

function convertToCSV(headers: string[], rows: any[]): string {
  const csvHeaders = headers.map((h) => `"${h.replace(/"/g, '""')}"`).join(',');
  const csvRows = rows.map((row) =>
    headers.map((h) => {
      const value = row[h];
      if (value === null || value === undefined) return '';
      return `"${String(value).replace(/"/g, '""')}"`;
    }).join(',')
  );
  return [csvHeaders, ...csvRows].join('\n');
}

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

    const { type } = req.query;
    const db = getDb();

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="export-${Date.now()}.csv"`);

    if (type === 'pre-harvest') {
      const result = await db.execute({
        sql: 'SELECT * FROM pre_harvest_logs WHERE user_id = ? ORDER BY created_at DESC',
        args: [userId],
      });
      const headers = [
        'id', 'log_type', 'water_source', 'test_date', 'ph_level',
        'e_coli_result', 'total_coliform_result', 'test_location', 'lab_name',
        'amendment_type', 'amendment_date', 'source', 'quantity_applied',
        'quantity_unit', 'field_location', 'training_date', 'training_topic',
        'trainee_name', 'handwashing_station_available', 'sanitation_checklist_pass',
        'intrusion_date', 'intrusion_type', 'intrusion_location', 'remedial_action',
        'corrected_date', 'notes', 'created_at',
      ];
      const csv = convertToCSV(headers, result.rows);
      return res.status(200).send(csv);
    }

    if (type === 'chemicals') {
      const appsResult = await db.execute({
        sql: 'SELECT * FROM chemical_applications WHERE user_id = ? ORDER BY created_at DESC',
        args: [userId],
      });
      const storageResult = await db.execute({
        sql: 'SELECT * FROM chemical_storage WHERE user_id = ? ORDER BY created_at DESC',
        args: [userId],
      });

      const appHeaders = [
        'id', 'product_name', 'active_ingredient', 'epa_registration_number',
        'application_date', 'application_location', 'quantity_applied', 'quantity_unit',
        'applicator_name', 'applicator_license', 'weather_conditions',
        'pre_harvest_interval_days', 'pre_harvest_interval_end_date', 'mrl_ppm',
        'expected_residue_level_ppm', 'notes', 'created_at',
      ];
      const storageHeaders = [
        'id', 'product_name', 'storage_location', 'quantity_stored', 'quantity_unit',
        'received_date', 'expiration_date', 'storage_conditions',
        'safety_equipment_available', 'last_inventory_date', 'notes', 'created_at',
      ];

      const appCsv = convertToCSV(appHeaders, appsResult.rows);
      const storageCsv = convertToCSV(storageHeaders, storageResult.rows);

      return res.status(200).send(`CHEMICAL APPLICATIONS\n${appCsv}\n\n\nCHEMICAL STORAGE\n${storageCsv}`);
    }

    if (type === 'corrective-actions') {
      const ncResult = await db.execute({
        sql: 'SELECT * FROM nonconformances WHERE user_id = ? ORDER BY created_at DESC',
        args: [userId],
      });
      const capaResult = await db.execute({
        sql: 'SELECT * FROM corrective_actions WHERE user_id = ? ORDER BY created_at DESC',
        args: [userId],
      });

      const ncHeaders = [
        'id', 'finding_date', 'finding_category', 'finding_description',
        'severity', 'affected_area', 'root_cause', 'created_at',
      ];
      const capaHeaders = [
        'id', 'nonconformance_id', 'action_description', 'responsible_party',
        'target_completion_date', 'actual_completion_date', 'status',
        'verification_method', 'verification_date', 'verified_by',
        'verification_notes', 'created_at',
      ];

      const ncCsv = convertToCSV(ncHeaders, ncResult.rows);
      const capaCsv = convertToCSV(capaHeaders, capaResult.rows);

      return res.status(200).send(`NONCONFORMANCES\n${ncCsv}\n\n\nCORRECTIVE ACTIONS\n${capaCsv}`);
    }

    return res.status(400).json({ error: 'Invalid export type' });
  } catch (error) {
    console.error('Export error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

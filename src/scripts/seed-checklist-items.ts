/**
 * Seed checklist items for 68 KISS form templates.
 * Run: npx tsx src/scripts/seed-checklist-items.ts
 */
import { db } from "../db";
import { checklistTemplates, checklistItems } from "../db/schema";
import { eq } from "drizzle-orm";

type Item = { text: string; type?: string; critical?: boolean };

const KISS_ITEMS: Record<string, Item[]> = {
  "KISS-001": [
    { text: "Food safety policy is signed by senior management" },
    { text: "Policy is dated within the last 12 months" },
    { text: "Policy is posted in common areas / accessible to staff" },
    { text: "Policy statement includes commitment to food safety, legal compliance, and continuous improvement" },
  ],
  "KISS-002": [
    { text: "FSMS manual is current and version-controlled" },
    { text: "Scope of the FSMS is clearly defined" },
    { text: "All referenced SOPs are listed and current" },
    { text: "Document control procedure is followed (sign-off, distribution)" },
    { text: "Obsolete documents are removed from circulation" },
  ],
  "KISS-003": [
    { text: "Org chart is current and includes all food safety roles" },
    { text: "FSQA Manager/Coordinator is identified" },
    { text: "Back-up personnel are designated for key food safety roles" },
    { text: "Job descriptions include food safety responsibilities" },
  ],
  "KISS-004": [
    { text: "Internal audit schedule covers all FSMS elements" },
    { text: "Auditor is independent of the area being audited" },
    { text: "Audit findings are documented with objective evidence" },
    { text: "Corrective actions are assigned with target dates" },
    { text: "Follow-up verification of corrective actions is documented" },
    { text: "Audit report is reviewed by management" },
  ],
  "KISS-005": [
    { text: "Management review meeting was held as scheduled" },
    { text: "Minutes are documented and signed" },
    { text: "Review covers: audit results, customer complaints, CAPA status" },
    { text: "Review covers: food safety incidents, regulatory changes" },
    { text: "Action items are assigned with owners and due dates" },
    { text: "Previous meeting action items are reviewed for completion" },
  ],
  "KISS-006": [
    { text: "CAPA request is clearly described with supporting evidence" },
    { text: "Root cause analysis method is identified (5 Why, fishbone, etc.)" },
    { text: "Root cause is documented" },
    { text: "Corrective action addresses the root cause" },
    { text: "Preventive action prevents recurrence" },
    { text: "Effectiveness verification date and method defined" },
    { text: "CAPA is closed with sign-off" },
  ],
  "KISS-007": [
    { text: "CAPA log is up to date" },
    { text: "All open CAPAs have assigned owners" },
    { text: "Overdue CAPAs are flagged and escalated" },
    { text: "Closed CAPAs have verification evidence" },
  ],
  "KISS-008": [
    { text: "Incident/non-conformance is described in detail" },
    { text: "Immediate containment action taken" },
    { text: "Root cause analysis completed" },
    { text: "Corrective action plan documented" },
    { text: "Timeline for implementation established" },
    { text: "Responsible person assigned" },
  ],
  "KISS-009": [
    { text: "All applicable federal regulations are listed" },
    { text: "All applicable state/local regulations are listed" },
    { text: "Regulatory changes since last review are noted" },
    { text: "Compliance status for each requirement is documented" },
    { text: "Review date and reviewer are recorded" },
  ],
  "KISS-010": [
    { text: "Complaint date and source recorded" },
    { text: "Product/lot information captured" },
    { text: "Nature of complaint described" },
    { text: "Investigation findings documented" },
    { text: "CAPA initiated if warranted" },
    { text: "Customer response/resolution recorded" },
  ],
  "KISS-011": [
    { text: "Supplier name and contact information current" },
    { text: "Products/services supplied are listed" },
    { text: "Food safety certification status is verified" },
    { text: "Approval date and next review date recorded" },
    { text: "Risk level assigned (high/medium/low)" },
  ],
  "KISS-012": [
    { text: "Supplier facility is clean and well-maintained" },
    { text: "Food safety program documentation is adequate" },
    { text: "Employee hygiene practices observed are satisfactory" },
    { text: "Pest control program is in place" },
    { text: "Allergen controls are adequate" },
    { text: "Traceability system can demonstrate one-up/one-back" },
    { text: "Corrective action process is functioning" },
  ],
  "KISS-013": [
    { text: "Mock recall scenario is defined and realistic" },
    { text: "Recall team was assembled within target time" },
    { text: "Product was traced one-up and one-back" },
    { text: "100% of affected product was accounted for", critical: true },
    { text: "Trace completed within 4 hours", critical: true },
    { text: "Communication to authorities simulated" },
    { text: "Gaps identified and corrective actions assigned" },
  ],
  "KISS-014": [
    { text: "Product/lot selected for trace exercise" },
    { text: "Forward trace: identify all customers who received product" },
    { text: "Backward trace: identify all inputs/ingredients/suppliers" },
    { text: "Trace completed within 4 hours", critical: true },
    { text: "Volume reconciliation completed (% accounted for)" },
    { text: "Gaps in traceability identified" },
  ],
  "KISS-015": [
    { text: "Previous land use history documented" },
    { text: "Adjacent land use evaluated for contamination risk" },
    { text: "Soil testing completed (heavy metals, contaminants)" },
    { text: "Water source(s) identified and assessed" },
    { text: "Flood risk evaluated" },
    { text: "Wildlife activity in area assessed" },
    { text: "Site map updated with identified risks" },
  ],
  "KISS-016": [
    { text: "Sample collection date and time recorded" },
    { text: "Water source identified (well, municipal, surface)" },
    { text: "Sample point location documented" },
    { text: "Lab name and accreditation verified" },
    { text: "Generic E. coli result recorded (CFU/100mL)", critical: true },
    { text: "Result meets applicable standard", critical: true },
    { text: "Corrective action taken if out of spec" },
  ],
  "KISS-017": [
    { text: "Drip lines inspected for leaks or damage" },
    { text: "Filters checked and cleaned" },
    { text: "Backflow prevention devices verified functional" },
    { text: "Injection equipment calibrated" },
    { text: "Water source protection measures intact" },
    { text: "No cross-connections observed" },
  ],
  "KISS-018": [
    { text: "Amendment type (compost, manure, etc.) recorded" },
    { text: "Source/supplier documented" },
    { text: "Treatment method and duration verified", critical: true },
    { text: "Application date recorded" },
    { text: "Application rate documented" },
    { text: "Minimum application-to-harvest interval met", critical: true },
    { text: "Field/block identified" },
  ],
  "KISS-019": [
    { text: "Compost pile/windrow ID recorded" },
    { text: "Temperature reading taken at multiple points" },
    { text: "Temperature meets minimum threshold (131°F/55°C)", critical: true },
    { text: "Turn date recorded (if applicable)" },
    { text: "Moisture level assessed" },
  ],
  "KISS-020": [
    { text: "Scouting date and scout name recorded" },
    { text: "Block/greenhouse section identified" },
    { text: "Pest species observed documented" },
    { text: "Pest pressure level assessed (low/med/high)" },
    { text: "Beneficial insect activity noted" },
    { text: "Treatment recommendation recorded" },
    { text: "Disease symptoms documented" },
  ],
  "KISS-021": [
    { text: "Product name (active ingredient) recorded" },
    { text: "EPA registration number verified" },
    { text: "Application date, time, and method recorded" },
    { text: "Target pest/disease documented" },
    { text: "Rate per acre/area applied" },
    { text: "Pre-harvest interval (PHI) calculated", critical: true },
    { text: "Restricted entry interval (REI) posted" },
    { text: "Applicator name and license number recorded" },
    { text: "Wind speed and weather conditions recorded" },
  ],
  "KISS-022": [
    { text: "Worker reports no vomiting, diarrhea, or jaundice", critical: true },
    { text: "No open wounds, cuts, or sores on hands/arms" },
    { text: "Worker confirms no diagnosed communicable illness" },
    { text: "Proper work attire worn (clean clothes, hair restraint)" },
    { text: "Worker confirms understanding of illness reporting policy" },
  ],
  "KISS-023": [
    { text: "Restroom facility is clean and stocked (soap, paper towels)" },
    { text: "Handwash station has potable warm water" },
    { text: "Handwash signs posted in appropriate language(s)" },
    { text: "Trash receptacles emptied and functional" },
    { text: "Toilet tissue adequate" },
    { text: "Facilities within required distance of workers" },
  ],
  "KISS-024": [
    { text: "Temperature reading recorded (°F/°C)" },
    { text: "Humidity reading recorded (%RH)" },
    { text: "CO2 level recorded (ppm) if applicable" },
    { text: "Ventilation system operational" },
    { text: "Light levels adequate for crop stage" },
    { text: "Irrigation system ran as scheduled" },
    { text: "Any anomalies or alarms noted" },
  ],
  "KISS-025": [
    { text: "All crew members passed health screening" },
    { text: "Harvest containers are clean and food-grade" },
    { text: "Cutting tools are clean and sanitized" },
    { text: "Product is not in contact with soil" },
    { text: "Damaged or contaminated product is segregated" },
    { text: "Product is moved to cooler within target time" },
    { text: "Lot/batch codes assigned correctly" },
  ],
  "KISS-026": [
    { text: "Equipment disassembled per cleaning procedure" },
    { text: "Visible debris removed (pre-rinse)" },
    { text: "Cleaning agent applied at correct concentration" },
    { text: "Contact time met per label instructions" },
    { text: "Final rinse completed with potable water" },
    { text: "Sanitizer applied (if applicable)" },
    { text: "Equipment reassembled and visually inspected" },
  ],
  "KISS-027": [
    { text: "Date, time, and location of intrusion recorded" },
    { text: "Animal species identified" },
    { text: "Area of contamination identified and marked" },
    { text: "Affected product segregated and held", critical: true },
    { text: "Area cleaned and sanitized" },
    { text: "Root cause assessed (fence breach, open door, etc.)" },
    { text: "Corrective/preventive action documented" },
  ],
  "KISS-028": [
    { text: "No prohibited substances used in organic areas", critical: true },
    { text: "Buffer zones maintained between organic and conventional" },
    { text: "Organic inputs verified on approved materials list" },
    { text: "Organic product is properly identified/labeled" },
    { text: "No commingling of organic and conventional product", critical: true },
    { text: "Cleaning between organic and conventional runs documented" },
    { text: "Organic certificates current for all organic inputs" },
  ],
  "KISS-029": [
    { text: "Supplier and product information recorded" },
    { text: "PO number matches delivery documentation" },
    { text: "Product temperature at receiving is within spec", critical: true },
    { text: "Product condition is acceptable (no damage, odor, pest)" },
    { text: "Lot/batch codes recorded" },
    { text: "Quantity matches documentation" },
    { text: "Organic certification verified (if applicable)" },
    { text: "Product moved to appropriate storage within 30 minutes" },
  ],
  "KISS-030": [
    { text: "Product ID and lot number recorded" },
    { text: "Probe thermometer calibrated and verified" },
    { text: "Product core temperature measured" },
    { text: "Temperature is within acceptance range (≤41°F/5°C)", critical: true },
    { text: "Any deviations noted and action taken" },
  ],
  "KISS-031": [
    { text: "Cooler/freezer ID recorded" },
    { text: "AM temperature reading within range", critical: true },
    { text: "PM temperature reading within range", critical: true },
    { text: "Thermometer is calibrated and functioning" },
    { text: "Door seals intact and closing properly" },
    { text: "No ice buildup blocking airflow" },
    { text: "Alarm system functional" },
  ],
  "KISS-032": [
    { text: "Date, time, and duration of deviation recorded" },
    { text: "Maximum temperature reached during deviation" },
    { text: "Affected product identified by lot/code", critical: true },
    { text: "Product was evaluated for safety" },
    { text: "Disposition decision documented (release/hold/destroy)", critical: true },
    { text: "Root cause identified" },
    { text: "Corrective action implemented" },
  ],
  "KISS-033": [
    { text: "Food contact surfaces visually clean — no residue" },
    { text: "Non-food contact surfaces clean" },
    { text: "Floors swept and free of standing water" },
    { text: "Drains clean and flowing" },
    { text: "Handwash stations stocked and functional" },
    { text: "No condensation dripping onto product areas" },
    { text: "Lighting adequate and protective covers in place" },
    { text: "Sanitizer concentration verified at correct ppm" },
  ],
  "KISS-034": [
    { text: "All product and packaging removed from lines" },
    { text: "Gross debris removed from all surfaces" },
    { text: "Cleaning agent applied to food contact surfaces" },
    { text: "Scrubbed and rinsed with potable water" },
    { text: "Sanitizer applied at correct concentration" },
    { text: "Floors and drains cleaned" },
    { text: "Trash and waste removed from area" },
    { text: "Supervisor sign-off on sanitation completion" },
  ],
  "KISS-035": [
    { text: "Sanitizer name/type recorded" },
    { text: "Concentration verified by test strip/titration" },
    { text: "Concentration is within required range", critical: true },
    { text: "Water temperature verified" },
    { text: "pH recorded (if applicable)" },
    { text: "Corrective action taken if out of range" },
  ],
  "KISS-036": [
    { text: "Worker reports no vomiting, diarrhea, or jaundice", critical: true },
    { text: "No open wounds, cuts, or sores on hands/arms" },
    { text: "Worker confirms no diagnosed communicable illness" },
    { text: "Hair restraint and proper PPE worn" },
    { text: "Clean uniform/smock worn" },
    { text: "No jewelry (except plain wedding band)" },
    { text: "Fingernails trimmed, no nail polish or artificial nails" },
  ],
  "KISS-037": [
    { text: "All employees wearing proper hair restraints" },
    { text: "Handwashing observed upon entry and after breaks" },
    { text: "No eating, drinking, or tobacco use in production areas" },
    { text: "Personal items stored in designated areas only" },
    { text: "Gloves changed when torn, contaminated, or between tasks" },
    { text: "No unauthorized persons in production area" },
    { text: "Employee lockers/break room clean and orderly" },
  ],
  "KISS-038": [
    { text: "Allergens present in facility are identified" },
    { text: "Production schedule reviewed for allergen sequencing" },
    { text: "Changeover cleaning completed between allergen runs" },
    { text: "Visual inspection confirms no residual allergen material" },
    { text: "Verification swab/test completed (if required)" },
    { text: "Labels verified for correct allergen declarations", critical: true },
  ],
  "KISS-039": [
    { text: "Glass items inventoried by location" },
    { text: "Brittle plastic items inventoried by location" },
    { text: "All items accounted for — no breakage" },
    { text: "Replacements with non-glass alternatives noted" },
    { text: "Breakage procedure posted and accessible" },
  ],
  "KISS-040": [
    { text: "Date, time, and location of incident" },
    { text: "Type of foreign material identified" },
    { text: "Product involved identified by lot/code", critical: true },
    { text: "Affected product placed on hold", critical: true },
    { text: "Area inspected and cleared" },
    { text: "Source of contamination identified" },
    { text: "Disposition of affected product documented" },
    { text: "Corrective/preventive action implemented" },
  ],
  "KISS-041": [
    { text: "Chemical storage area is locked/restricted" },
    { text: "All chemicals in original labeled containers" },
    { text: "SDS sheets available for all chemicals" },
    { text: "Food-grade chemicals separated from non-food-grade" },
    { text: "No chemicals stored above or adjacent to food products" },
    { text: "Spill containment measures in place" },
    { text: "Chemical inventory matches log" },
  ],
  "KISS-042": [
    { text: "Product name matches label", critical: true },
    { text: "Net weight/count is correct" },
    { text: "Lot/date code is legible and correct" },
    { text: "Allergen declaration is accurate", critical: true },
    { text: "Barcode/PLU scans correctly" },
    { text: "Organic claim verified (if applicable)" },
    { text: "Country of origin listed (if required)" },
    { text: "Nutritional panel present (if required)" },
  ],
  "KISS-043": [
    { text: "Sample collection date and location recorded" },
    { text: "Water source type identified" },
    { text: "Lab name and accreditation verified" },
    { text: "Total coliform result recorded" },
    { text: "E. coli result recorded", critical: true },
    { text: "Result meets EPA/state potable water standard", critical: true },
    { text: "Corrective action documented if out of spec" },
  ],
  "KISS-044": [
    { text: "Service date and technician name recorded" },
    { text: "All bait stations checked and accounted for" },
    { text: "Trap catch data documented" },
    { text: "Activity trends noted (increasing/decreasing)" },
    { text: "Any structural recommendations documented" },
    { text: "Pesticide applications documented (if any)" },
    { text: "Service report signed by facility contact" },
  ],
  "KISS-045": [
    { text: "Date, time, and location of sighting" },
    { text: "Pest type identified (rodent, insect, bird, etc.)" },
    { text: "Severity (single sighting vs. evidence of infestation)" },
    { text: "Immediate action taken" },
    { text: "Pest control operator notified" },
    { text: "Follow-up action documented" },
  ],
  "KISS-046": [
    { text: "All food contact equipment listed" },
    { text: "PM frequency assigned for each piece of equipment" },
    { text: "Responsible technician assigned" },
    { text: "Next service date scheduled" },
    { text: "Critical spare parts inventory verified" },
  ],
  "KISS-047": [
    { text: "Equipment ID and description recorded" },
    { text: "Issue/failure description documented" },
    { text: "Work performed described" },
    { text: "Parts replaced listed" },
    { text: "Equipment cleaned/sanitized before return to service" },
    { text: "Completed by and completion date signed" },
  ],
  "KISS-048": [
    { text: "Instrument ID and type recorded" },
    { text: "Reference standard used and its traceability" },
    { text: "Pre-calibration reading recorded" },
    { text: "Post-calibration reading recorded" },
    { text: "Instrument passes within tolerance", critical: true },
    { text: "Corrective action if out of tolerance documented" },
  ],
  "KISS-049": [
    { text: "Waste type (organic, recyclable, general, hazardous)" },
    { text: "Quantity/weight disposed" },
    { text: "Disposal method and destination" },
    { text: "Waste hauler name and permit verified" },
    { text: "Waste storage area clean and contained" },
  ],
  "KISS-050": [
    { text: "Trailer/truck ID recorded" },
    { text: "Pre-cool temperature verified before loading", critical: true },
    { text: "Product temperature at loading recorded", critical: true },
    { text: "Temperature set point confirmed" },
    { text: "Unit running and recording at departure" },
    { text: "Temperature at delivery recorded" },
  ],
  "KISS-051": [
    { text: "Trailer exterior is clean and in good repair" },
    { text: "Interior is clean, odor-free, no pest evidence" },
    { text: "Refrigeration unit is operational" },
    { text: "Temperature set and verified pre-loading" },
    { text: "No holes, cracks, or openings in walls/ceiling/floor" },
    { text: "Previous cargo is compatible (no chemicals, raw meat)" },
    { text: "Door seals intact" },
  ],
  "KISS-052": [
    { text: "Vehicle ID recorded" },
    { text: "Interior swept and debris removed" },
    { text: "Interior surfaces washed with approved cleaner" },
    { text: "Sanitizer applied and contact time met" },
    { text: "Visual inspection passed — no residue, odor, or stains" },
    { text: "Cleaning completed by and date recorded" },
  ],
  "KISS-053": [
    { text: "Shipment ID and destination recorded" },
    { text: "Departure temperature recorded" },
    { text: "In-transit temperature checks logged (if multi-stop)" },
    { text: "Arrival temperature recorded", critical: true },
    { text: "Temperature within acceptable range throughout", critical: true },
    { text: "Any deviations noted with corrective action" },
  ],
  "KISS-054": [
    { text: "Training topic and date recorded" },
    { text: "Trainer name and qualifications documented" },
    { text: "Attendee names and signatures captured" },
    { text: "Training materials/handouts referenced" },
    { text: "Duration of training recorded" },
  ],
  "KISS-055": [
    { text: "Trainee name and position recorded" },
    { text: "Training topic assessed" },
    { text: "Assessment method (written test, practical demo, observation)" },
    { text: "Score/result documented" },
    { text: "Competency demonstrated (pass/fail)", critical: true },
    { text: "Retraining scheduled if not competent" },
  ],
  "KISS-056": [
    { text: "Drill type (fire, evacuation, chemical spill, etc.)" },
    { text: "Date, time, and duration of drill" },
    { text: "Number of participants" },
    { text: "Assembly point reached within target time" },
    { text: "All personnel accounted for" },
    { text: "Emergency contacts were reachable" },
    { text: "Gaps identified and improvement actions documented" },
  ],
  "KISS-057": [
    { text: "Facility perimeter security assessed" },
    { text: "Access control measures evaluated" },
    { text: "Product handling vulnerabilities identified" },
    { text: "Water supply security assessed" },
    { text: "Chemical storage security verified" },
    { text: "Personnel security measures reviewed" },
    { text: "Mitigation strategies documented for each vulnerability" },
  ],
  "KISS-058": [
    { text: "Product categories assessed for fraud risk" },
    { text: "Supply chain complexity evaluated" },
    { text: "Historical fraud incidents in commodity reviewed" },
    { text: "Supplier verification measures in place" },
    { text: "Economic drivers for fraud assessed" },
    { text: "Mitigation measures documented" },
  ],
  "KISS-059": [
    { text: "Sampling types defined (micro, chemical, allergen)" },
    { text: "Sampling frequencies established" },
    { text: "Sample points identified on facility map" },
    { text: "Accredited laboratory designated" },
    { text: "Acceptance/rejection criteria defined" },
    { text: "Schedule posted and responsible persons assigned" },
  ],
  "KISS-060": [
    { text: "Sample ID and date recorded" },
    { text: "Sample type (product, environmental, water)" },
    { text: "Lab and analysis method documented" },
    { text: "Results recorded with units" },
    { text: "Result compared to specification/standard", critical: true },
    { text: "Corrective action taken for out-of-spec results" },
  ],
  "KISS-061": [
    { text: "Product name and code recorded" },
    { text: "Physical characteristics defined (size, color, weight)" },
    { text: "Chemical parameters defined (pH, Brix, etc. if applicable)" },
    { text: "Microbiological limits defined" },
    { text: "Shelf life and storage conditions specified" },
    { text: "Packaging specifications documented" },
    { text: "Allergen status documented" },
    { text: "Approved by quality and dated" },
  ],
  "KISS-062": [
    { text: "Sample collection date and time recorded" },
    { text: "Sample type (product surface, environmental, product)" },
    { text: "Organism/test type (APC, coliform, E. coli, Listeria, Salmonella)" },
    { text: "Lab name and method recorded" },
    { text: "Result recorded with units" },
    { text: "Result within acceptable limit", critical: true },
    { text: "Corrective action for positive/elevated results documented" },
  ],
  "KISS-063": [
    { text: "Employee name and hire date recorded" },
    { text: "Food safety orientation completed" },
    { text: "GMP training completed" },
    { text: "Allergen awareness training completed" },
    { text: "Health and hygiene policy signed" },
    { text: "Emergency procedures reviewed" },
    { text: "Job-specific training assigned and scheduled" },
    { text: "All required forms signed (W-4, I-9, etc.)" },
  ],
  "KISS-064": [
    { text: "Visitor name and company recorded" },
    { text: "Date and time of arrival" },
    { text: "Purpose of visit" },
    { text: "Host/escort name" },
    { text: "GMP/hygiene rules reviewed with visitor" },
    { text: "PPE provided (hairnet, smock, booties)" },
    { text: "Sign-out time recorded" },
  ],
  "KISS-065": [
    { text: "Count date recorded" },
    { text: "Location/warehouse area identified" },
    { text: "Item description and SKU/code" },
    { text: "System quantity vs. physical count" },
    { text: "Variance documented" },
    { text: "Variance explanation if > threshold" },
    { text: "Counter name and verifier name recorded" },
  ],
  "KISS-066": [
    { text: "Supplier name and PO number recorded" },
    { text: "Seed variety or input type documented" },
    { text: "Lot/batch number from supplier" },
    { text: "Quantity received" },
    { text: "Condition upon receipt (acceptable/damaged)" },
    { text: "Organic certificate verified (if applicable)" },
    { text: "Storage location assigned" },
  ],
  "KISS-067": [
    { text: "Delivery date and route planned" },
    { text: "Customer orders verified and packed" },
    { text: "Product quantities match manifest" },
    { text: "Truck temperature verified before loading" },
    { text: "Load sequence documented (FIFO, delivery order)" },
    { text: "Driver name and vehicle ID recorded" },
    { text: "Estimated delivery times noted" },
  ],
  "KISS-068": [
    { text: "Production week and date range identified" },
    { text: "Customer orders/demand compiled" },
    { text: "Crop availability assessed by variety" },
    { text: "Harvest schedule aligned with orders" },
    { text: "Pack-out plan by SKU/customer" },
    { text: "Labor requirements estimated" },
    { text: "Special instructions or priorities noted" },
  ],
};

async function seedChecklistItems() {
  console.log("Seeding checklist items for 68 KISS forms...\n");

  // Get all KISS templates
  const templates = await db
    .select({ id: checklistTemplates.id, code: checklistTemplates.code })
    .from(checklistTemplates);

  const templateMap = new Map(templates.map((t) => [t.code, t.id]));

  let totalInserted = 0;

  for (const [kissCode, items] of Object.entries(KISS_ITEMS)) {
    const templateId = templateMap.get(kissCode);
    if (!templateId) {
      console.log(`  SKIP ${kissCode} — template not found in DB`);
      continue;
    }

    // Check if items already exist for this template
    const existing = await db
      .select({ id: checklistItems.id })
      .from(checklistItems)
      .where(eq(checklistItems.templateId, templateId));

    if (existing.length > 0) {
      console.log(`  SKIP ${kissCode} — already has ${existing.length} items`);
      continue;
    }

    // Insert items
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      await db.insert(checklistItems).values({
        templateId,
        itemNumber: i + 1,
        itemText: item.text,
        itemType: item.type || "pass_fail",
        isCritical: item.critical ? 1 : 0,
        sortOrder: i + 1,
      });
    }

    console.log(`  ✓ ${kissCode} — ${items.length} items`);
    totalInserted += items.length;
  }

  console.log(`\nDone! Inserted ${totalInserted} checklist items.`);
  process.exit(0);
}

seedChecklistItems().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});

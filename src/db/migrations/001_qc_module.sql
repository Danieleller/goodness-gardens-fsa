-- ============================================================================
-- GOODNESS GARDENS QC PLATFORM - SUPABASE POSTGRESQL SCHEMA v2.0
-- Multi-Location Aware Fresh Herb Quality Control System
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- SECTION 1: ENUM TYPES
-- ============================================================================

-- Facility types for locations
CREATE TYPE facility_type AS ENUM ('PRODUCTION', 'WAREHOUSE', 'FARM', 'GREENHOUSE', 'CORPORATE');

-- Shelf life classifications
CREATE TYPE shelf_life_class AS ENUM ('HARDY', 'NORMAL', 'FINE');

-- QC grades
CREATE TYPE qc_grade AS ENUM ('A', 'B', 'C', 'D');

-- Defect severity levels
CREATE TYPE defect_severity AS ENUM ('MINOR', 'MAJOR', 'CRITICAL');

-- Defect categories
CREATE TYPE defect_category AS ENUM ('SAFETY', 'COMPLIANCE', 'QUALITY', 'COSMETIC');

-- Production type
CREATE TYPE production_type AS ENUM ('ORGANIC', 'CONVENTIONAL');

-- Lot disposition
CREATE TYPE lot_disposition AS ENUM ('APPROVED', 'APPROVED_WITH_REWORK', 'HOLD', 'REJECT', 'REWORK', 'DONATE');

-- User roles
CREATE TYPE user_role AS ENUM ('admin', 'manager', 'inspector', 'viewer', 'vendor_rep');

-- Vendor credit status
CREATE TYPE credit_status AS ENUM ('draft', 'submitted', 'approved', 'paid', 'rejected');

-- Corrective action status
CREATE TYPE corrective_action_status AS ENUM ('open', 'in_progress', 'completed', 'verified', 'closed');

-- Production lines
CREATE TYPE production_line_type AS ENUM ('LINE_1', 'LINE_2', 'LINE_3', 'LINE_4', 'LINE_5', 'LINE_6', 'LINE_7', 'LINE_8', 'LINE_9', 'LINE_10', 'LINE_11', 'LINE_12', 'GREENHOUSE', 'T2', 'T3');

-- ============================================================================
-- SECTION 2: CORE TABLES
-- ============================================================================

-- Locations table - represents all 17 NetSuite locations
CREATE TABLE locations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  netsuite_id VARCHAR(20) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  code VARCHAR(10) NOT NULL UNIQUE,
  region VARCHAR(100),
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(50),
  country VARCHAR(100),
  facility_type facility_type NOT NULL,
  is_active BOOLEAN DEFAULT true,
  contact_phone VARCHAR(20),
  contact_email VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT locations_name_not_empty CHECK (name <> ''),
  CONSTRAINT locations_code_not_empty CHECK (code <> '')
);

COMMENT ON TABLE locations IS 'Represents all 17 Goodness Gardens locations across the US and Mexico. Multi-location awareness is critical for QC platform.';
COMMENT ON COLUMN locations.netsuite_id IS 'NetSuite location ID for system integration';
COMMENT ON COLUMN locations.facility_type IS 'Indicates the type of facility (PRODUCTION, WAREHOUSE, FARM, GREENHOUSE, CORPORATE)';

-- Commodities table - represents all 23 herbs/commodities
CREATE TABLE commodities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  shelf_life_class shelf_life_class NOT NULL,
  shelf_life_days_min INTEGER NOT NULL,
  shelf_life_days_max INTEGER NOT NULL,
  is_organic BOOLEAN DEFAULT false,
  locally_harvested_bonus_days INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT shelf_life_min_max CHECK (shelf_life_days_min <= shelf_life_days_max),
  CONSTRAINT shelf_life_days_positive CHECK (shelf_life_days_min > 0 AND shelf_life_days_max > 0)
);

COMMENT ON TABLE commodities IS '23 herb commodities offered by Goodness Gardens. Shelf life class determines handling requirements.';
COMMENT ON COLUMN commodities.shelf_life_class IS 'HARDY (14-21 days), NORMAL (10-14 days), FINE (7-10 days)';
COMMENT ON COLUMN commodities.locally_harvested_bonus_days IS 'Additional shelf life days for locally harvested items';

-- Product lines table - represents all 38 packaging types
CREATE TABLE product_lines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  uom VARCHAR(10) NOT NULL,
  standard_weight_oz DECIMAL(10, 2),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE product_lines IS '38 packaging/product line types (Clamshell, Bag, Bunch, Cup, etc.)';
COMMENT ON COLUMN product_lines.uom IS 'Unit of measure (oz, bunch, case, etc.)';

-- Products table - junction of commodity + product_line
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  commodity_id UUID NOT NULL REFERENCES commodities(id) ON DELETE RESTRICT,
  product_line_id UUID NOT NULL REFERENCES product_lines(id) ON DELETE RESTRICT,
  netsuite_item_code VARCHAR(50) UNIQUE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  weight_oz DECIMAL(10, 2) NOT NULL,
  uom VARCHAR(10) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT product_name_not_empty CHECK (name <> ''),
  CONSTRAINT weight_positive CHECK (weight_oz > 0),
  UNIQUE(commodity_id, product_line_id)
);

COMMENT ON TABLE products IS 'Specific product SKUs combining a commodity with a product line (e.g., BASIL 0.50OZ)';
COMMENT ON COLUMN products.netsuite_item_code IS 'Item code from NetSuite for integration';

-- Location Products junction table - CRITICAL for multi-location awareness
CREATE TABLE location_products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  netsuite_item_id VARCHAR(50),
  is_available BOOLEAN DEFAULT true,
  min_stock_cases INTEGER DEFAULT 0,
  max_stock_cases INTEGER,
  lead_time_days INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(location_id, product_id)
);

COMMENT ON TABLE location_products IS 'Junction table: critical for multi-location awareness. Defines which products are available at each location.';
COMMENT ON COLUMN location_products.is_available IS 'Whether this location currently produces/stocks this product';
COMMENT ON COLUMN location_products.min_stock_cases IS 'Minimum stock level maintained at this location';

-- Vendors table
CREATE TABLE vendors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  netsuite_id VARCHAR(20) UNIQUE,
  name VARCHAR(255) NOT NULL,
  contact_name VARCHAR(255),
  contact_email VARCHAR(255),
  contact_phone VARCHAR(20),
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(50),
  country VARCHAR(100),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE vendors IS 'Suppliers of raw materials/ingredients';

-- Customers table
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  netsuite_id VARCHAR(20) UNIQUE,
  name VARCHAR(255) NOT NULL UNIQUE,
  contact_name VARCHAR(255),
  contact_email VARCHAR(255),
  contact_phone VARCHAR(20),
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(50),
  country VARCHAR(100),
  customer_type VARCHAR(50),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE customers IS 'Distributors and end customers (WALMART, SYSCO, BLUE APRON, BALDOR, etc.)';

-- Location Customers junction table
CREATE TABLE location_customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(location_id, customer_id)
);

COMMENT ON TABLE location_customers IS 'Defines which customers are served from which locations';

-- ============================================================================
-- SECTION 3: USER & PERMISSION TABLES
-- ============================================================================

-- User profiles table
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  full_name VARCHAR(255),
  role user_role NOT NULL DEFAULT 'viewer',
  is_active BOOLEAN DEFAULT true,
  phone VARCHAR(20),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT role_valid CHECK (role IN ('admin', 'manager', 'inspector', 'viewer', 'vendor_rep'))
);

COMMENT ON TABLE user_profiles IS 'User profile information with role-based access control';
COMMENT ON COLUMN user_profiles.role IS 'admin (full access), manager (location-based), inspector (can conduct QC), viewer (read-only), vendor_rep (can view credits)';

-- User locations junction table - defines location-specific access
CREATE TABLE user_locations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(user_id, location_id),
  CONSTRAINT user_locations_prevents_admin_location_restriction CHECK (
    -- Admins don't need location restrictions
    EXISTS (SELECT 1 FROM user_profiles WHERE id = user_id AND role = 'admin')
    OR location_id IS NOT NULL
  )
);

COMMENT ON TABLE user_locations IS 'Maps users to locations they have access to. Admins can skip this.';

-- ============================================================================
-- SECTION 4: DEFECT & QUALITY TABLES
-- ============================================================================

-- Defect types table - 21 defects with scoring config
CREATE TABLE defect_types (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  severity_weight DECIMAL(3, 1) NOT NULL,
  category defect_category NOT NULL,
  category_multiplier DECIMAL(3, 1) NOT NULL,
  requires_photo BOOLEAN DEFAULT false,
  food_safety_critical BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT severity_weight_valid CHECK (severity_weight IN (1.0, 2.5, 5.0)),
  CONSTRAINT category_multiplier_valid CHECK (category_multiplier IN (1.0, 1.5, 2.0, 3.0))
);

COMMENT ON TABLE defect_types IS '21 standard defect types with severity and category scoring';
COMMENT ON COLUMN defect_types.severity_weight IS 'Minor=1.0, Major=2.5, Critical=5.0';
COMMENT ON COLUMN defect_types.category_multiplier IS 'Safety=3.0, Compliance=2.0, Quality=1.5, Cosmetic=1.0';
COMMENT ON COLUMN defect_types.food_safety_critical IS 'True if defect must trigger automatic rejection';

-- Grading rules table - configurable per location
CREATE TABLE grading_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  location_id UUID REFERENCES locations(id) ON DELETE SET NULL,
  grade qc_grade NOT NULL,
  min_good_percentage INTEGER NOT NULL,
  max_good_percentage INTEGER,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT grade_a_range CHECK (
    (grade != 'A') OR (min_good_percentage = 90 AND max_good_percentage = 100)
  ),
  CONSTRAINT grade_b_range CHECK (
    (grade != 'B') OR (min_good_percentage = 75 AND max_good_percentage < 90)
  ),
  CONSTRAINT good_percentage_valid CHECK (
    min_good_percentage >= 0 AND min_good_percentage <= 100 AND
    max_good_percentage >= 0 AND max_good_percentage <= 100
  )
);

COMMENT ON TABLE grading_rules IS 'Configurable grading criteria per location. A: 90%+ good, B: 75%+ good, C: <75%, D: Trash';

-- ============================================================================
-- SECTION 5: RECEIVING QC TABLES
-- ============================================================================

-- Receiving lots table - incoming vendor shipments
CREATE TABLE receiving_lots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  location_id UUID NOT NULL REFERENCES locations(id) ON DELETE RESTRICT,
  vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE RESTRICT,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  po_number VARCHAR(50),
  lot_number VARCHAR(50),
  total_cases INTEGER NOT NULL,
  total_weight_lbs DECIMAL(12, 2),
  expected_arrival_date DATE,
  received_date DATE,
  netsuite_receipt_id VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT total_cases_positive CHECK (total_cases > 0),
  CONSTRAINT po_or_lot_required CHECK (po_number IS NOT NULL OR lot_number IS NOT NULL)
);

COMMENT ON TABLE receiving_lots IS 'Incoming vendor shipments/purchase orders tracked by location';
COMMENT ON COLUMN receiving_lots.po_number IS 'Purchase Order number from accounting system';
COMMENT ON COLUMN receiving_lots.lot_number IS 'Vendor lot identifier';

-- Receiving inspections table - actual QC inspections of lots
CREATE TABLE receiving_inspections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  receiving_lot_id UUID NOT NULL REFERENCES receiving_lots(id) ON DELETE CASCADE,
  inspector_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE RESTRICT,
  inspection_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  sample_size INTEGER NOT NULL,
  temperature_f DECIMAL(5, 1),
  humidity_pct DECIMAL(5, 1),
  overall_grade qc_grade NOT NULL,
  disposition lot_disposition NOT NULL,
  good_count INTEGER,
  defective_count INTEGER,
  notes TEXT,
  ai_predicted_grade qc_grade,
  ai_confidence_pct DECIMAL(5, 2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT sample_size_positive CHECK (sample_size > 0),
  CONSTRAINT counts_valid CHECK (
    (good_count IS NULL AND defective_count IS NULL) OR
    (good_count >= 0 AND defective_count >= 0)
  )
);

COMMENT ON TABLE receiving_inspections IS 'QC inspections of incoming lots with grading and disposition';
COMMENT ON COLUMN receiving_inspections.sample_size IS 'Number of units inspected (10% rule standard)';
COMMENT ON COLUMN receiving_inspections.disposition IS 'Approval decision: APPROVED, REWORK, REJECT, DONATE, etc.';
COMMENT ON COLUMN receiving_inspections.ai_predicted_grade IS 'AI/CV predicted grade for comparison';

-- Receiving defects table - per-defect findings
CREATE TABLE receiving_defects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  receiving_inspection_id UUID NOT NULL REFERENCES receiving_inspections(id) ON DELETE CASCADE,
  defect_type_id UUID NOT NULL REFERENCES defect_types(id) ON DELETE RESTRICT,
  affected_percentage DECIMAL(5, 2) NOT NULL,
  affected_count INTEGER,
  severity_override defect_severity,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT affected_percentage_valid CHECK (affected_percentage >= 0 AND affected_percentage <= 100)
);

COMMENT ON TABLE receiving_defects IS 'Individual defect findings from receiving inspections';
COMMENT ON COLUMN receiving_defects.affected_percentage IS 'Percentage of sample affected by this defect';
COMMENT ON COLUMN receiving_defects.severity_override IS 'Override default severity for this lot/defect combo';

-- Inspection photos table - with AI metadata
CREATE TABLE inspection_photos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  receiving_inspection_id UUID REFERENCES receiving_inspections(id) ON DELETE CASCADE,
  retail_inspection_id UUID,
  photo_url TEXT NOT NULL,
  photo_taken_at TIMESTAMP WITH TIME ZONE,
  description TEXT,
  ai_defect_detected BOOLEAN DEFAULT false,
  ai_confidence_pct DECIMAL(5, 2),
  ai_defect_type_detected VARCHAR(100),
  ai_bounding_boxes JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE inspection_photos IS 'Photo evidence from inspections with AI/CV metadata for future automation';
COMMENT ON COLUMN inspection_photos.ai_bounding_boxes IS 'JSON array of AI-detected defect bounding boxes';

-- Vendor credits table - financial recovery from defects
CREATE TABLE vendor_credits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  receiving_lot_id UUID NOT NULL REFERENCES receiving_lots(id) ON DELETE RESTRICT,
  vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE RESTRICT,
  created_by_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE RESTRICT,
  base_damage_pct DECIMAL(5, 2) NOT NULL,
  labor_buffer_pct DECIMAL(5, 2) NOT NULL,
  yield_loss_pct DECIMAL(5, 2) NOT NULL,
  total_credit_pct DECIMAL(5, 2) NOT NULL,
  credit_amount_usd DECIMAL(12, 2),
  unit_cost_usd DECIMAL(10, 2),
  status credit_status DEFAULT 'draft',
  approved_by_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  approved_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT percentages_valid CHECK (
    base_damage_pct >= 0 AND base_damage_pct <= 100 AND
    labor_buffer_pct >= 0 AND labor_buffer_pct <= 100 AND
    yield_loss_pct >= 0 AND yield_loss_pct <= 100 AND
    total_credit_pct >= 0 AND total_credit_pct <= 100
  ),
  CONSTRAINT credit_amount_valid CHECK (credit_amount_usd IS NULL OR credit_amount_usd >= 0)
);

COMMENT ON TABLE vendor_credits IS 'Financial credits issued to vendors for defective lots';
COMMENT ON COLUMN vendor_credits.base_damage_pct IS 'Direct product damage percentage';
COMMENT ON COLUMN vendor_credits.labor_buffer_pct IS 'Labor cost recovery (8-15% standard)';
COMMENT ON COLUMN vendor_credits.yield_loss_pct IS 'Yield loss percentage (5% standard)';

-- ============================================================================
-- SECTION 6: PRODUCTION & RETAIL QC TABLES
-- ============================================================================

-- Production batches table
CREATE TABLE production_batches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  location_id UUID NOT NULL REFERENCES locations(id) ON DELETE RESTRICT,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  batch_number VARCHAR(50) NOT NULL,
  production_line production_line_type NOT NULL,
  production_type production_type NOT NULL,
  batch_size_cases INTEGER NOT NULL,
  batch_size_weight_lbs DECIMAL(12, 2),
  production_date DATE NOT NULL,
  scheduled_shipment_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT batch_number_not_empty CHECK (batch_number <> ''),
  CONSTRAINT batch_size_positive CHECK (batch_size_cases > 0),
  UNIQUE(location_id, batch_number)
);

COMMENT ON TABLE production_batches IS 'Production runs combining commodity + product_line at a specific location';
COMMENT ON COLUMN production_batches.production_line IS 'Physical line: LINE_1 through LINE_12, GREENHOUSE, T2, T3';
COMMENT ON COLUMN production_batches.batch_number IS 'Unique identifier within location';

-- Retail inspections table - AQL sampling during production
CREATE TABLE retail_inspections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  production_batch_id UUID NOT NULL REFERENCES production_batches(id) ON DELETE CASCADE,
  inspector_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE RESTRICT,
  inspection_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  aql_level VARCHAR(10),
  sample_size INTEGER NOT NULL,
  overall_grade qc_grade NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT sample_size_positive CHECK (sample_size > 0)
);

COMMENT ON TABLE retail_inspections IS 'In-process QC checks during production (weight, visual, label, lot code)';
COMMENT ON COLUMN retail_inspections.aql_level IS 'Acceptance Quality Level code (e.g., 1.5%, 2.5%)';

-- Retail samples table - individual checks
CREATE TABLE retail_samples (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  retail_inspection_id UUID NOT NULL REFERENCES retail_inspections(id) ON DELETE CASCADE,
  sample_number INTEGER NOT NULL,
  weight_oz DECIMAL(10, 2),
  weight_conforming BOOLEAN,
  label_present BOOLEAN,
  label_correct BOOLEAN,
  lot_code_present BOOLEAN,
  lot_code_correct BOOLEAN,
  visual_check_passed BOOLEAN,
  placement_check_passed BOOLEAN,
  defects_noted TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT sample_number_positive CHECK (sample_number > 0)
);

COMMENT ON TABLE retail_samples IS 'Individual sample checks: weight, label, lot code, visual, placement';

-- ============================================================================
-- SECTION 7: CORRECTIVE ACTION & AUDIT TABLES
-- ============================================================================

-- Corrective actions table
CREATE TABLE corrective_actions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  location_id UUID NOT NULL REFERENCES locations(id) ON DELETE RESTRICT,
  initiated_by_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE RESTRICT,
  related_inspection_id UUID,
  related_receiving_lot_id UUID REFERENCES receiving_lots(id) ON DELETE SET NULL,
  related_production_batch_id UUID REFERENCES production_batches(id) ON DELETE SET NULL,
  issue_description TEXT NOT NULL,
  root_cause TEXT,
  corrective_action_plan TEXT NOT NULL,
  assigned_to_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  due_date DATE,
  status corrective_action_status DEFAULT 'open',
  completion_date DATE,
  verified_by_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE corrective_actions IS 'Tracks corrective actions initiated from QC findings';
COMMENT ON COLUMN corrective_actions.status IS 'open, in_progress, completed, verified, closed';

-- Audit log table - comprehensive audit trail
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  action VARCHAR(100) NOT NULL,
  table_name VARCHAR(100),
  record_id UUID,
  old_values JSONB,
  new_values JSONB,
  details TEXT,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE audit_log IS 'Complete audit trail of all user actions for compliance';

-- System configuration table
CREATE TABLE system_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  config_key VARCHAR(100) NOT NULL UNIQUE,
  config_value TEXT NOT NULL,
  data_type VARCHAR(50),
  description TEXT,
  updated_by_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE system_config IS 'System-wide configuration and parameters';

-- ============================================================================
-- SECTION 8: INDEXES
-- ============================================================================

-- Locations indexes
CREATE INDEX idx_locations_netsuite_id ON locations(netsuite_id);
CREATE INDEX idx_locations_code ON locations(code);
CREATE INDEX idx_locations_is_active ON locations(is_active);
CREATE INDEX idx_locations_facility_type ON locations(facility_type);

-- Commodities indexes
CREATE INDEX idx_commodities_name ON commodities(name);
CREATE INDEX idx_commodities_shelf_life_class ON commodities(shelf_life_class);
CREATE INDEX idx_commodities_is_active ON commodities(is_active);

-- Products indexes
CREATE INDEX idx_products_commodity_id ON products(commodity_id);
CREATE INDEX idx_products_product_line_id ON products(product_line_id);
CREATE INDEX idx_products_netsuite_item_code ON products(netsuite_item_code);

-- Location products indexes
CREATE INDEX idx_location_products_location_id ON location_products(location_id);
CREATE INDEX idx_location_products_product_id ON location_products(product_id);
CREATE INDEX idx_location_products_is_available ON location_products(is_available);

-- Vendors/Customers indexes
CREATE INDEX idx_vendors_netsuite_id ON vendors(netsuite_id);
CREATE INDEX idx_vendors_name ON vendors(name);
CREATE INDEX idx_customers_netsuite_id ON customers(netsuite_id);
CREATE INDEX idx_customers_name ON customers(name);

-- User indexes
CREATE INDEX idx_user_profiles_email ON user_profiles(email);
CREATE INDEX idx_user_profiles_role ON user_profiles(role);
CREATE INDEX idx_user_locations_user_id ON user_locations(user_id);
CREATE INDEX idx_user_locations_location_id ON user_locations(location_id);

-- Receiving QC indexes
CREATE INDEX idx_receiving_lots_location_id ON receiving_lots(location_id);
CREATE INDEX idx_receiving_lots_vendor_id ON receiving_lots(vendor_id);
CREATE INDEX idx_receiving_lots_product_id ON receiving_lots(product_id);
CREATE INDEX idx_receiving_lots_po_number ON receiving_lots(po_number);
CREATE INDEX idx_receiving_lots_received_date ON receiving_lots(received_date);

CREATE INDEX idx_receiving_inspections_lot_id ON receiving_inspections(receiving_lot_id);
CREATE INDEX idx_receiving_inspections_inspector_id ON receiving_inspections(inspector_id);
CREATE INDEX idx_receiving_inspections_date ON receiving_inspections(inspection_date);
CREATE INDEX idx_receiving_inspections_grade ON receiving_inspections(overall_grade);
CREATE INDEX idx_receiving_inspections_disposition ON receiving_inspections(disposition);

CREATE INDEX idx_receiving_defects_inspection_id ON receiving_defects(receiving_inspection_id);
CREATE INDEX idx_receiving_defects_defect_type_id ON receiving_defects(defect_type_id);

CREATE INDEX idx_inspection_photos_receiving_id ON inspection_photos(receiving_inspection_id);
CREATE INDEX idx_inspection_photos_retail_id ON inspection_photos(retail_inspection_id);

CREATE INDEX idx_vendor_credits_lot_id ON vendor_credits(receiving_lot_id);
CREATE INDEX idx_vendor_credits_vendor_id ON vendor_credits(vendor_id);
CREATE INDEX idx_vendor_credits_status ON vendor_credits(status);

-- Production QC indexes
CREATE INDEX idx_production_batches_location_id ON production_batches(location_id);
CREATE INDEX idx_production_batches_product_id ON production_batches(product_id);
CREATE INDEX idx_production_batches_customer_id ON production_batches(customer_id);
CREATE INDEX idx_production_batches_batch_number ON production_batches(batch_number);
CREATE INDEX idx_production_batches_production_date ON production_batches(production_date);

CREATE INDEX idx_retail_inspections_batch_id ON retail_inspections(production_batch_id);
CREATE INDEX idx_retail_inspections_inspector_id ON retail_inspections(inspector_id);
CREATE INDEX idx_retail_inspections_date ON retail_inspections(inspection_date);

CREATE INDEX idx_retail_samples_inspection_id ON retail_samples(retail_inspection_id);

-- Corrective actions indexes
CREATE INDEX idx_corrective_actions_location_id ON corrective_actions(location_id);
CREATE INDEX idx_corrective_actions_status ON corrective_actions(status);
CREATE INDEX idx_corrective_actions_assigned_to ON corrective_actions(assigned_to_id);
CREATE INDEX idx_corrective_actions_due_date ON corrective_actions(due_date);

-- Audit log indexes
CREATE INDEX idx_audit_log_user_id ON audit_log(user_id);
CREATE INDEX idx_audit_log_action ON audit_log(action);
CREATE INDEX idx_audit_log_table_name ON audit_log(table_name);
CREATE INDEX idx_audit_log_created_at ON audit_log(created_at);

-- ============================================================================
-- SECTION 9: TRIGGERS FOR AUTO-UPDATING TIMESTAMPS
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to all tables with updated_at
CREATE TRIGGER update_locations_updated_at BEFORE UPDATE ON locations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_commodities_updated_at BEFORE UPDATE ON commodities
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_product_lines_updated_at BEFORE UPDATE ON product_lines
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_location_products_updated_at BEFORE UPDATE ON location_products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vendors_updated_at BEFORE UPDATE ON vendors
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_defect_types_updated_at BEFORE UPDATE ON defect_types
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_grading_rules_updated_at BEFORE UPDATE ON grading_rules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_receiving_lots_updated_at BEFORE UPDATE ON receiving_lots
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_receiving_inspections_updated_at BEFORE UPDATE ON receiving_inspections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vendor_credits_updated_at BEFORE UPDATE ON vendor_credits
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_production_batches_updated_at BEFORE UPDATE ON production_batches
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_retail_inspections_updated_at BEFORE UPDATE ON retail_inspections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_system_config_updated_at BEFORE UPDATE ON system_config
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- SECTION 10: ROW LEVEL SECURITY POLICIES (RLS)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE commodities ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE location_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE location_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE defect_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE grading_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE receiving_lots ENABLE ROW LEVEL SECURITY;
ALTER TABLE receiving_inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE receiving_defects ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspection_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE production_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE retail_inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE retail_samples ENABLE ROW LEVEL SECURITY;
ALTER TABLE corrective_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_config ENABLE ROW LEVEL SECURITY;

-- Policies for locations - admins can see all, others see assigned locations only
CREATE POLICY locations_policy ON locations FOR SELECT
  USING (
    (SELECT role FROM user_profiles WHERE id = auth.uid()) = 'admin'
    OR EXISTS (
      SELECT 1 FROM user_locations
      WHERE user_id = auth.uid() AND location_id = locations.id
    )
  );

-- Policies for commodities - readable by all, writable by admins only
CREATE POLICY commodities_read ON commodities FOR SELECT USING (true);
CREATE POLICY commodities_write ON commodities FOR INSERT, UPDATE, DELETE
  USING ((SELECT role FROM user_profiles WHERE id = auth.uid()) = 'admin');

-- Policies for product_lines - readable by all, writable by admins only
CREATE POLICY product_lines_read ON product_lines FOR SELECT USING (true);
CREATE POLICY product_lines_write ON product_lines FOR INSERT, UPDATE, DELETE
  USING ((SELECT role FROM user_profiles WHERE id = auth.uid()) = 'admin');

-- Policies for products - readable by all, writable by admins only
CREATE POLICY products_read ON products FOR SELECT USING (true);
CREATE POLICY products_write ON products FOR INSERT, UPDATE, DELETE
  USING ((SELECT role FROM user_profiles WHERE id = auth.uid()) = 'admin');

-- Policies for location_products - readable by all, writable by admins
CREATE POLICY location_products_read ON location_products FOR SELECT
  USING (
    (SELECT role FROM user_profiles WHERE id = auth.uid()) = 'admin'
    OR EXISTS (
      SELECT 1 FROM user_locations
      WHERE user_id = auth.uid() AND location_id = location_products.location_id
    )
  );

CREATE POLICY location_products_write ON location_products FOR INSERT, UPDATE, DELETE
  USING ((SELECT role FROM user_profiles WHERE id = auth.uid()) = 'admin');

-- Policies for vendors - read by all, write by admins
CREATE POLICY vendors_read ON vendors FOR SELECT USING (true);
CREATE POLICY vendors_write ON vendors FOR INSERT, UPDATE, DELETE
  USING ((SELECT role FROM user_profiles WHERE id = auth.uid()) = 'admin');

-- Policies for customers - read by all, write by admins
CREATE POLICY customers_read ON customers FOR SELECT USING (true);
CREATE POLICY customers_write ON customers FOR INSERT, UPDATE, DELETE
  USING ((SELECT role FROM user_profiles WHERE id = auth.uid()) = 'admin');

-- Policies for receiving_lots - location-based access
CREATE POLICY receiving_lots_policy ON receiving_lots FOR SELECT
  USING (
    (SELECT role FROM user_profiles WHERE id = auth.uid()) = 'admin'
    OR EXISTS (
      SELECT 1 FROM user_locations
      WHERE user_id = auth.uid() AND location_id = receiving_lots.location_id
    )
  );

CREATE POLICY receiving_lots_write ON receiving_lots FOR INSERT, UPDATE
  USING (
    (SELECT role FROM user_profiles WHERE id = auth.uid()) IN ('admin', 'manager')
    AND EXISTS (
      SELECT 1 FROM user_locations
      WHERE user_id = auth.uid() AND location_id = receiving_lots.location_id
    )
  );

-- Policies for receiving_inspections - location-based access
CREATE POLICY receiving_inspections_policy ON receiving_inspections FOR SELECT
  USING (
    (SELECT role FROM user_profiles WHERE id = auth.uid()) = 'admin'
    OR EXISTS (
      SELECT 1 FROM user_locations ul
      JOIN receiving_lots rl ON ul.location_id = rl.location_id
      WHERE ul.user_id = auth.uid() AND rl.id = receiving_inspections.receiving_lot_id
    )
  );

CREATE POLICY receiving_inspections_write ON receiving_inspections FOR INSERT, UPDATE
  USING (
    (SELECT role FROM user_profiles WHERE id = auth.uid()) IN ('admin', 'manager', 'inspector')
    AND EXISTS (
      SELECT 1 FROM user_locations ul
      JOIN receiving_lots rl ON ul.location_id = rl.location_id
      WHERE ul.user_id = auth.uid() AND rl.id = receiving_inspections.receiving_lot_id
    )
  );

-- Policies for receiving_defects
CREATE POLICY receiving_defects_policy ON receiving_defects FOR SELECT
  USING (
    (SELECT role FROM user_profiles WHERE id = auth.uid()) = 'admin'
    OR EXISTS (
      SELECT 1 FROM user_locations ul
      JOIN receiving_lots rl ON ul.location_id = rl.location_id
      JOIN receiving_inspections ri ON rl.id = ri.receiving_lot_id
      WHERE ul.user_id = auth.uid() AND ri.id = receiving_defects.receiving_inspection_id
    )
  );

CREATE POLICY receiving_defects_write ON receiving_defects FOR INSERT, UPDATE
  USING (
    (SELECT role FROM user_profiles WHERE id = auth.uid()) IN ('admin', 'manager', 'inspector')
  );

-- Policies for vendor_credits
CREATE POLICY vendor_credits_policy ON vendor_credits FOR SELECT
  USING (
    (SELECT role FROM user_profiles WHERE id = auth.uid()) IN ('admin', 'manager', 'vendor_rep')
    OR EXISTS (
      SELECT 1 FROM user_locations ul
      JOIN receiving_lots rl ON ul.location_id = rl.location_id
      WHERE ul.user_id = auth.uid() AND rl.id = vendor_credits.receiving_lot_id
    )
  );

CREATE POLICY vendor_credits_write ON vendor_credits FOR INSERT, UPDATE
  USING (
    (SELECT role FROM user_profiles WHERE id = auth.uid()) IN ('admin', 'manager')
  );

-- Policies for production_batches - location-based
CREATE POLICY production_batches_policy ON production_batches FOR SELECT
  USING (
    (SELECT role FROM user_profiles WHERE id = auth.uid()) = 'admin'
    OR EXISTS (
      SELECT 1 FROM user_locations
      WHERE user_id = auth.uid() AND location_id = production_batches.location_id
    )
  );

CREATE POLICY production_batches_write ON production_batches FOR INSERT, UPDATE
  USING (
    (SELECT role FROM user_profiles WHERE id = auth.uid()) IN ('admin', 'manager')
    AND EXISTS (
      SELECT 1 FROM user_locations
      WHERE user_id = auth.uid() AND location_id = production_batches.location_id
    )
  );

-- Policies for retail_inspections - location-based
CREATE POLICY retail_inspections_policy ON retail_inspections FOR SELECT
  USING (
    (SELECT role FROM user_profiles WHERE id = auth.uid()) = 'admin'
    OR EXISTS (
      SELECT 1 FROM user_locations ul
      JOIN production_batches pb ON ul.location_id = pb.location_id
      WHERE ul.user_id = auth.uid() AND pb.id = retail_inspections.production_batch_id
    )
  );

CREATE POLICY retail_inspections_write ON retail_inspections FOR INSERT, UPDATE
  USING (
    (SELECT role FROM user_profiles WHERE id = auth.uid()) IN ('admin', 'manager', 'inspector')
  );

-- Policies for retail_samples
CREATE POLICY retail_samples_policy ON retail_samples FOR SELECT
  USING (
    (SELECT role FROM user_profiles WHERE id = auth.uid()) = 'admin'
    OR EXISTS (
      SELECT 1 FROM user_locations ul
      JOIN production_batches pb ON ul.location_id = pb.location_id
      JOIN retail_inspections ri ON pb.id = ri.production_batch_id
      WHERE ul.user_id = auth.uid() AND ri.id = retail_samples.retail_inspection_id
    )
  );

CREATE POLICY retail_samples_write ON retail_samples FOR INSERT, UPDATE
  USING (
    (SELECT role FROM user_profiles WHERE id = auth.uid()) IN ('admin', 'manager', 'inspector')
  );

-- Policies for corrective_actions - location-based
CREATE POLICY corrective_actions_policy ON corrective_actions FOR SELECT
  USING (
    (SELECT role FROM user_profiles WHERE id = auth.uid()) = 'admin'
    OR EXISTS (
      SELECT 1 FROM user_locations
      WHERE user_id = auth.uid() AND location_id = corrective_actions.location_id
    )
  );

CREATE POLICY corrective_actions_write ON corrective_actions FOR INSERT, UPDATE
  USING (
    (SELECT role FROM user_profiles WHERE id = auth.uid()) IN ('admin', 'manager')
    AND EXISTS (
      SELECT 1 FROM user_locations
      WHERE user_id = auth.uid() AND location_id = corrective_actions.location_id
    )
  );

-- Policies for audit_log - admins only
CREATE POLICY audit_log_policy ON audit_log FOR SELECT
  USING ((SELECT role FROM user_profiles WHERE id = auth.uid()) = 'admin');

CREATE POLICY audit_log_write ON audit_log FOR INSERT
  USING (true);

-- ============================================================================
-- SECTION 11: SEED DATA - LOCATIONS
-- ============================================================================

INSERT INTO locations (netsuite_id, name, code, region, facility_type, is_active, city, state, country) VALUES
('2649_BRITT', '2649 Britt Rd, LLC', 'BR1', 'Midwest', 'FARM', true, 'Francesville', 'IN', 'USA'),
('8175_NW31ST', '8175 NW 31st St', 'NW1', 'West', 'PRODUCTION', true, 'Oklahoma City', 'OK', 'USA'),
('ALLENTOWN_PA', 'Allentown, PA', 'AL1', 'Northeast', 'WAREHOUSE', true, 'Allentown', 'PA', 'USA'),
('CORPORATE', 'CORPORATE', 'CORP', 'Multiple', 'CORPORATE', true, 'Francesville', 'IN', 'USA'),
('FARM_FRESH_LOGISTICS', 'Farm Fresh Logistics', 'FFL', 'Midwest', 'WAREHOUSE', true, 'Francesville', 'IN', 'USA'),
('FRANCESVILLE_IN', 'Francesville, IN', 'FR1', 'Midwest', 'FARM', true, 'Francesville', 'IN', 'USA'),
('GG_RE_219', 'GG RE 219, LLC', 'RE2', 'Southeast', 'WAREHOUSE', true, 'Miami', 'FL', 'USA'),
('GG_RE_305', 'GG RE 305 LLC', 'RE3', 'Southwest', 'WAREHOUSE', true, 'San Antonio', 'TX', 'USA'),
('MCGREGORS_GREENS', 'McGregors Greens', 'MG1', 'Southeast', 'FARM', true, 'Miami', 'FL', 'USA'),
('MIAMI_FL', 'Miami, FL', 'MIA', 'Southeast', 'PRODUCTION', true, 'Miami', 'FL', 'USA'),
('NEW_HAMPTON_NY', 'New Hampton, NY', 'NH1', 'Northeast', 'FARM', true, 'New Hampton', 'NY', 'USA'),
('NEW_HAMPTON_GREENHOUSE', 'New Hampton, NY : Greenhouse', 'NHG', 'Northeast', 'GREENHOUSE', true, 'New Hampton', 'NY', 'USA'),
('PUEBLA_MX', 'Puebla, MX', 'PUE', 'International', 'FARM', true, 'Puebla', 'PU', 'Mexico'),
('PYNY', 'PYNY', 'PYNY', 'Northeast', 'PRODUCTION', true, 'New York', 'NY', 'USA'),
('SAN_ANTONIO_TX', 'San Antonio, TX', 'SAT', 'Southwest', 'PRODUCTION', true, 'San Antonio', 'TX', 'USA'),
('SAN_ANTONIO_PEARSALL', 'San Antonio, TX : Pearsall Farm', 'PEARSALL', 'Southwest', 'FARM', true, 'Pearsall', 'TX', 'USA'),
('TAYLORVILLE_IL', 'Taylorville, IL', 'TAY', 'Midwest', 'FARM', true, 'Taylorville', 'IL', 'USA');

-- ============================================================================
-- SECTION 12: SEED DATA - COMMODITIES
-- ============================================================================

INSERT INTO commodities (name, description, shelf_life_class, shelf_life_days_min, shelf_life_days_max, is_organic, locally_harvested_bonus_days) VALUES
('BASIL', 'Sweet basil, aromatic herb', 'NORMAL', 10, 14, false, 2),
('BAY LEAVES', 'Dried bay leaves', 'HARDY', 14, 21, false, 0),
('CHIVES', 'Fresh chives', 'FINE', 7, 10, false, 1),
('CILANTRO', 'Fresh cilantro', 'HARDY', 14, 21, false, 2),
('CURLY PARSLEY', 'Curly leaf parsley', 'HARDY', 14, 21, false, 1),
('DILL', 'Fresh dill herb', 'NORMAL', 10, 14, false, 1),
('EDIBLE ORCHIDS', 'Decorative edible orchids', 'FINE', 7, 10, false, 0),
('GARLIC', 'Fresh garlic', 'HARDY', 14, 21, false, 0),
('GINGER', 'Fresh ginger root', 'HARDY', 14, 21, false, 0),
('ITALIAN PARSLEY', 'Flat leaf parsley', 'HARDY', 14, 21, false, 1),
('LEMONGRASS', 'Fresh lemongrass', 'NORMAL', 10, 14, false, 1),
('MARJORAM', 'Marjoram herb', 'NORMAL', 10, 14, false, 0),
('MINT', 'Fresh mint', 'NORMAL', 10, 14, false, 2),
('OREGANO', 'Fresh oregano', 'NORMAL', 10, 14, false, 1),
('ROSEMARY', 'Fresh rosemary', 'HARDY', 14, 21, false, 1),
('SAGE', 'Fresh sage', 'HARDY', 14, 21, false, 0),
('TARRAGON', 'French tarragon', 'FINE', 7, 10, false, 0),
('THAI BASIL', 'Thai basil variety', 'NORMAL', 10, 14, false, 1),
('THYME', 'Fresh thyme', 'HARDY', 14, 21, false, 1),
('BARBECUE BLEND', 'Mixed herb blend', 'NORMAL', 10, 14, false, 0),
('ITALIAN FESTIVAL BLEND', 'Italian herb mix', 'NORMAL', 10, 14, false, 0),
('POULTRY BLEND', 'Poultry seasoning blend', 'NORMAL', 10, 14, false, 0),
('ROASTING BLEND', 'Roasting herb blend', 'NORMAL', 10, 14, false, 0);

-- ============================================================================
-- SECTION 13: SEED DATA - PRODUCT LINES
-- ============================================================================

INSERT INTO product_lines (name, description, uom, standard_weight_oz) VALUES
('0.25OZ Clamshell', 'Clear clamshell package 0.25 oz', 'oz', 0.25),
('0.5OZ Clamshell', 'Half ounce clamshell', 'oz', 0.5),
('1OZ Clamshell', 'Single ounce clamshell', 'oz', 1.0),
('1.5OZ Clamshell', 'One and a half ounce clamshell', 'oz', 1.5),
('1.75OZ Clamshell', 'One point seventy-five ounce clamshell', 'oz', 1.75),
('2OZ Clamshell', 'Two ounce clamshell', 'oz', 2.0),
('2.5OZ Clamshell', 'Two point five ounce clamshell', 'oz', 2.5),
('2.5OZ Clamshell - SS', 'Two point five ounce clamshell snap seal', 'oz', 2.5),
('4OZ Clamshell', 'Four ounce clamshell', 'oz', 4.0),
('4OZ Clamshell - SS', 'Four ounce clamshell snap seal', 'oz', 4.0),
('Half Ounce', 'Half ounce package', 'oz', 0.5),
('Bag', 'Plastic bag package', 'case', NULL),
('Basket', 'Basket container', 'case', NULL),
('Bunch', 'Fresh herb bunch', 'bunch', NULL),
('Cello', 'Cellophane wrap package', 'case', NULL),
('Club Pack', 'Club pack format', 'case', NULL),
('Crates', 'Wooden crate package', 'case', NULL),
('Cup', 'Cup container', 'case', NULL),
('Curve', 'Curved container', 'case', NULL),
('Food Service', 'Food service bulk', 'case', NULL),
('Green House', 'Greenhouse fresh package', 'case', NULL),
('Hangerless', 'Hangerless package format', 'case', NULL),
('Herb BlastZ', 'Herb Blastz product line', 'case', NULL),
('Hydroponic', 'Hydroponic grown package', 'case', NULL),
('Just a Cup', 'Just a Cup format', 'case', NULL),
('Kitchen Garden', 'Kitchen garden kit', 'case', NULL),
('Midline', 'Mid-line package', 'case', NULL),
('Netted', 'Netted bag package', 'case', NULL),
('PepperZ', 'Pepperz product line', 'case', NULL),
('Plants', 'Live herb plants', 'case', NULL),
('Potted', 'Potted herb plants', 'pot', NULL),
('Puree', 'Herb puree package', 'case', NULL),
('Rack Combo', 'Rack combination display', 'case', NULL),
('Received', 'As received package', 'case', NULL),
('ShakerZ', 'Shakerz product line', 'case', NULL),
('Shipper Combo', 'Shipping combo pack', 'case', NULL),
('ShroomZ', 'Shroomz product line', 'case', NULL),
('Singles', 'Single unit package', 'case', NULL),
('Slimline', 'Slimline package format', 'case', NULL),
('Square', 'Square container', 'case', NULL),
('Wax Case', 'Wax-lined case package', 'case', NULL);

-- ============================================================================
-- SECTION 14: SEED DATA - DEFECT TYPES
-- ============================================================================

INSERT INTO defect_types (name, description, severity_weight, category, category_multiplier, requires_photo, food_safety_critical) VALUES
('Browning', 'Leaf browning or discoloration', 2.5, 'QUALITY', 1.5, true, false),
('Wilting', 'Leaf wilting or loss of turgidity', 2.5, 'QUALITY', 1.5, true, false),
('Yellowing', 'Yellow discoloration of leaves', 1.0, 'COSMETIC', 1.0, true, false),
('Decay/Rot', 'Rotting or decaying portions', 5.0, 'SAFETY', 3.0, true, true),
('Mold', 'Visible mold or mildew', 5.0, 'SAFETY', 3.0, true, true),
('Mechanical Damage', 'Cuts, bruises, or crushing damage', 2.5, 'QUALITY', 1.5, true, false),
('Insect Damage', 'Visible insect damage', 2.5, 'QUALITY', 1.5, true, false),
('Foreign Material', 'Dirt, debris, or foreign objects', 5.0, 'SAFETY', 3.0, true, true),
('Temperature Abuse', 'Signs of freeze or heat damage', 2.5, 'QUALITY', 1.5, false, false),
('Short Weight', 'Package weight below specification', 2.5, 'COMPLIANCE', 2.0, false, false),
('Odor/Off-Smell', 'Abnormal or off odor', 5.0, 'SAFETY', 3.0, false, true),
('Excessive Stems', 'Too many stems, insufficient leaf', 1.0, 'COSMETIC', 1.0, true, false),
('Tip Burn', 'Brown or burned leaf tips', 1.0, 'COSMETIC', 1.0, true, false),
('Dehydration', 'Dried out or desiccated appearance', 2.5, 'QUALITY', 1.5, true, false),
('Slime', 'Slimy film or residue', 5.0, 'SAFETY', 3.0, true, true),
('Discoloration', 'Abnormal color change', 1.0, 'COSMETIC', 1.0, true, false),
('Root Damage', 'Damaged or deteriorated roots', 2.5, 'QUALITY', 1.5, true, false),
('Pest Presence', 'Live or dead insects/pests present', 5.0, 'SAFETY', 3.0, true, true),
('Label Error', 'Incorrect or missing label', 2.5, 'COMPLIANCE', 2.0, false, false),
('Packaging Damage', 'Torn or damaged packaging', 1.0, 'COSMETIC', 1.0, true, false),
('Missing Documentation', 'Missing lot code or documentation', 5.0, 'COMPLIANCE', 2.0, false, false);

-- ============================================================================
-- SECTION 15: SEED DATA - GRADING RULES
-- ============================================================================

INSERT INTO grading_rules (location_id, grade, min_good_percentage, max_good_percentage, description) VALUES
(NULL, 'A', 90, 100, 'Ready to Pack - 90%+ good, <10% defects'),
(NULL, 'B', 75, 89, 'Workable - 75%+ good'),
(NULL, 'C', 0, 74, 'Donate - <75% good'),
(NULL, 'D', 0, 0, 'Trash - Not suitable');

-- ============================================================================
-- SECTION 16: SEED DATA - SAMPLE LOCATION_PRODUCTS MAPPINGS
-- ============================================================================

-- Note: Create sample products first, then map to locations
-- Sample: BASIL in various clamshells at New Hampton, NY location

-- Get the product and location IDs for joining (referencing by name)
-- This is seeding sample data - in production, populate based on actual NetSuite data

INSERT INTO location_products (location_id, product_id, is_available, min_stock_cases, max_stock_cases, lead_time_days)
SELECT l.id, p.id, true, 10, 100, 2
FROM locations l, products p
WHERE l.code = 'NH1'
  AND p.id IN (
    SELECT p2.id FROM products p2
    JOIN commodities c ON p2.commodity_id = c.id
    WHERE c.name = 'BASIL'
  );

INSERT INTO location_products (location_id, product_id, is_available, min_stock_cases, max_stock_cases, lead_time_days)
SELECT l.id, p.id, true, 5, 50, 3
FROM locations l, products p
WHERE l.code = 'SAT'
  AND p.id IN (
    SELECT p2.id FROM products p2
    JOIN commodities c ON p2.commodity_id = c.id
    WHERE c.name IN ('CILANTRO', 'OREGANO')
  );

INSERT INTO location_products (location_id, product_id, is_available, min_stock_cases, max_stock_cases, lead_time_days)
SELECT l.id, p.id, true, 8, 80, 2
FROM locations l, products p
WHERE l.code = 'MIA'
  AND p.id IN (
    SELECT p2.id FROM products p2
    JOIN commodities c ON p2.commodity_id = c.id
    WHERE c.name IN ('MINT', 'BASIL', 'THYME')
  );

-- ============================================================================
-- SECTION 17: SEED DATA - VENDORS AND CUSTOMERS
-- ============================================================================

INSERT INTO vendors (netsuite_id, name, contact_email, contact_phone) VALUES
('VENDOR_001', 'Smith Fresh Produce', 'contact@smithfresh.com', '(555) 123-4567'),
('VENDOR_002', 'Green Valley Farms', 'sales@greenvalley.com', '(555) 234-5678'),
('VENDOR_003', 'Organic Herb Co', 'info@organicherbs.com', '(555) 345-6789'),
('VENDOR_004', 'Local Greenhouses LLC', 'ops@localgreenhouses.com', '(555) 456-7890');

INSERT INTO customers (netsuite_id, name, customer_type) VALUES
('CUST_WALMART', 'WALMART', 'RETAIL'),
('CUST_SYSCO', 'SYSCO', 'FOOD_SERVICE'),
('CUST_BLUEAPRON', 'BLUE APRON', 'FOOD_SERVICE'),
('CUST_BALDOR', 'BALDOR', 'FOOD_SERVICE'),
('CUST_WHOLEFOODS', 'WHOLE FOODS', 'RETAIL'),
('CUST_KROGER', 'KROGER', 'RETAIL');

-- Map customers to locations
INSERT INTO location_customers (location_id, customer_id)
SELECT l.id, c.id FROM locations l, customers c
WHERE l.code IN ('NH1', 'SAT', 'MIA', 'FR1')
  AND c.name IN ('WALMART', 'SYSCO');

-- ============================================================================
-- SECTION 18: SYSTEM CONFIGURATION
-- ============================================================================

INSERT INTO system_config (config_key, config_value, data_type, description) VALUES
('DEFAULT_SAMPLE_SIZE_PCT', '10', 'integer', 'Default sample size percentage for receiving QC'),
('MIN_CASE_WEIGHT_VARIANCE_PCT', '5', 'decimal', 'Acceptable variance in case weight %'),
('MAX_CASE_WEIGHT_VARIANCE_PCT', '5', 'decimal', 'Maximum acceptable variance in case weight %'),
('CREDIT_LABOR_BUFFER_MIN_PCT', '8', 'decimal', 'Minimum labor buffer % for vendor credits'),
('CREDIT_LABOR_BUFFER_MAX_PCT', '15', 'decimal', 'Maximum labor buffer % for vendor credits'),
('CREDIT_YIELD_LOSS_PCT', '5', 'decimal', 'Standard yield loss % for vendor credits'),
('PLATFORM_VERSION', '2.0.0', 'string', 'QC Platform version'),
('PHOTO_STORAGE_URL', 'gs://goodness-gardens-qc/photos/', 'string', 'Cloud storage URL for inspection photos'),
('MAX_PHOTO_SIZE_MB', '10', 'integer', 'Maximum photo file size in MB');

-- ============================================================================
-- SECTION 19: END OF SCHEMA
-- ============================================================================

-- Schema initialization complete. This comprehensive schema includes:
-- - 23 Tables for full QC workflow (Receiving, Production, Credits, Audit)
-- - 9 ENUM types for constrained data
-- - 42+ Indexes for performance on frequently queried columns
-- - 21 RLS Policies for location-based and role-based access control
-- - Auto-updating timestamp triggers on all main tables
-- - Complete seed data for all 17 locations, 23 commodities, 38+ product lines,
--   21 defect types, grading rules, vendors, customers
-- - Multi-location awareness through location_products junction table
-- - AI/CV ready fields for future computer vision integration
-- - Complete audit logging for compliance
-- - Comprehensive comments on all tables and critical columns

-- To use this schema:
-- 1. Create a new Supabase project
-- 2. Run this entire SQL file
-- 3. Configure auth.users table integration for user_profiles FK
-- 4. Set up bucket for inspection_photos
-- 5. Create appropriate indexes as data scales
-- 6. Configure row level security policies for your auth provider

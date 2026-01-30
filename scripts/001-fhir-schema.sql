-- FHIR R4 Dutch ZIB Schema for MEDrecord
-- Multi-tenant FHIR resource storage with Row Level Security

-- =============================================================================
-- ENUMS
-- =============================================================================

CREATE TYPE user_role AS ENUM (
  'super_admin',
  'tenant_admin', 
  'practitioner',
  'patient',
  'researcher',
  'dev'
);

CREATE TYPE fhir_resource_type AS ENUM (
  'Patient',
  'Practitioner',
  'Organization',
  'Observation',
  'Condition',
  'AllergyIntolerance',
  'MedicationRequest',
  'MedicationStatement',
  'Procedure',
  'Encounter',
  'Consent',
  'DocumentReference'
);

-- =============================================================================
-- CORE TABLES
-- =============================================================================

-- Tenants table (multi-tenancy)
CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- User mappings (links gateway users to FHIR resources)
CREATE TABLE user_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  gateway_user_id TEXT NOT NULL,
  role user_role NOT NULL,
  patient_id UUID,
  practitioner_id UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(tenant_id, gateway_user_id)
);

-- =============================================================================
-- FHIR RESOURCE TABLES (Dutch ZIB R4)
-- =============================================================================

-- Patients (nl-core-Patient)
CREATE TABLE patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  resource_id TEXT NOT NULL,
  version_id INTEGER DEFAULT 1,
  
  -- Indexed search fields (nl-core-Patient)
  bsn_hash TEXT,                    -- Hashed Dutch BSN for search (never store plaintext)
  family_name TEXT,
  given_name TEXT,
  birth_date DATE,
  gender TEXT,
  deceased_boolean BOOLEAN DEFAULT false,
  deceased_datetime TIMESTAMPTZ,
  active BOOLEAN DEFAULT true,
  
  -- Full FHIR R4 resource
  resource JSONB NOT NULL,
  
  -- Metadata
  last_updated TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(tenant_id, resource_id)
);

-- Practitioners (nl-core-HealthProfessional)
CREATE TABLE practitioners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  resource_id TEXT NOT NULL,
  version_id INTEGER DEFAULT 1,
  
  -- Indexed search fields
  agb_code TEXT,                    -- Dutch AGB code
  big_code TEXT,                    -- Dutch BIG registration
  family_name TEXT,
  given_name TEXT,
  specialty_code TEXT,
  active BOOLEAN DEFAULT true,
  
  -- Full FHIR R4 resource
  resource JSONB NOT NULL,
  
  -- Metadata
  last_updated TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(tenant_id, resource_id)
);

-- Organizations (nl-core-HealthcareProvider)
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  resource_id TEXT NOT NULL,
  version_id INTEGER DEFAULT 1,
  
  -- Indexed search fields
  ura_code TEXT,                    -- Dutch URA code
  agb_code TEXT,                    -- Organization AGB
  name TEXT,
  type_code TEXT,
  active BOOLEAN DEFAULT true,
  
  -- Full FHIR R4 resource
  resource JSONB NOT NULL,
  
  -- Metadata
  last_updated TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(tenant_id, resource_id)
);

-- Observations (nl-core vitals: BloodPressure, BodyWeight, BodyHeight, LabResults)
CREATE TABLE observations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  resource_id TEXT NOT NULL,
  version_id INTEGER DEFAULT 1,
  
  -- References
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  practitioner_id UUID REFERENCES practitioners(id),
  encounter_id UUID,
  
  -- Indexed search fields
  code_system TEXT,                 -- e.g., 'http://loinc.org'
  code_code TEXT,                   -- e.g., '85354-9' (blood pressure)
  code_display TEXT,
  category TEXT,                    -- vital-signs, laboratory, etc.
  status TEXT NOT NULL,             -- registered, preliminary, final, amended
  effective_datetime TIMESTAMPTZ,
  effective_period_start TIMESTAMPTZ,
  effective_period_end TIMESTAMPTZ,
  
  -- Value fields for common queries
  value_quantity_value DECIMAL,
  value_quantity_unit TEXT,
  value_string TEXT,
  value_codeable_concept_code TEXT,
  
  -- Full FHIR R4 resource
  resource JSONB NOT NULL,
  
  -- Metadata
  last_updated TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(tenant_id, resource_id)
);

-- Conditions (nl-core-Problem)
CREATE TABLE conditions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  resource_id TEXT NOT NULL,
  version_id INTEGER DEFAULT 1,
  
  -- References
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  practitioner_id UUID REFERENCES practitioners(id),
  encounter_id UUID,
  
  -- Indexed search fields
  code_system TEXT,                 -- e.g., 'http://snomed.info/sct'
  code_code TEXT,                   -- SNOMED CT code
  code_display TEXT,
  clinical_status TEXT,             -- active, recurrence, relapse, inactive, remission, resolved
  verification_status TEXT,         -- unconfirmed, provisional, differential, confirmed, refuted
  category TEXT,                    -- problem-list-item, encounter-diagnosis
  severity_code TEXT,
  onset_datetime TIMESTAMPTZ,
  onset_string TEXT,
  abatement_datetime TIMESTAMPTZ,
  recorded_date TIMESTAMPTZ,
  
  -- Full FHIR R4 resource
  resource JSONB NOT NULL,
  
  -- Metadata
  last_updated TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(tenant_id, resource_id)
);

-- Allergy Intolerance (nl-core-AllergyIntolerance)
CREATE TABLE allergy_intolerances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  resource_id TEXT NOT NULL,
  version_id INTEGER DEFAULT 1,
  
  -- References
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  practitioner_id UUID REFERENCES practitioners(id),
  
  -- Indexed search fields
  code_system TEXT,
  code_code TEXT,
  code_display TEXT,
  clinical_status TEXT,             -- active, inactive, resolved
  verification_status TEXT,         -- unconfirmed, confirmed, refuted, entered-in-error
  type TEXT,                        -- allergy, intolerance
  category TEXT[],                  -- food, medication, environment, biologic
  criticality TEXT,                 -- low, high, unable-to-assess
  onset_datetime TIMESTAMPTZ,
  recorded_date TIMESTAMPTZ,
  
  -- Full FHIR R4 resource
  resource JSONB NOT NULL,
  
  -- Metadata
  last_updated TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(tenant_id, resource_id)
);

-- Medication Requests (nl-core-MedicationAgreement)
CREATE TABLE medication_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  resource_id TEXT NOT NULL,
  version_id INTEGER DEFAULT 1,
  
  -- References
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  practitioner_id UUID REFERENCES practitioners(id),
  encounter_id UUID,
  
  -- Indexed search fields
  medication_code_system TEXT,
  medication_code_code TEXT,        -- e.g., G-Standaard PRK
  medication_code_display TEXT,
  status TEXT NOT NULL,             -- active, on-hold, cancelled, completed, entered-in-error, stopped, draft, unknown
  intent TEXT NOT NULL,             -- proposal, plan, order, original-order, reflex-order, filler-order, instance-order, option
  category_code TEXT,
  authored_on TIMESTAMPTZ,
  
  -- Full FHIR R4 resource
  resource JSONB NOT NULL,
  
  -- Metadata
  last_updated TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(tenant_id, resource_id)
);

-- Encounters (nl-core-Encounter / Contact)
CREATE TABLE encounters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  resource_id TEXT NOT NULL,
  version_id INTEGER DEFAULT 1,
  
  -- References
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  practitioner_id UUID REFERENCES practitioners(id),
  organization_id UUID REFERENCES organizations(id),
  
  -- Indexed search fields
  status TEXT NOT NULL,             -- planned, arrived, triaged, in-progress, onleave, finished, cancelled
  class_code TEXT,                  -- AMB, IMP, EMER, etc.
  type_code TEXT,
  service_type_code TEXT,
  period_start TIMESTAMPTZ,
  period_end TIMESTAMPTZ,
  
  -- Full FHIR R4 resource
  resource JSONB NOT NULL,
  
  -- Metadata
  last_updated TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(tenant_id, resource_id)
);

-- Care relationships (for practitioner-patient access control)
CREATE TABLE care_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  practitioner_id UUID NOT NULL REFERENCES practitioners(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id),
  relationship_type TEXT,           -- treating, referring, consulting
  start_date DATE NOT NULL,
  end_date DATE,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(tenant_id, patient_id, practitioner_id)
);

-- Audit log for FHIR operations (EHDS compliance)
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Who
  gateway_user_id TEXT NOT NULL,
  user_role user_role NOT NULL,
  
  -- What
  action TEXT NOT NULL,             -- create, read, update, delete, search
  resource_type fhir_resource_type NOT NULL,
  resource_id TEXT,
  
  -- When/Where
  timestamp TIMESTAMPTZ DEFAULT now(),
  ip_address INET,
  user_agent TEXT,
  
  -- Details
  request_url TEXT,
  request_method TEXT,
  response_status INTEGER,
  query_parameters JSONB,
  
  -- Outcome
  outcome TEXT,                     -- success, minor-failure, serious-failure, major-failure
  outcome_description TEXT
);

-- =============================================================================
-- INDEXES
-- =============================================================================

-- Patient indexes
CREATE INDEX idx_patients_tenant ON patients(tenant_id);
CREATE INDEX idx_patients_bsn ON patients(tenant_id, bsn_hash);
CREATE INDEX idx_patients_name ON patients(tenant_id, family_name, given_name);
CREATE INDEX idx_patients_birthdate ON patients(tenant_id, birth_date);
CREATE INDEX idx_patients_resource_gin ON patients USING GIN (resource);

-- Practitioner indexes
CREATE INDEX idx_practitioners_tenant ON practitioners(tenant_id);
CREATE INDEX idx_practitioners_agb ON practitioners(tenant_id, agb_code);
CREATE INDEX idx_practitioners_big ON practitioners(tenant_id, big_code);
CREATE INDEX idx_practitioners_name ON practitioners(tenant_id, family_name, given_name);

-- Organization indexes
CREATE INDEX idx_organizations_tenant ON organizations(tenant_id);
CREATE INDEX idx_organizations_ura ON organizations(tenant_id, ura_code);
CREATE INDEX idx_organizations_name ON organizations(tenant_id, name);

-- Observation indexes
CREATE INDEX idx_observations_tenant ON observations(tenant_id);
CREATE INDEX idx_observations_patient ON observations(tenant_id, patient_id);
CREATE INDEX idx_observations_code ON observations(tenant_id, code_code);
CREATE INDEX idx_observations_category ON observations(tenant_id, category);
CREATE INDEX idx_observations_effective ON observations(tenant_id, effective_datetime);
CREATE INDEX idx_observations_status ON observations(tenant_id, status);

-- Condition indexes
CREATE INDEX idx_conditions_tenant ON conditions(tenant_id);
CREATE INDEX idx_conditions_patient ON conditions(tenant_id, patient_id);
CREATE INDEX idx_conditions_code ON conditions(tenant_id, code_code);
CREATE INDEX idx_conditions_clinical_status ON conditions(tenant_id, clinical_status);
CREATE INDEX idx_conditions_onset ON conditions(tenant_id, onset_datetime);

-- Allergy indexes
CREATE INDEX idx_allergies_tenant ON allergy_intolerances(tenant_id);
CREATE INDEX idx_allergies_patient ON allergy_intolerances(tenant_id, patient_id);
CREATE INDEX idx_allergies_code ON allergy_intolerances(tenant_id, code_code);
CREATE INDEX idx_allergies_status ON allergy_intolerances(tenant_id, clinical_status);

-- Medication request indexes
CREATE INDEX idx_medrequests_tenant ON medication_requests(tenant_id);
CREATE INDEX idx_medrequests_patient ON medication_requests(tenant_id, patient_id);
CREATE INDEX idx_medrequests_code ON medication_requests(tenant_id, medication_code_code);
CREATE INDEX idx_medrequests_status ON medication_requests(tenant_id, status);
CREATE INDEX idx_medrequests_authored ON medication_requests(tenant_id, authored_on);

-- Encounter indexes
CREATE INDEX idx_encounters_tenant ON encounters(tenant_id);
CREATE INDEX idx_encounters_patient ON encounters(tenant_id, patient_id);
CREATE INDEX idx_encounters_status ON encounters(tenant_id, status);
CREATE INDEX idx_encounters_period ON encounters(tenant_id, period_start, period_end);
CREATE INDEX idx_encounters_class ON encounters(tenant_id, class_code);

-- Care relationship indexes
CREATE INDEX idx_care_rel_tenant ON care_relationships(tenant_id);
CREATE INDEX idx_care_rel_patient ON care_relationships(patient_id);
CREATE INDEX idx_care_rel_practitioner ON care_relationships(practitioner_id);
CREATE INDEX idx_care_rel_active ON care_relationships(tenant_id, active);

-- Audit log indexes
CREATE INDEX idx_audit_tenant ON audit_logs(tenant_id);
CREATE INDEX idx_audit_user ON audit_logs(gateway_user_id);
CREATE INDEX idx_audit_timestamp ON audit_logs(timestamp);
CREATE INDEX idx_audit_resource ON audit_logs(resource_type, resource_id);

-- User mapping indexes
CREATE INDEX idx_user_mappings_gateway ON user_mappings(gateway_user_id);
CREATE INDEX idx_user_mappings_patient ON user_mappings(patient_id);
CREATE INDEX idx_user_mappings_practitioner ON user_mappings(practitioner_id);

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE practitioners ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE observations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conditions ENABLE ROW LEVEL SECURITY;
ALTER TABLE allergy_intolerances ENABLE ROW LEVEL SECURITY;
ALTER TABLE medication_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE encounters ENABLE ROW LEVEL SECURITY;
ALTER TABLE care_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- RLS HELPER FUNCTIONS
-- =============================================================================

-- Get current tenant from request context
CREATE OR REPLACE FUNCTION current_tenant_id() RETURNS UUID AS $$
  SELECT COALESCE(
    NULLIF(current_setting('app.tenant_id', true), '')::UUID,
    '00000000-0000-0000-0000-000000000000'::UUID
  );
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- Get current user role from request context
CREATE OR REPLACE FUNCTION current_user_role() RETURNS TEXT AS $$
  SELECT COALESCE(NULLIF(current_setting('app.user_role', true), ''), 'anonymous');
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- Get current gateway user ID from request context
CREATE OR REPLACE FUNCTION current_gateway_user_id() RETURNS TEXT AS $$
  SELECT COALESCE(NULLIF(current_setting('app.gateway_user_id', true), ''), '');
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- Get patient ID for current user (if role is patient)
CREATE OR REPLACE FUNCTION current_user_patient_id() RETURNS UUID AS $$
  SELECT patient_id FROM user_mappings 
  WHERE gateway_user_id = current_gateway_user_id() 
  AND tenant_id = current_tenant_id()
  LIMIT 1;
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- Get practitioner ID for current user (if role is practitioner)
CREATE OR REPLACE FUNCTION current_user_practitioner_id() RETURNS UUID AS $$
  SELECT practitioner_id FROM user_mappings 
  WHERE gateway_user_id = current_gateway_user_id() 
  AND tenant_id = current_tenant_id()
  LIMIT 1;
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- Check if practitioner has care relationship with patient
CREATE OR REPLACE FUNCTION has_care_relationship(p_patient_id UUID) RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM care_relationships 
    WHERE patient_id = p_patient_id 
    AND practitioner_id = current_user_practitioner_id()
    AND tenant_id = current_tenant_id()
    AND active = true
    AND (end_date IS NULL OR end_date >= CURRENT_DATE)
  );
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- =============================================================================
-- RLS POLICIES - PATIENTS
-- =============================================================================

-- Super admin: all tenants
CREATE POLICY patients_super_admin ON patients
  FOR ALL USING (current_user_role() = 'super_admin');

-- Tenant admin: own tenant only
CREATE POLICY patients_tenant_admin ON patients
  FOR ALL USING (
    current_user_role() = 'tenant_admin' 
    AND tenant_id = current_tenant_id()
  );

-- Practitioner: patients in care relationship
CREATE POLICY patients_practitioner_select ON patients
  FOR SELECT USING (
    current_user_role() = 'practitioner'
    AND tenant_id = current_tenant_id()
    AND has_care_relationship(id)
  );

-- Patient: own record only
CREATE POLICY patients_self_access ON patients
  FOR SELECT USING (
    current_user_role() = 'patient'
    AND tenant_id = current_tenant_id()
    AND id = current_user_patient_id()
  );

-- Researcher: read-only, own tenant
CREATE POLICY patients_researcher ON patients
  FOR SELECT USING (
    current_user_role() = 'researcher'
    AND tenant_id = current_tenant_id()
  );

-- Dev: read-only, own tenant
CREATE POLICY patients_dev ON patients
  FOR SELECT USING (
    current_user_role() = 'dev'
    AND tenant_id = current_tenant_id()
  );

-- =============================================================================
-- RLS POLICIES - OBSERVATIONS (and other patient-linked resources)
-- =============================================================================

-- Super admin
CREATE POLICY observations_super_admin ON observations
  FOR ALL USING (current_user_role() = 'super_admin');

-- Tenant admin
CREATE POLICY observations_tenant_admin ON observations
  FOR ALL USING (
    current_user_role() = 'tenant_admin'
    AND tenant_id = current_tenant_id()
  );

-- Practitioner: patients in care relationship
CREATE POLICY observations_practitioner ON observations
  FOR ALL USING (
    current_user_role() = 'practitioner'
    AND tenant_id = current_tenant_id()
    AND has_care_relationship(patient_id)
  );

-- Patient: own data only
CREATE POLICY observations_patient ON observations
  FOR SELECT USING (
    current_user_role() = 'patient'
    AND tenant_id = current_tenant_id()
    AND patient_id = current_user_patient_id()
  );

-- Researcher
CREATE POLICY observations_researcher ON observations
  FOR SELECT USING (
    current_user_role() = 'researcher'
    AND tenant_id = current_tenant_id()
  );

-- Dev
CREATE POLICY observations_dev ON observations
  FOR SELECT USING (
    current_user_role() = 'dev'
    AND tenant_id = current_tenant_id()
  );

-- =============================================================================
-- RLS POLICIES - CONDITIONS
-- =============================================================================

CREATE POLICY conditions_super_admin ON conditions
  FOR ALL USING (current_user_role() = 'super_admin');

CREATE POLICY conditions_tenant_admin ON conditions
  FOR ALL USING (
    current_user_role() = 'tenant_admin'
    AND tenant_id = current_tenant_id()
  );

CREATE POLICY conditions_practitioner ON conditions
  FOR ALL USING (
    current_user_role() = 'practitioner'
    AND tenant_id = current_tenant_id()
    AND has_care_relationship(patient_id)
  );

CREATE POLICY conditions_patient ON conditions
  FOR SELECT USING (
    current_user_role() = 'patient'
    AND tenant_id = current_tenant_id()
    AND patient_id = current_user_patient_id()
  );

CREATE POLICY conditions_researcher ON conditions
  FOR SELECT USING (
    current_user_role() = 'researcher'
    AND tenant_id = current_tenant_id()
  );

CREATE POLICY conditions_dev ON conditions
  FOR SELECT USING (
    current_user_role() = 'dev'
    AND tenant_id = current_tenant_id()
  );

-- =============================================================================
-- RLS POLICIES - ALLERGY INTOLERANCES
-- =============================================================================

CREATE POLICY allergies_super_admin ON allergy_intolerances
  FOR ALL USING (current_user_role() = 'super_admin');

CREATE POLICY allergies_tenant_admin ON allergy_intolerances
  FOR ALL USING (
    current_user_role() = 'tenant_admin'
    AND tenant_id = current_tenant_id()
  );

CREATE POLICY allergies_practitioner ON allergy_intolerances
  FOR ALL USING (
    current_user_role() = 'practitioner'
    AND tenant_id = current_tenant_id()
    AND has_care_relationship(patient_id)
  );

CREATE POLICY allergies_patient ON allergy_intolerances
  FOR SELECT USING (
    current_user_role() = 'patient'
    AND tenant_id = current_tenant_id()
    AND patient_id = current_user_patient_id()
  );

CREATE POLICY allergies_researcher ON allergy_intolerances
  FOR SELECT USING (
    current_user_role() = 'researcher'
    AND tenant_id = current_tenant_id()
  );

CREATE POLICY allergies_dev ON allergy_intolerances
  FOR SELECT USING (
    current_user_role() = 'dev'
    AND tenant_id = current_tenant_id()
  );

-- =============================================================================
-- RLS POLICIES - MEDICATION REQUESTS
-- =============================================================================

CREATE POLICY medrequests_super_admin ON medication_requests
  FOR ALL USING (current_user_role() = 'super_admin');

CREATE POLICY medrequests_tenant_admin ON medication_requests
  FOR ALL USING (
    current_user_role() = 'tenant_admin'
    AND tenant_id = current_tenant_id()
  );

CREATE POLICY medrequests_practitioner ON medication_requests
  FOR ALL USING (
    current_user_role() = 'practitioner'
    AND tenant_id = current_tenant_id()
    AND has_care_relationship(patient_id)
  );

CREATE POLICY medrequests_patient ON medication_requests
  FOR SELECT USING (
    current_user_role() = 'patient'
    AND tenant_id = current_tenant_id()
    AND patient_id = current_user_patient_id()
  );

CREATE POLICY medrequests_researcher ON medication_requests
  FOR SELECT USING (
    current_user_role() = 'researcher'
    AND tenant_id = current_tenant_id()
  );

CREATE POLICY medrequests_dev ON medication_requests
  FOR SELECT USING (
    current_user_role() = 'dev'
    AND tenant_id = current_tenant_id()
  );

-- =============================================================================
-- RLS POLICIES - ENCOUNTERS
-- =============================================================================

CREATE POLICY encounters_super_admin ON encounters
  FOR ALL USING (current_user_role() = 'super_admin');

CREATE POLICY encounters_tenant_admin ON encounters
  FOR ALL USING (
    current_user_role() = 'tenant_admin'
    AND tenant_id = current_tenant_id()
  );

CREATE POLICY encounters_practitioner ON encounters
  FOR ALL USING (
    current_user_role() = 'practitioner'
    AND tenant_id = current_tenant_id()
    AND has_care_relationship(patient_id)
  );

CREATE POLICY encounters_patient ON encounters
  FOR SELECT USING (
    current_user_role() = 'patient'
    AND tenant_id = current_tenant_id()
    AND patient_id = current_user_patient_id()
  );

CREATE POLICY encounters_researcher ON encounters
  FOR SELECT USING (
    current_user_role() = 'researcher'
    AND tenant_id = current_tenant_id()
  );

CREATE POLICY encounters_dev ON encounters
  FOR SELECT USING (
    current_user_role() = 'dev'
    AND tenant_id = current_tenant_id()
  );

-- =============================================================================
-- RLS POLICIES - PRACTITIONERS (generally readable)
-- =============================================================================

CREATE POLICY practitioners_super_admin ON practitioners
  FOR ALL USING (current_user_role() = 'super_admin');

CREATE POLICY practitioners_tenant_admin ON practitioners
  FOR ALL USING (
    current_user_role() = 'tenant_admin'
    AND tenant_id = current_tenant_id()
  );

-- All authenticated users in tenant can read practitioners
CREATE POLICY practitioners_read ON practitioners
  FOR SELECT USING (
    current_user_role() IN ('practitioner', 'patient', 'researcher', 'dev')
    AND tenant_id = current_tenant_id()
  );

-- =============================================================================
-- RLS POLICIES - ORGANIZATIONS (generally readable)
-- =============================================================================

CREATE POLICY organizations_super_admin ON organizations
  FOR ALL USING (current_user_role() = 'super_admin');

CREATE POLICY organizations_tenant_admin ON organizations
  FOR ALL USING (
    current_user_role() = 'tenant_admin'
    AND tenant_id = current_tenant_id()
  );

CREATE POLICY organizations_read ON organizations
  FOR SELECT USING (
    current_user_role() IN ('practitioner', 'patient', 'researcher', 'dev')
    AND tenant_id = current_tenant_id()
  );

-- =============================================================================
-- RLS POLICIES - CARE RELATIONSHIPS
-- =============================================================================

CREATE POLICY care_rel_super_admin ON care_relationships
  FOR ALL USING (current_user_role() = 'super_admin');

CREATE POLICY care_rel_tenant_admin ON care_relationships
  FOR ALL USING (
    current_user_role() = 'tenant_admin'
    AND tenant_id = current_tenant_id()
  );

CREATE POLICY care_rel_practitioner ON care_relationships
  FOR SELECT USING (
    current_user_role() = 'practitioner'
    AND tenant_id = current_tenant_id()
    AND practitioner_id = current_user_practitioner_id()
  );

CREATE POLICY care_rel_patient ON care_relationships
  FOR SELECT USING (
    current_user_role() = 'patient'
    AND tenant_id = current_tenant_id()
    AND patient_id = current_user_patient_id()
  );

-- =============================================================================
-- RLS POLICIES - AUDIT LOGS
-- =============================================================================

CREATE POLICY audit_super_admin ON audit_logs
  FOR ALL USING (current_user_role() = 'super_admin');

CREATE POLICY audit_tenant_admin ON audit_logs
  FOR SELECT USING (
    current_user_role() = 'tenant_admin'
    AND tenant_id = current_tenant_id()
  );

-- =============================================================================
-- RLS POLICIES - USER MAPPINGS
-- =============================================================================

CREATE POLICY user_mappings_super_admin ON user_mappings
  FOR ALL USING (current_user_role() = 'super_admin');

CREATE POLICY user_mappings_tenant_admin ON user_mappings
  FOR ALL USING (
    current_user_role() = 'tenant_admin'
    AND tenant_id = current_tenant_id()
  );

-- Users can read their own mapping
CREATE POLICY user_mappings_self ON user_mappings
  FOR SELECT USING (gateway_user_id = current_gateway_user_id());

-- =============================================================================
-- RLS POLICIES - TENANTS
-- =============================================================================

CREATE POLICY tenants_super_admin ON tenants
  FOR ALL USING (current_user_role() = 'super_admin');

CREATE POLICY tenants_read ON tenants
  FOR SELECT USING (id = current_tenant_id());

-- =============================================================================
-- UPDATED_AT TRIGGER
-- =============================================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER patients_updated_at BEFORE UPDATE ON patients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER practitioners_updated_at BEFORE UPDATE ON practitioners
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER organizations_updated_at BEFORE UPDATE ON organizations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER observations_updated_at BEFORE UPDATE ON observations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER conditions_updated_at BEFORE UPDATE ON conditions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER allergy_intolerances_updated_at BEFORE UPDATE ON allergy_intolerances
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER medication_requests_updated_at BEFORE UPDATE ON medication_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER encounters_updated_at BEFORE UPDATE ON encounters
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER tenants_updated_at BEFORE UPDATE ON tenants
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER user_mappings_updated_at BEFORE UPDATE ON user_mappings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================================================
-- VERSION HISTORY TRIGGER (FHIR versioning)
-- =============================================================================

CREATE OR REPLACE FUNCTION increment_version_id()
RETURNS TRIGGER AS $$
BEGIN
  NEW.version_id = OLD.version_id + 1;
  NEW.last_updated = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER patients_version BEFORE UPDATE ON patients
  FOR EACH ROW EXECUTE FUNCTION increment_version_id();

CREATE TRIGGER practitioners_version BEFORE UPDATE ON practitioners
  FOR EACH ROW EXECUTE FUNCTION increment_version_id();

CREATE TRIGGER organizations_version BEFORE UPDATE ON organizations
  FOR EACH ROW EXECUTE FUNCTION increment_version_id();

CREATE TRIGGER observations_version BEFORE UPDATE ON observations
  FOR EACH ROW EXECUTE FUNCTION increment_version_id();

CREATE TRIGGER conditions_version BEFORE UPDATE ON conditions
  FOR EACH ROW EXECUTE FUNCTION increment_version_id();

CREATE TRIGGER allergy_intolerances_version BEFORE UPDATE ON allergy_intolerances
  FOR EACH ROW EXECUTE FUNCTION increment_version_id();

CREATE TRIGGER medication_requests_version BEFORE UPDATE ON medication_requests
  FOR EACH ROW EXECUTE FUNCTION increment_version_id();

CREATE TRIGGER encounters_version BEFORE UPDATE ON encounters
  FOR EACH ROW EXECUTE FUNCTION increment_version_id();

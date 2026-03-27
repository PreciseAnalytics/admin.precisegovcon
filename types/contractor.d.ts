// types/contractor.d.ts

export interface Contractor {
  id: string;
  name: string;
  email: string;
  phone?: string;
  business_type?: string;
  registration_date?: string;
  sam_gov_id?: string;
  uei_number?: string;
  cage_code?: string;
  naics_code?: string;
  state?: string;
  contacted?: boolean;
  enrolled?: boolean;
  contact_attempts?: number;
  offer_code?: string;
  notes?: string;
  priority?: string;
  score?: number;
  pipeline_stage?: string;
  trial_start?: string;
  trial_end?: string;
  revenue?: number;
  created_at?: string;
  synced_at?: string;
  last_contact?: string;
  is_test?: boolean;
}

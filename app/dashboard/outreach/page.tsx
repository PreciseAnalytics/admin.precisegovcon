//app/dashboard/outreach/page.tsx


'use client';
export const dynamic = 'force-dynamic';

import { useEffect, useState, useCallback, useRef } from 'react';
import ContractorEditModal from '../../../components/ContractorEditModal';
import { getNAICSByCode } from '../../../lib/naics-codes';
import {
  Mail, Send, Sparkles, Users, TrendingUp, CheckCircle2, Loader2, Clock,
  RefreshCw, Tag, X, Copy, Check, Building2, Calendar, Hash, ExternalLink,
  AlertCircle, ChevronDown, Plus, Trash2, Edit3, Eye, FileText, MapPin,
  Search, SlidersHorizontal, Bell, Target, Award, BarChart3, ShieldCheck,
  ArrowUpRight, DollarSign, RefreshCcw, Phone, CheckSquare, XCircle,
  AlertTriangle, Activity, PieChart, ArrowUp, UserCheck, UserX, UserPlus,
  ListTodo, PhoneCall, PhoneMissed, Reply, GitBranch, Timer,
} from 'lucide-react';



// ──────────────────────────────────────────────────────────────────────────────
// TYPES
// ──────────────────────────────────────────────────────────────────────────────


import type { Contractor } from '../../../types/contractor';

type PipelineStage =
  | 'new' | 'contacted' | 'opened' | 'responded'
  | 'demo' | 'trial' | 'converted' | 'churned' | 'unsubscribed';

type ActivityType =
  | 'email_sent' | 'email_opened' | 'email_replied'
  | 'call_made' | 'call_missed' | 'note_added' | 'stage_changed'
  | 'code_redeemed' | 'signed_up' | 'unsubscribed'
  | 'task_completed' | 'follow_up_scheduled';

type TaskPriority = 'high' | 'medium' | 'low';
type ActiveTab    = 'crm' | 'outreach' | 'opportunities' | 'leadPipeline' | 'templates' | 'offerCodes' | 'sentEmails' | 'testData';
type FilterView   = 'total' | 'contacted' | 'enrolled' | 'inProgress' | 'success';
type OutreachFolder = 'newToday' | 'readyCold' | 'followUpDue' | 'waiting' | 'converted' | 'noEmail' | 'all';

interface CrmActivity {
  id: string;
  contractor_id: string;
  contractor_name?: string;
  type: ActivityType;
  description: string;
  created_at: string;
  created_by?: string;
}

interface EmailLog {
  id: string;
  contractor_id: string;
  contractor_name?: string;
  contractor_email?: string;
  contractor_state?: string;
  contractor_naics?: string;
  contractor_business_type?: string;
  subject: string;
  offer_code?: string;
  campaign_type?: string;
  status: 'pending' | 'sent' | 'failed' | 'opened' | 'clicked' | 'bounced';
  resend_id?: string;
  sent_at: string;
}

interface CrmTask {
  id: string;
  contractor_id: string;
  contractor_name: string;
  title: string;
  due_date: string;
  priority: TaskPriority;
  status: 'pending' | 'done' | 'overdue';
  assignee?: string;
  notes?: string;
  created_at: string;
}

interface OfferCode {
  id: string;
  code: string;
  description: string;
  discount: string;
  type: 'trial' | 'discount' | 'feature';
  usage_count: number;
  max_usage: number | null;
  expires_at: string | null;
  active: boolean;
  created_at: string;
  // Enhanced stats (from withStats=true endpoint)
  templatesLinked?: number;
  contractorsActivated?: number;
  contractorsEnrolled?: number;
  activationRate?: number;
  remaining?: number | null;
  isExpired?: boolean;
  isExhausted?: boolean;
  isAvailable?: boolean;
}

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  offerCode?: string;
  aiGenerated?: boolean;
  category?: 'cold' | 'followup' | 'opportunity' | 'onboarding';
  usageCount?: number;
  tags?: string[];
}

interface Opportunity {
  id: string;
  title: string;
  agency: string;
  naicsCode: string;
  naicsDefinition?: string;
  businessState?: string;
  postedDate: string;
  responseDeadline: string;
  value: string;
  type: string;
  setAside?: string;
  description: string;
  solicitationNumber: string;
  url?: string;
}

interface OutreachStats {
  totalContractors: number;
  contacted: number;
  enrolled: number;
  inProgress: number;
  successRate: number;
}

interface ContractorFilters {
  registrationDateFrom: string;
  registrationDateTo: string;
  naicsCodes: string[];
  states: string[];
  businessTypes: string[];
  naicsInput: string;
}

interface QuickSegments {
  states: string[];
  setAside: string;
  field: string;
  hasEmail: 'all' | 'withEmail' | 'missingEmail';
}

interface CrmSegments {
  states: string[];
  setAside: string;
  field: string;
  companyType: CompanyAudience;
  naicsFilter: string;
  regDateFrom: string;
  regDateTo: string;
  contactedFilter: 'all' | 'contacted' | 'not_contacted';
  enrolledFilter: 'all' | 'enrolled' | 'not_enrolled';
}

interface OpportunitySegments {
  states: string[];
  setAside: string;
  field: string;
  type: string;
}

type CompanyAudience = 'real' | 'test' | 'all';

interface PipelineEntity {
  id: string;
  uei: string;
  legalBusinessName: string;
  registrationDate?: string;
  activationDate?: string;
  registrationStatus?: string;
  naicsCodes?: string[];
  physicalAddress?: any;
  enrichment?: {
    publicEmail?: string;
    publicPhone?: string;
    websiteUrl?: string;
    websiteDomain?: string;
    contactPageUrl?: string;
    linkedinUrl?: string;
    facebookUrl?: string;
    enrichmentStatus?: string;
    enrichmentNotes?: string;
    sourceConfidence?: number;
    emailSource?: string;
    enrichmentMode?: string;
    providersUsed?: string[];
    lastEnrichedAt?: string;
    hasWebsiteSignal?: boolean;
    hasWeakWebsiteHint?: boolean;
    crawlTargetUrl?: string;
  } | null;
  leadScore?: {
    score?: number;
    fitScore?: number;
    contactabilityScore?: number;
    recencyScore?: number;
    reasons?: string[];
  } | null;
}

type PipelineStep = 'ingest' | 'enrich' | 'score' | 'queue';
type PipelineStepState = {
  status: 'running' | 'completed' | 'failed';
  startedAt: string;
  completedAt?: string;
  data?: any;
  error?: string;
};

interface IngestionRunSummary {
  id: string;
  source: string;
  runType: string;
  startedAt: string;
  finishedAt?: string | null;
  status: string;
  requestParams?: any;
  recordsFetched: number;
  recordsInserted: number;
  recordsUpdated: number;
  errorText?: string | null;
}

const PIPELINE_RUN_STATE_STORAGE_KEY = 'precisegovcon.leadPipeline.runState';

function AudienceDropdown({
  label,
  value,
  onChange,
  open,
  setOpen,
  options,
}: {
  label: string;
  value: CompanyAudience;
  onChange: (value: CompanyAudience) => void;
  open: boolean;
  setOpen: (open: boolean) => void;
  options: Array<{ value: CompanyAudience; label: string; buttonClass: string; menuClass: string }>;
}) {
  const active = options.find(option => option.value === value) || options[0];

  return (
    <div className="relative">
      <label className="block text-[11px] font-black uppercase tracking-wide text-slate-500 mb-1">{label}</label>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`min-w-[220px] flex items-center justify-between gap-3 px-4 py-3 rounded-xl text-sm font-black border-2 ${active.buttonClass}`}
      >
        <span>{active.label}</span>
        <ChevronDown className={`w-4 h-4 transition ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute left-0 top-full z-30 mt-2 w-full rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">
          {options.map(option => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                onChange(option.value);
                setOpen(false);
              }}
              className={`w-full text-left px-4 py-3 rounded-xl text-sm font-black transition ${option.menuClass}`}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// CONFIG
// ──────────────────────────────────────────────────────────────────────────────

const STAGES: Record<PipelineStage, { label: string; color: string; bg: string; border: string; icon: any }> = {
  new:          { label: 'New',        color: 'text-white',   bg: 'bg-slate-700',   border: 'border-slate-700',   icon: UserPlus },
  contacted:    { label: 'Contacted',  color: 'text-white',    bg: 'bg-blue-600',    border: 'border-blue-600',    icon: Mail },
  opened:       { label: 'Opened',     color: 'text-white',  bg: 'bg-indigo-600',  border: 'border-indigo-600',  icon: Eye },
  responded:    { label: 'Responded',  color: 'text-white',  bg: 'bg-violet-600',  border: 'border-violet-600',  icon: Reply },
  demo:         { label: 'Demo',       color: 'text-white',   bg: 'bg-amber-600',   border: 'border-amber-600',   icon: PhoneCall },
  trial:        { label: 'Trial',      color: 'text-white',  bg: 'bg-orange-600',  border: 'border-orange-600',  icon: Timer },
  converted:    { label: 'Converted',  color: 'text-white', bg: 'bg-emerald-600', border: 'border-emerald-600', icon: CheckCircle2 },
  churned:      { label: 'Churned',    color: 'text-white',     bg: 'bg-red-600',     border: 'border-red-600',     icon: UserX },
  unsubscribed: { label: "Unsub'd",    color: 'text-white',    bg: 'bg-gray-600',    border: 'border-gray-600',    icon: XCircle },
};

const ACT_CFG: Record<ActivityType, { icon: any; color: string; label: string }> = {
  email_sent:          { icon: Send,        color: 'text-blue-500',    label: 'Email Sent' },
  email_opened:        { icon: Eye,         color: 'text-indigo-500',  label: 'Email Opened' },
  email_replied:       { icon: Reply,       color: 'text-violet-500',  label: 'Replied' },
  call_made:           { icon: PhoneCall,   color: 'text-green-500',   label: 'Call Made' },
  call_missed:         { icon: PhoneMissed, color: 'text-red-400',     label: 'Call Missed' },
  note_added:          { icon: FileText,    color: 'text-slate-500',   label: 'Note Added' },
  stage_changed:       { icon: GitBranch,   color: 'text-amber-500',   label: 'Stage Changed' },
  code_redeemed:       { icon: Tag,         color: 'text-orange-500',  label: 'Code Redeemed' },
  signed_up:           { icon: UserCheck,   color: 'text-emerald-500', label: 'Signed Up' },
  unsubscribed:        { icon: UserX,       color: 'text-red-500',     label: 'Unsubscribed' },
  task_completed:      { icon: CheckSquare, color: 'text-teal-500',    label: 'Task Completed' },
  follow_up_scheduled: { icon: Calendar,    color: 'text-cyan-500',    label: 'Follow-Up Scheduled' },
};

const PILL_CONFIG = {
  total:     { sublabel: 'Contractors found',  icon: Users,        activeBg: 'bg-slate-800',   activeText: 'text-white', activeIconBg: 'bg-slate-600',   activeBorder: 'border-slate-600',   inactiveHover: 'hover:border-slate-400',   sectionBg: 'bg-slate-50',   sectionBorder: 'border-slate-200',   sectionTitle: 'text-slate-800' },
  contacted: { sublabel: 'Outreach sent',       icon: Mail,         activeBg: 'bg-blue-600',    activeText: 'text-white', activeIconBg: 'bg-blue-400',     activeBorder: 'border-blue-500',    inactiveHover: 'hover:border-blue-300',    sectionBg: 'bg-blue-50',    sectionBorder: 'border-blue-200',    sectionTitle: 'text-blue-800' },
  enrolled:  { sublabel: 'Sign-ups',            icon: CheckCircle2, activeBg: 'bg-emerald-600', activeText: 'text-white', activeIconBg: 'bg-emerald-400',  activeBorder: 'border-emerald-500', inactiveHover: 'hover:border-emerald-300', sectionBg: 'bg-emerald-50', sectionBorder: 'border-emerald-200', sectionTitle: 'text-emerald-800' },
  inProgress:{ sublabel: 'Awaiting response',   icon: Clock,        activeBg: 'bg-amber-500',   activeText: 'text-white', activeIconBg: 'bg-amber-300',    activeBorder: 'border-amber-400',   inactiveHover: 'hover:border-amber-300',   sectionBg: 'bg-amber-50',   sectionBorder: 'border-amber-200',   sectionTitle: 'text-amber-800' },
  success:   { sublabel: 'Conversion',          icon: TrendingUp,   activeBg: 'bg-violet-600',  activeText: 'text-white', activeIconBg: 'bg-violet-400',   activeBorder: 'border-violet-500',  inactiveHover: 'hover:border-violet-300',  sectionBg: 'bg-violet-50',  sectionBorder: 'border-violet-200',  sectionTitle: 'text-violet-800' },
};

// Helper: detect test/fake email addresses
const isTestEmailAddress = (email?: string) => {
  if (!email) return false;
  const e = email.toLowerCase();
  return (
    e.includes('test@') ||
    e.endsWith('@example.com') ||
    e.endsWith('@test.com') ||
    e.endsWith('@contractor.com') ||
    e === 'noemail@none.com' ||
    e.includes('fake@') ||
    e.includes('temp@')
  );
};

const US_STATES = ['AL','AK','AS','AZ','AR','CA','CO','CT','DC','DE','FL','FM','GA','GU','HI','IA','ID','IL','IN','KS','KY','LA','MA','MD','ME','MH','MI','MN','MO','MP','MS','MT','NC','ND','NE','NH','NJ','NM','NV','NY','OH','OK','OR','PA','PR','PW','RI','SC','SD','TN','TX','UM','UT','VA','VI','VT','WA','WI','WV','WY'];
const BIZ_TYPES  = ['Small Business','Woman-Owned','Veteran-Owned','HUBZone','8(a) Certified','Minority-Owned','Service-Disabled Veteran-Owned'];
const COMPANY_AUDIENCE_OPTIONS: Array<{
  value: CompanyAudience;
  label: string;
  shortLabel: string;
  buttonClass: string;
  menuClass: string;
}> = [
  {
    value: 'real',
    label: 'Real Companies Only',
    shortLabel: 'Real Companies',
    buttonClass: 'bg-green-600 text-white border-green-600',
    menuClass: 'bg-green-600 text-white hover:bg-green-700',
  },
  {
    value: 'test',
    label: 'Test Companies Only',
    shortLabel: 'Test Companies',
    buttonClass: 'bg-orange-500 text-white border-orange-500',
    menuClass: 'bg-orange-500 text-white hover:bg-orange-600',
  },
  {
    value: 'all',
    label: 'Real + Test Companies',
    shortLabel: 'Real + Test',
    buttonClass: 'bg-slate-700 text-white border-slate-700',
    menuClass: 'bg-slate-700 text-white hover:bg-slate-800',
  },
];
const NAICS_FIELD_RULES = [
  { match: ['23'], label: 'Construction' },
  { match: ['42', '44', '45'], label: 'Supplies & Distribution' },
  { match: ['48', '49'], label: 'Transportation & Logistics' },
  { match: ['51', '518', '519', '5415'], label: 'Technology' },
  { match: ['52'], label: 'Financial Services' },
  { match: ['54', '5416', '5417'], label: 'Professional Services' },
  { match: ['56', '561', '562'], label: 'Operations & Facilities' },
  { match: ['61'], label: 'Training & Education' },
  { match: ['62'], label: 'Healthcare' },
  { match: ['72'], label: 'Hospitality & Food Services' },
  { match: ['92'], label: 'Public Administration Support' },
];
const SET_ASIDE_OPTIONS = ['all', ...Array.from(new Set([...BIZ_TYPES, 'WOSB', 'SDVOSB', '8(a)', 'Minority-Owned SB']))];

const MOCK_OPPS: Opportunity[] = [
  { id: 'op1', title: 'IT Systems Modernization Support', agency: 'Dept. of Veterans Affairs', naicsCode: '541512', postedDate: '2025-02-14', responseDeadline: '2025-03-15', value: '$2.5M–$5M', type: 'Solicitation', setAside: 'SDVOSB', description: 'VA seeks IT modernization support for legacy system migration to cloud.', solicitationNumber: 'VA-2025-IT-0047', url: 'https://sam.gov' },
  { id: 'op2', title: 'Financial Data Analytics and Reporting', agency: 'Dept. of Treasury', naicsCode: '518210', postedDate: '2025-02-13', responseDeadline: '2025-03-08', value: '$500K–$1M', type: 'Sources Sought', setAside: '8(a)', description: 'Treasury seeks data analytics for financial reporting modernization.', solicitationNumber: 'TREAS-2025-DA-0012', url: 'https://sam.gov' },
  { id: 'op3', title: 'Administrative Support Services', agency: 'GSA Region 3', naicsCode: '561210', postedDate: '2025-02-12', responseDeadline: '2025-02-28', value: '$250K–$750K', type: 'Solicitation', setAside: 'Small Business', description: 'GSA Region 3 seeks admin support for regional offices.', solicitationNumber: 'GSA-R3-2025-AS-0089', url: 'https://sam.gov' },
  { id: 'op4', title: 'Cybersecurity Assessment and Monitoring', agency: 'Dept. of Homeland Security', naicsCode: '541519', postedDate: '2025-02-11', responseDeadline: '2025-03-20', value: '$1M–$3M', type: 'RFP', setAside: 'Minority-Owned SB', description: 'DHS requires cybersecurity assessment and SIEM monitoring services.', solicitationNumber: 'DHS-2025-CISA-0033', url: 'https://sam.gov' },
  { id: 'op5', title: 'Management Consulting — Org Transformation', agency: 'Dept. of Defense', naicsCode: '541611', postedDate: '2025-02-10', responseDeadline: '2025-03-25', value: '$750K–$1M', type: 'RFI', setAside: 'WOSB', description: 'DoD seeks management consulting for organizational redesign.', solicitationNumber: 'DOD-2025-MC-0155', url: 'https://sam.gov' },
];

// ──────────────────────────────────────────────────────────────────────────────
// HELPERS
// ──────────────────────────────────────────────────────────────────────────────

const bizBadge = (t?: string) => ({
  'Woman-Owned': 'bg-pink-600 text-white border border-pink-600',
  'Veteran-Owned': 'bg-blue-600 text-white border border-blue-600',
  'HUBZone': 'bg-emerald-600 text-white border border-emerald-600',
  '8(a) Certified': 'bg-purple-600 text-white border border-purple-600',
  'Small Business': 'bg-slate-700 text-white border border-slate-700',
  'Minority-Owned': 'bg-orange-600 text-white border border-orange-600',
  'Service-Disabled Veteran-Owned': 'bg-indigo-600 text-white border border-indigo-600',
}[t || 'Small Business'] || 'bg-slate-100 text-slate-700 border border-slate-200');

const saBadge = (t?: string) => ({
  'SDVOSB': 'bg-indigo-600 text-white',
  '8(a)': 'bg-purple-600 text-white',
  'WOSB': 'bg-pink-600 text-white',
  'HUBZone': 'bg-emerald-600 text-white',
  'Small Business': 'bg-slate-700 text-white',
  'Minority-Owned SB': 'bg-orange-600 text-white',
}[t || ''] || 'bg-slate-100 text-slate-700');

const scoreBg  = (s: number) => s >= 80 ? 'bg-emerald-600 text-white' : s >= 60 ? 'bg-amber-600 text-white' : 'bg-red-600 text-white';
const scoreClr = (s: number) => s >= 80 ? 'text-emerald-700' : s >= 60 ? 'text-amber-700' : 'text-red-600';
const timeAgo  = (ts: string) => {
  const m = Math.floor((Date.now() - new Date(ts).getTime()) / 60000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
};
const fmtUSD = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(n);
const startOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};
const isNewToday = (c: Contractor) => !!c.created_at && new Date(c.created_at) >= startOfToday();
const daysSince = (ts?: string) => {
  if (!ts) return null;
  return Math.floor((Date.now() - new Date(ts).getTime()) / 86_400_000);
};
const hasEmailAddress = (c: Partial<Contractor>) => !!c.email;
const hasContactMethod = (c: Partial<Contractor>) => !!(c.email || c.phone);
const needsContactEnrichment = (c: Partial<Contractor>) => !hasContactMethod(c);
const getCampaignFolder = (c: Contractor): OutreachFolder => {
  if (c.enrolled || c.pipeline_stage === 'converted') return 'converted';
  if (!hasEmailAddress(c)) return 'noEmail';
  if (isNewToday(c) && !c.contacted) return 'newToday';
  if (!c.contacted) return 'readyCold';
  const gap = daysSince(c.last_contact);
  if (gap !== null && gap >= 5) return 'followUpDue';
  return 'waiting';
};
const folderMeta: Record<OutreachFolder, { label: string; accent: string; tone: string }> = {
  newToday:   { label: 'New Today',     accent: 'bg-emerald-600 text-white', tone: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
  readyCold:  { label: 'Ready for Cold',accent: 'bg-slate-800 text-white',   tone: 'text-slate-700 bg-slate-50 border-slate-200' },
  followUpDue:{ label: 'Follow-Up Due', accent: 'bg-amber-500 text-white',   tone: 'text-amber-700 bg-amber-50 border-amber-200' },
  waiting:    { label: 'Waiting',       accent: 'bg-blue-600 text-white',    tone: 'text-blue-700 bg-blue-50 border-blue-200' },
  converted:  { label: 'Converted',     accent: 'bg-violet-600 text-white',  tone: 'text-violet-700 bg-violet-50 border-violet-200' },
  noEmail:    { label: 'Needs Enrichment', accent: 'bg-rose-600 text-white', tone: 'text-rose-700 bg-rose-50 border-rose-200' },
  all:        { label: 'All Contractors', accent: 'bg-slate-700 text-white', tone: 'text-slate-700 bg-slate-50 border-slate-200' },
};
const isTestLikeContractor = (c: Partial<Contractor>) => {
  const name = (c.name || '').toLowerCase();
  const email = (c.email || '').toLowerCase();
  const samId = (c.sam_gov_id || '').toLowerCase();
  const uei = (c.uei_number || '').toLowerCase();
  return !!c.is_test ||
    name.includes('test contractor') ||
    name.startsWith('test ') ||
    name.includes(' demo ') ||
    email === 'test@contractor.com' ||
    email.endsWith('@example.com') ||
    samId === 'sam-test-uei-123' ||
    uei === 'test-uei-123';
};
const parseSearchTerms = (raw: string) =>
  raw
    .split(/[,\n;]/)
    .map(s => s.trim())
    .filter(Boolean);
const matchesFieldToken = (token: string, fieldMap: Record<string, string>) => {
  const idx = token.indexOf(':');
  if (idx === -1) return null;
  const key = token.slice(0, idx).trim().toLowerCase();
  const value = token.slice(idx + 1).trim().toLowerCase();
  if (!value) return true;
  const hay = (fieldMap[key] || '').toLowerCase();
  return hay.includes(value);
};
const contractorMatchesSearch = (c: Contractor, raw: string) => {
  const terms = parseSearchTerms(raw);
  if (terms.length === 0) return true;
  const fieldMap: Record<string, string> = {
    company: c.name || '',
    name: c.name || '',
    email: c.email || '',
    phone: c.phone || '',
    naics: c.naics_code || '',
    state: c.state || '',
    territory: c.state || '',
    specialty: c.business_type || '',
    setaside: c.business_type || '',
    business: c.business_type || '',
    field: contractorFieldCategory(c),
    uei: c.uei_number || '',
    cage: c.cage_code || '',
  };
  const blob = Object.values(fieldMap).join(' ').toLowerCase();
  return terms.every(term => {
    const fieldMatch = matchesFieldToken(term, fieldMap);
    if (fieldMatch !== null) return fieldMatch;
    return blob.includes(term.toLowerCase());
  });
};
const opportunityMatchesSearch = (o: Opportunity, raw: string) => {
  const terms = parseSearchTerms(raw);
  if (terms.length === 0) return true;
  const fieldMap: Record<string, string> = {
    title: o.title || '',
    agency: o.agency || '',
    naics: o.naicsCode || '',
    state: o.businessState || '',
    territory: o.businessState || '',
    setaside: o.setAside || '',
    field: fieldCategoryForCode(o.naicsCode),
    type: o.type || '',
    specialty: o.naicsDefinition || '',
  };
  const blob = Object.values(fieldMap).join(' ').toLowerCase();
  return terms.every(term => {
    const fieldMatch = matchesFieldToken(term, fieldMap);
    if (fieldMatch !== null) return fieldMatch;
    return blob.includes(term.toLowerCase());
  });
};
const naicsLabel = (code?: string) => {
  if (!code) return 'Unmapped NAICS';
  const exact = getNAICSByCode(code);
  if (exact) return exact.title;
  if (code.startsWith('23')) return 'Construction';
  if (code.startsWith('42') || code.startsWith('44') || code.startsWith('45')) return 'Wholesale / Retail Supply';
  if (code.startsWith('48') || code.startsWith('49')) return 'Transportation / Warehousing';
  if (code.startsWith('51') || code.startsWith('518') || code.startsWith('519') || code.startsWith('5415')) return 'Technology Services';
  if (code.startsWith('52')) return 'Financial Services';
  if (code.startsWith('54')) return 'Professional Services';
  if (code.startsWith('56')) return 'Administrative / Facilities Support';
  if (code.startsWith('61')) return 'Training / Education';
  if (code.startsWith('62')) return 'Healthcare Services';
  return 'General Services';
};
const contractorFieldCategory = (c: Contractor) => {
  const code = c.naics_code || '';
  const match = NAICS_FIELD_RULES.find(rule => rule.match.some(prefix => code.startsWith(prefix)));
  return match?.label || 'General Services';
};
const fieldCategoryForCode = (code?: string) => {
  const value = code || '';
  const match = NAICS_FIELD_RULES.find(rule => rule.match.some(prefix => value.startsWith(prefix)));
  return match?.label || 'General Services';
};

// ──────────────────────────────────────────────────────────────────────────────
// COMPONENT
// ──────────────────────────────────────────────────────────────────────────────

export default function OutreachPage() {

  // ── Edit contractor modal state ─────────────────────────────────────────────
  const [editContractor, setEditContractor] = useState<Contractor | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);

  // ── Tab / view state ─────────────────────────────────────────────────────────
  const [activeTab,     setActiveTab]     = useState<ActiveTab>('crm');
  const [filterView,    setFilterView]    = useState<FilterView>('total');
  const [pipeView,      setPipeView]      = useState<'kanban' | 'list'>('kanban');

  // ── CRM table state ───────────────────────────────────────────────────────────
  type PipeSortKey = 'name'|'state'|'naics_code'|'score'|'pipeline_stage'|'registration_date'|'trial_end';
  const [sortKey,      setSortKey]      = useState<PipeSortKey>('score');
  const [sortDir,      setSortDir]      = useState<'asc'|'desc'>('desc');
  const [stageFilter,  setStageFilter]  = useState<PipelineStage | 'all'>('all');
  const [crmSelected,  setCrmSelected]  = useState<Set<string>>(new Set<string>());
  const [showCampaign, setShowCampaign] = useState(false);
  const [campaignTpl,  setCampaignTpl]  = useState<EmailTemplate | null>(null);
  const [trialEdits,   setTrialEdits]   = useState<Record<string, { start: string; end: string }>>({});

  // ── Data state ───────────────────────────────────────────────────────────────
  const [contractors,   setContractors]   = useState<Contractor[]>([]);
  const [pipeline,      setPipeline]      = useState<Contractor[]>([]);
  const [stats,         setStats]         = useState<OutreachStats>({ totalContractors: 0, contacted: 0, enrolled: 0, inProgress: 0, successRate: 0 });
  const [activities,    setActivities]    = useState<CrmActivity[]>([]);
  const [tasks,         setTasks]         = useState<CrmTask[]>([]);
  const [offerCodes,    setOfferCodes]    = useState<OfferCode[]>([]);
  const [templates,     setTemplates]     = useState<EmailTemplate[]>([]);
  const [emailLogs,     setEmailLogs]     = useState<EmailLog[]>([]);
  const [emailLogsTotal,setEmailLogsTotal]= useState(0);
  const [emailLogsPage, setEmailLogsPage] = useState(1);
  const [funnel,        setFunnel]        = useState<Record<string, number>>({});
  const [totalRevenue,  setTotalRevenue]  = useState(0);
  const [trialsEndSoon, setTrialsEndSoon] = useState(0);

  // ── Loading ──────────────────────────────────────────────────────────────────
  const [loading,       setLoading]       = useState(true);
  const [crmLoading,    setCrmLoading]    = useState(true);
  const [syncSt,        setSyncSt]        = useState<'idle' | 'syncing' | 'ok'>('idle');
  const [sending,       setSending]       = useState(false);
  const [aiGen,         setAiGen]         = useState(false);
  const [seedingTpls,   setSeedingTpls]   = useState(false);

  // ── CRM UI state ─────────────────────────────────────────────────────────────
  const [detail,        setDetail]        = useState<Contractor | null>(null);
  const [showDrawer,    setShowDrawer]    = useState(false);
  const [newTaskModal,  setNewTaskModal]  = useState(false);
  const [editTask,      setEditTask]      = useState<Partial<CrmTask> | null>(null);
  const [noteText,      setNoteText]      = useState('');
  const [noteFor,       setNoteFor]       = useState<string | null>(null);
  const [crmSearch,     setCrmSearch]     = useState('');
  const [detailActs,    setDetailActs]    = useState<CrmActivity[]>([]);
  const [detailTasks,   setDetailTasks]   = useState<CrmTask[]>([]);
  const [showAddTest,   setShowAddTest]   = useState(false);
  const [testTarget,    setTestTarget]    = useState({ name: '', email: '', uei: '', cage: '', naics: '', state: '', bizType: 'Small Business' });

  // ── Outreach UI state ────────────────────────────────────────────────────────
  const [selected,            setSelected]            = useState<Set<string>>(new Set());
  const [searchTerm,          setSearchTerm]          = useState('');
  const [showFilters,         setShowFilters]         = useState(false);
  const [outreachFolder,      setOutreachFolder]      = useState<OutreachFolder>('all');
  const [quickSegments,       setQuickSegments]       = useState<QuickSegments>({ states: [], setAside: 'all', field: 'all', hasEmail: 'all' });
  const [crmSegments,         setCrmSegments]         = useState<CrmSegments>({ states: [], setAside: 'all', field: 'all', companyType: 'real', naicsFilter: '', regDateFrom: '', regDateTo: '', contactedFilter: 'all', enrolledFilter: 'all' });
  const [testCount,           setTestCount]           = useState(0);
  const [outreachCompanyType, setOutreachCompanyType] = useState<CompanyAudience>('real');
  const [showAddTestOutreach, setShowAddTestOutreach] = useState(false);
  const [newTestOutreach,     setNewTestOutreach]     = useState({ name: '', email: '', company: '', naics_code: '', state: 'VA', business_type: 'Small Business' });
  const [crmAudienceOpen,     setCrmAudienceOpen]     = useState(false);
  const [outreachAudienceOpen,setOutreachAudienceOpen]= useState(false);
  const [pendingOutreachSelectionUeis, setPendingOutreachSelectionUeis] = useState<string[] | null>(null);
  const [showTplPanel,  setShowTplPanel]  = useState(false);
  const [curTemplate,   setCurTemplate]   = useState<EmailTemplate | null>(null);
  const [showSendModal,   setShowSendModal]   = useState(false);
  const [sendResult,      setSendResult]      = useState<{ sentCount: number; skipped: number; failed: number; message: string; testMode: boolean } | null>(null);
  const [selOpp,        setSelOpp]        = useState<Opportunity | null>(null);
  const [oppSearch,     setOppSearch]     = useState('');
  const [oppSegments,   setOppSegments]   = useState<OpportunitySegments>({ states: [], setAside: 'all', field: 'all', type: 'all' });
  const [filters,       setFilters]       = useState<ContractorFilters>({ registrationDateFrom: '', registrationDateTo: '', naicsCodes: [], states: [], businessTypes: [], naicsInput: '' });

  // ── Test companies state ────────────────────────────────────────────────────
  const [testCompanies,     setTestCompanies]     = useState<Contractor[]>([]);
  const [testCompaniesLoad, setTestCompaniesLoad] = useState(false);

  // ── Opportunities state ─────────────────────────────────────────────────────
  const [liveOpps,     setLiveOpps]     = useState<Opportunity[]>([]);
  const [oppsLoading,  setOppsLoading]  = useState(false);
  const [oppSyncSt,    setOppSyncSt]    = useState<'idle'|'syncing'|'ok'>('idle');
  const [lastOppSync,  setLastOppSync]  = useState<string | null>(null);
  const [pipelineEntities, setPipelineEntities] = useState<PipelineEntity[]>([]);
  const [pipelineQueue,    setPipelineQueue]    = useState<any[]>([]);
  const [pipelineLoading,  setPipelineLoading]  = useState(false);
  const [pipelineHeroCollapsed, setPipelineHeroCollapsed] = useState(false);
  const [pipelineRunState, setPipelineRunState] = useState<Partial<Record<PipelineStep, PipelineStepState>>>({});
  const [pipelineActiveStep, setPipelineActiveStep] = useState<PipelineStep | null>(null);
  const [latestIngestRun, setLatestIngestRun] = useState<IngestionRunSummary | null>(null);
  const [ingestDaysFrom, setIngestDaysFrom] = useState('90');
  const [ingestDaysTo, setIngestDaysTo] = useState('365');
  const [pipelineLogFocus, setPipelineLogFocus] = useState<PipelineStep | 'all'>('all');
  const [pipelineEntityView, setPipelineEntityView] = useState<'all' | 'loaded' | 'contactable' | 'enriched' | 'pending' | 'manual_review'>('all');
  const [pipelineQueueView, setPipelineQueueView] = useState<'all' | 'queued' | 'approved'>('all');
  const pipelineEntityPanelRef = useRef<HTMLDivElement | null>(null);
  const pipelineQueuePanelRef = useRef<HTMLDivElement | null>(null);
  const [showPipelineEditModal, setShowPipelineEditModal] = useState(false);
  const [pipelineEditForm, setPipelineEditForm] = useState<{
    samEntityId: string;
    legalBusinessName: string;
    publicEmail: string;
    publicPhone: string;
    websiteUrl: string;
    websiteDomain: string;
    contactPageUrl: string;
    linkedinUrl: string;
    facebookUrl: string;
    enrichmentNotes: string;
    enrichmentStatus: string;
    sourceConfidence: string;
  } | null>(null);

  // ── Template / code modal state ──────────────────────────────────────────────
  const [editTpl,          setEditTpl]          = useState<EmailTemplate | null>(null);
  const [showTplModal,     setShowTplModal]     = useState(false);
  const [editCode,         setEditCode]         = useState<OfferCode | null>(null);
  const [showCodeModal,    setShowCodeModal]    = useState(false);
  const [copied,           setCopied]           = useState<string | null>(null);

  // ── Email logs state ─────────────────────────────────────────────────────────
  const [emailLogsSearch,  setEmailLogsSearch]  = useState('');
  const [emailLogsFilter,  setEmailLogsFilter]  = useState<'all' | 'sent' | 'failed' | 'opened'>('all');
  const [emailLogsLoading, setEmailLogsLoading] = useState(false);

  const isOutreachTestOnly = outreachCompanyType === 'test';
  const showOutreachTestRecords = outreachCompanyType !== 'real';
  const isOutreachMixedMode = outreachCompanyType === 'all';

  // ── Toast ────────────────────────────────────────────────────────────────────
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' | 'info' } | null>(null);
  const notify = (msg: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  // ── Computed ─────────────────────────────────────────────────────────────────
  const overdueCount   = tasks.filter(t => t.status === 'overdue').length;
  const activeTrials   = pipeline.filter(c => c.pipeline_stage === 'trial').length;
  const convRate       = pipeline.length ? Math.round((pipeline.filter(c => c.pipeline_stage === 'converted').length / pipeline.length) * 100) : 0;
  const newThisWeek    = pipeline.filter(c => c.created_at && new Date(c.created_at) > new Date(Date.now() - 7 * 86400000)).length;
  // Open/reply rates are computed from real activity logs — null until emails are tracked via webhook
  const emailsSent     = activities.filter(a => a.type === 'email_sent').length;
  const emailsOpened   = activities.filter(a => a.type === 'email_opened').length;
  const emailsReplied  = activities.filter(a => a.type === 'email_replied').length;
  const openRate       = emailsSent > 0 ? Math.round((emailsOpened  / emailsSent) * 100) : null;
  const replyRate      = emailsSent > 0 ? Math.round((emailsReplied / emailsSent) * 100) : null;

  // ── Fetch pipeline (CRM) ────────────────────────────────────────────────────
  const fetchPipeline = useCallback(async () => {
    try {
      setCrmLoading(true);
      const params = new URLSearchParams();
      params.set('search', crmSearch);
      params.set('limit', '500');
      if (crmSegments.states.length) params.set('states', crmSegments.states.join(','));
      if (crmSegments.setAside !== 'all') params.set('businessTypes', crmSegments.setAside);
      if (crmSegments.field !== 'all') {
        const fieldCode = NAICS_FIELD_RULES.find(rule => rule.label === crmSegments.field)?.match[0];
        if (fieldCode) params.set('naics', fieldCode);
      }
      if (crmSegments.companyType === 'test') {
        params.set('showTest', 'true');
        params.set('testOnly', 'true');
      } else if (crmSegments.companyType === 'all') {
        params.set('showTest', 'true');
      }
      const r = await fetch(`/api/crm/pipeline?${params.toString()}`);
      if (!r.ok) throw new Error(`${r.status}`);
      const d = await r.json();
      setPipeline(d.contractors || []);
      setFunnel(d.funnel || {});
      setTotalRevenue(Number(d.totalRevenue) || 0);
      setTrialsEndSoon(d.trialsEndingSoon || 0);
    } catch (e: any) {
      console.error('[fetchPipeline]', e);
      notify('Failed to load pipeline data', 'error');
    } finally {
      setCrmLoading(false);
    }
  }, [crmSearch, crmSegments]);

  // ── Fetch outreach contractors ───────────────────────────────────────────────
  const fetchContractors = useCallback(async (companyTypeOverride?: CompanyAudience) => {
    try {
      setLoading(true);

      const params = new URLSearchParams();
      params.set('page',  '1');
      params.set('limit', '500');
      const effectiveCompanyType = companyTypeOverride || outreachCompanyType;
      params.set('showTest', String(effectiveCompanyType !== 'real'));
      if (effectiveCompanyType === 'test') params.set('testOnly', 'true');

      if (searchTerm)                    params.set('search',        searchTerm);
      if (filterView === 'enrolled')     params.set('enrolled',      'true');
      if (filterView === 'contacted')    params.set('notContactedOnly', 'false');
      if (filters.registrationDateFrom)  params.set('regDateFrom',   filters.registrationDateFrom);
      if (filters.registrationDateTo)    params.set('regDateTo',     filters.registrationDateTo);
      if (filters.naicsCodes.length)     params.set('naicsCodes',    filters.naicsCodes.join(','));
      if (filters.states.length)         params.set('states',        filters.states.join(','));
      if (filters.businessTypes.length)  params.set('businessTypes', filters.businessTypes.join(','));

      const r = await fetch(`/api/outreach/contractors?${params}`);
      const d = await r.json();
      if (!r.ok) {
        throw new Error(d?.error || `Failed to fetch contractors (${r.status})`);
      }

      if (d.testCount !== undefined) setTestCount(d.testCount);

      const mapped = (d.contractors || []).map((c: any) => ({
        id:                c.id,
        name:              c.name || 'Unknown',
        email:             c.email || '',
        phone:             c.phone || '',
        sam_gov_id:        c.sam_gov_id || (c.uei_number ? `SAM-${c.uei_number}` : ''),
        uei_number:        c.uei_number || '',
        cage_code:         c.cage_code || '',
        naics_code:        c.naics_code || '',
        state:             c.state || '',
        business_type:     c.business_type || 'Small Business',
        registration_date: c.registration_date ? new Date(c.registration_date).toISOString().split('T')[0] : '',
        contacted:         c.contacted  || false,
        enrolled:          c.enrolled   || false,
        contact_attempts:  c.contact_attempts || 0,
        offer_code:        c.offer_code || '',
        score:             c.score      || 0,
        pipeline_stage:    c.pipeline_stage || 'new',
        last_contact:      c.last_contact ? new Date(c.last_contact).toISOString() : '',
        created_at:        c.created_at ? new Date(c.created_at).toISOString() : '',
        synced_at:         c.synced_at ? new Date(c.synced_at).toISOString() : '',
        is_test:           c.is_test    || false,
      }));
      setContractors(mapped);
    } catch (e: any) {
      console.error('[fetchContractors]', e);
      setContractors([]);
      notify(e?.message || 'Failed to load contractors', 'error');
    } finally {
      setLoading(false);
    }
  }, [filterView, searchTerm, filters, outreachCompanyType]);

  // ── Fetch stats ──────────────────────────────────────────────────────────────
  const fetchStats = useCallback(async () => {
    try {
      const r = await fetch('/api/outreach/stats');
      if (r.ok) setStats(await r.json());
    } catch (e) {}
  }, []);

  // ── Fetch global activities ───────────────────────────────────────────────────
  const fetchActivities = useCallback(async () => {
    try {
      const r = await fetch('/api/crm/activities?limit=20');
      if (r.ok) {
        const d = await r.json();
        setActivities(d.activities || []);
      }
    } catch (e) {}
  }, []);

  // ── Fetch tasks ──────────────────────────────────────────────────────────────
  const fetchTasks = useCallback(async () => {
    try {
      const r = await fetch('/api/crm/tasks');
      if (r.ok) {
        const d = await r.json();
        setTasks(d.tasks || []);
      }
    } catch (e) {}
  }, []);

  // ── Fetch offer codes ────────────────────────────────────────────────────────
  const fetchOfferCodes = useCallback(async () => {
    try {
      const r = await fetch('/api/crm/offer-codes?withStats=true');
      if (r.ok) {
        const d = await r.json();
        setOfferCodes(d.codes || []);
      }
    } catch (e) {}
  }, []);
  const fetchLeadPipeline = useCallback(async () => {
    try {
      setPipelineLoading(true);
      const [enrichRes, queueRes, ingestRunsRes] = await Promise.all([
        fetch('/api/sam/enrich?status=all&limit=100'),
        fetch('/api/sam/queue?status=all&limit=100'),
        fetch('/api/sam/ingestion-runs?source=sam_entity_api&runType=weekly_rolling&limit=5'),
      ]);

      const enrichData = enrichRes.ok ? await enrichRes.json() : { rows: [] };
      const queueData = queueRes.ok ? await queueRes.json() : { queue: [] };
      const ingestRunsData = ingestRunsRes.ok ? await ingestRunsRes.json() : { latest: null };

      const mappedEntities: PipelineEntity[] = (enrichData.rows || []).map((row: any) => ({
        id: row.samEntity?.id || row.samEntityId,
        uei: row.samEntity?.uei || '',
        legalBusinessName: row.samEntity?.legalBusinessName || 'Unknown',
        registrationDate: row.samEntity?.registrationDate ? String(row.samEntity.registrationDate).slice(0, 10) : '',
        activationDate: row.samEntity?.activationDate ? String(row.samEntity.activationDate).slice(0, 10) : '',
        registrationStatus: row.samEntity?.registrationStatus || '',
        naicsCodes: Array.isArray(row.samEntity?.naicsCodes) ? row.samEntity.naicsCodes.map((v: any) => String(v)) : [],
        physicalAddress: row.samEntity?.physicalAddress || null,
        enrichment: {
          publicEmail: row.publicEmail || '',
          publicPhone: row.publicPhone || '',
          websiteUrl: row.websiteUrl || '',
          websiteDomain: row.websiteDomain || '',
          contactPageUrl: row.contactPageUrl || '',
          linkedinUrl: row.linkedinUrl || '',
          facebookUrl: row.facebookUrl || '',
          enrichmentStatus: row.enrichmentStatus || '',
          enrichmentNotes: row.enrichmentNotes || '',
          sourceConfidence: row.sourceConfidence ?? null,
          emailSource: row.rawEnrichmentPayload?.emailSource || '',
          enrichmentMode: row.rawEnrichmentPayload?.enrichmentMode || '',
          providersUsed: Array.isArray(row.rawEnrichmentPayload?.providersUsed) ? row.rawEnrichmentPayload.providersUsed : [],
          lastEnrichedAt: row.rawEnrichmentPayload?.lastEnrichedAt || '',
          crawlTargetUrl: row.rawEnrichmentPayload?.crawlTargetUrl || '',
          hasWeakWebsiteHint: Boolean(row.rawEnrichmentPayload?.hasWeakWebsiteHint),
          hasWebsiteSignal: Boolean(row.websiteUrl || row.contactPageUrl || row.rawEnrichmentPayload?.crawlTargetUrl),
        },
        leadScore: row.samEntity?.leadScore
          ? {
              score: row.samEntity.leadScore.score,
              fitScore: row.samEntity.leadScore.fitScore,
              contactabilityScore: row.samEntity.leadScore.contactabilityScore,
              recencyScore: row.samEntity.leadScore.recencyScore,
              reasons: Array.isArray(row.samEntity.leadScore.reasons) ? row.samEntity.leadScore.reasons : [],
            }
          : null,
      }));

      const scoreMap = new Map((queueData.queue || []).map((item: any) => [item.samEntity?.id, item.samEntity?.leadScore]));
      setPipelineEntities(mappedEntities.map(entity => ({ ...entity, leadScore: scoreMap.get(entity.id) || entity.leadScore || null })));
      setPipelineQueue(queueData.queue || []);
      setLatestIngestRun(ingestRunsData.latest || null);
    } catch (e) {
      console.error('[fetchLeadPipeline]', e);
      notify('Failed to load lead pipeline', 'error');
    } finally {
      setPipelineLoading(false);
    }
  }, []);
  const openQueuedCampaignFolder = useCallback(async (queueStatus: 'approved' | 'queued') => {
    const targetUeis = pipelineQueue
      .filter((item: any) => item.status === queueStatus && item.samEntity?.uei)
      .map((item: any) => String(item.samEntity.uei));

    setActiveTab('outreach');
    setOutreachCompanyType('real');
    setOutreachFolder('readyCold');
    setSearchTerm('');
    setQuickSegments({ states: [], setAside: 'all', field: 'all', hasEmail: 'all' });
    setPendingOutreachSelectionUeis(targetUeis);
    await fetchContractors('real');

    if (targetUeis.length > 0) {
      notify(
        queueStatus === 'approved'
          ? 'Opened Outreach with approved queue leads selected'
          : 'Opened Outreach with queued-for-review leads selected',
        'info',
      );
    } else {
      notify(`No ${queueStatus} queue leads are ready to move right now.`, 'info');
    }
  }, [pipelineQueue, fetchContractors]);
  const openPipelineEdit = useCallback((entity: PipelineEntity) => {
    setPipelineEditForm({
      samEntityId: entity.id,
      legalBusinessName: entity.legalBusinessName,
      publicEmail: entity.enrichment?.publicEmail || '',
      publicPhone: entity.enrichment?.publicPhone || '',
      websiteUrl: entity.enrichment?.websiteUrl || '',
      websiteDomain: entity.enrichment?.websiteDomain || '',
      contactPageUrl: entity.enrichment?.contactPageUrl || '',
      linkedinUrl: entity.enrichment?.linkedinUrl || '',
      facebookUrl: entity.enrichment?.facebookUrl || '',
      enrichmentNotes: entity.enrichment?.enrichmentNotes || '',
      enrichmentStatus: entity.enrichment?.enrichmentStatus || 'enriched',
      sourceConfidence: entity.enrichment?.sourceConfidence != null ? String(entity.enrichment.sourceConfidence) : '',
    });
    setShowPipelineEditModal(true);
  }, []);

  const savePipelineEdit = useCallback(async () => {
    if (!pipelineEditForm) return;
    try {
      setPipelineLoading(true);
      const response = await fetch('/api/sam/enrich', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...pipelineEditForm,
          sourceConfidence: pipelineEditForm.sourceConfidence ? Number(pipelineEditForm.sourceConfidence) : undefined,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to save enrichment');
      await fetchLeadPipeline();
      setShowPipelineEditModal(false);
      setPipelineEditForm(null);
      notify('Enrichment details saved');
    } catch (error: any) {
      notify(error.message || 'Failed to save enrichment', 'error');
    } finally {
      setPipelineLoading(false);
    }
  }, [pipelineEditForm, fetchLeadPipeline]);

  useEffect(() => {
    const params = latestIngestRun?.requestParams;
    if (typeof params?.requestedDaysFrom === 'number' && typeof params?.requestedDaysTo === 'number') {
      setIngestDaysFrom(String(params.requestedDaysFrom));
      setIngestDaysTo(String(params.requestedDaysTo));
    }
  }, [latestIngestRun]);

  useEffect(() => {
    if (!pendingOutreachSelectionUeis || activeTab !== 'outreach' || contractors.length === 0) return;
    const queuedSet = new Set(pendingOutreachSelectionUeis);
    const matchingIds = contractors
      .filter(contractor => queuedSet.has(contractor.uei_number || ''))
      .map(contractor => contractor.id);
    setSelected(new Set(matchingIds));
    setPendingOutreachSelectionUeis(null);
  }, [pendingOutreachSelectionUeis, contractors, activeTab]);
  // ── Fetch live opportunities from cache ─────────────────────────────────────
  const fetchOpportunities = useCallback(async () => {
    try {
      setOppsLoading(true);
      const r = await fetch('/api/opportunities/cached');
      if (!r.ok) throw new Error(`${r.status}`);
      const d = await r.json();
      const mapped = (d.opportunities || []).map((o: any) => ({
        id:                 o.id,
        title:              o.title || 'Untitled',
        agency:             o.agency || 'Federal Agency',
        naicsCode:          o.naics_code || '',
        naicsDefinition:    o.naics_definition || naicsLabel(o.naics_code || ''),
        businessState:      o.business_state || '',
        postedDate:         o.posted_date ? o.posted_date.split('T')[0] : '',
        responseDeadline:   o.response_deadline ? o.response_deadline.split('T')[0] : '',
        value:              o.contract_value || 'TBD',
        type:               o.opportunity_type || 'Solicitation',
        setAside:           o.set_aside || '',
        description:        o.description || '',
        solicitationNumber: o.solicitation_number || '',
        url:                o.url || 'https://sam.gov',
      }));
      setLiveOpps(mapped);
      setLastOppSync(d.lastSync || null);
    } catch (e) {
      // Fall back to mock data silently — cache may be empty
    } finally {
      setOppsLoading(false);
    }
  }, []);

  // ── Fetch test companies ────────────────────────────────────────────────────
  const fetchTestCompanies = useCallback(async () => {
    try {
      setTestCompaniesLoad(true);
      // Use testOnly=true — returns ONLY is_test records, no client-side filtering needed
      const r = await fetch('/api/outreach/contractors?testOnly=true&showTest=true&limit=500');
      if (!r.ok) throw new Error(`${r.status}`);
      const d = await r.json();
      const tests = d.contractors || [];
      setTestCompanies(tests);
      setTestCount(tests.length);
    } catch (e) {
      console.error('[fetchTestCompanies]', e);
      notify('Failed to load test companies', 'error');
    } finally {
      setTestCompaniesLoad(false);
    }
  }, []);

  const deleteTestContractor = async (id: string, name: string) => {
    if (!confirm(`Delete test contractor "${name}"?`)) return;
    try {
      const r = await fetch(`/api/outreach/test-contractors/${id}`, { method: 'DELETE' });
      if (r.ok) {
        notify(`🗑️ Deleted ${name}`);
        setTestCompanies(prev => prev.filter(c => c.id !== id));
        setTestCount(prev => Math.max(0, prev - 1));
        fetchContractors();
      } else {
        const d = await r.json();
        notify(d.error || 'Failed to delete', 'error');
      }
    } catch {
      notify('Delete failed', 'error');
    }
  };

  const fetchTemplates = useCallback(async () => {
    try {
      const res = await fetch('/api/outreach/templates');
      if (res.ok) {
        const data = await res.json();
        // Normalize snake_case DB fields → camelCase for frontend
        const normalized = (data.templates || []).map((t: any) => ({
          ...t,
          offerCode:    t.offerCode    ?? t.offer_code    ?? undefined,
          aiGenerated:  t.aiGenerated  ?? t.ai_generated  ?? false,
          usageCount:   t.usageCount   ?? t.usage_count   ?? 0,
        }));
        setTemplates(normalized);
      }
    } catch (err) { console.error('Failed to fetch templates:', err); }
  }, []);

  // ── Fetch email logs ─────────────────────────────────────────────────────────
  const fetchEmailLogs = useCallback(async (page = 1) => {
    try {
      setEmailLogsLoading(true);
      const params = new URLSearchParams();
      params.set('page',  String(page));
      params.set('limit', '50');
      if (emailLogsSearch) params.set('search', emailLogsSearch);
      if (emailLogsFilter !== 'all') params.set('status', emailLogsFilter);
      const r = await fetch(`/api/outreach/email-logs?${params}`);
      if (r.ok) {
        const d = await r.json();
        setEmailLogs(d.logs || []);
        setEmailLogsTotal(d.total || 0);
        setEmailLogsPage(page);
      }
    } catch (e) { console.error('[fetchEmailLogs]', e); }
    finally { setEmailLogsLoading(false); }
  }, [emailLogsSearch, emailLogsFilter]);
  useEffect(() => { fetchPipeline(); fetchActivities(); fetchTasks(); fetchStats(); fetchOfferCodes(); fetchTemplates(); fetchOpportunities(); }, []);
  useEffect(() => { if (activeTab === 'crm') fetchPipeline(); }, [activeTab, fetchPipeline]);
  useEffect(() => { if (activeTab === 'outreach') fetchContractors(); }, [activeTab, fetchContractors]);
  useEffect(() => { if (activeTab === 'opportunities') fetchOpportunities(); }, [activeTab, fetchOpportunities]);
  useEffect(() => { if (activeTab === 'leadPipeline') fetchLeadPipeline(); }, [activeTab, fetchLeadPipeline]);
  useEffect(() => { if (activeTab === 'testData') fetchTestCompanies(); }, [activeTab, fetchTestCompanies]);
  useEffect(() => { if (activeTab === 'sentEmails') fetchEmailLogs(1); }, [activeTab, fetchEmailLogs]);
  useEffect(() => { if (activeTab === 'offerCodes') fetchOfferCodes(); }, [activeTab, fetchOfferCodes]);
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(PIPELINE_RUN_STATE_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        setPipelineRunState(parsed);
      }
    } catch {}
  }, []);
  useEffect(() => {
    try {
      window.localStorage.setItem(PIPELINE_RUN_STATE_STORAGE_KEY, JSON.stringify(pipelineRunState));
    } catch {}
  }, [pipelineRunState]);
  useEffect(() => {
    if (activeTab !== 'outreach' || isOutreachTestOnly || isOutreachMixedMode || outreachFolder === 'all' || contractors.length === 0) return;
    const hasVisibleInFolder = contractors.some(c => getCampaignFolder(c) === outreachFolder);
    if (!hasVisibleInFolder) setOutreachFolder('all');
  }, [activeTab, contractors, outreachFolder, isOutreachTestOnly, isOutreachMixedMode]);

  // ── Queue entry action (approve / reject / delete) ────────────────────────
  const queueAction = async (id: string, action: 'approve' | 'reject' | 'delete') => {
    try {
      if (action === 'delete') {
        const res = await fetch(`/api/sam/queue/${id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('Delete failed');
        setPipelineQueue((q: any[]) => q.filter((i: any) => i.id !== id));
        notify('Entry removed');
      } else {
        const status = action === 'approve' ? 'approved' : 'rejected';
        const res = await fetch(`/api/sam/queue/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status }),
        });
        if (!res.ok) throw new Error('Update failed');
        setPipelineQueue((q: any[]) => q.map((i: any) => i.id === id ? { ...i, status } : i));
        notify(action === 'approve' ? 'Approved ✓' : 'Rejected');
      }
    } catch (e: any) {
      notify(e.message || 'Action failed', 'error');
    }
  };

  // ── Load drawer detail data ──────────────────────────────────────────────────
  const openDrawer = async (c: Contractor) => {
    setDetail(c);
    setShowDrawer(true);
    try {
      const [ar, tr] = await Promise.all([
        fetch(`/api/crm/activities?contractorId=${c.id}&limit=20`),
        fetch(`/api/crm/tasks?contractorId=${c.id}`),
      ]);
      if (ar.ok) { const d = await ar.json(); setDetailActs(d.activities || []); }
      if (tr.ok) { const d = await tr.json(); setDetailTasks(d.tasks || []); }
    } catch (e) {}
  };

  // ── Stage change (persists to DB) ────────────────────────────────────────────
  const stageChange = async (id: string, stage: PipelineStage) => {
    const c = pipeline.find(x => x.id === id);
    if (!c) return;
    const oldStage = c.pipeline_stage || 'new';

    // Optimistic UI
    setPipeline(p => p.map(x => x.id === id ? { ...x, pipeline_stage: stage } : x));

    try {
      await fetch('/api/crm/pipeline', {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ id, pipeline_stage: stage }),
      });
      await fetch('/api/crm/activities', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ contractor_id: id, type: 'stage_changed', description: `Stage: ${STAGES[oldStage as PipelineStage].label} → ${STAGES[stage as PipelineStage].label}` }),
      });
      notify(`${c.name} → ${STAGES[stage as PipelineStage].label}`);
      fetchActivities();
    } catch (e) {
      // Revert on error
      setPipeline(p => p.map(x => x.id === id ? { ...x, pipeline_stage: oldStage } : x));
      notify('Failed to update stage', 'error');
    }
  };

  // ── Add note ──────────────────────────────────────────────────────────────────
  const addNote = async (cid: string) => {
    if (!noteText.trim()) return;
    try {
      await fetch('/api/crm/activities', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ contractor_id: cid, type: 'note_added', description: noteText }),
      });
      await fetch('/api/crm/pipeline', {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ id: cid, notes: noteText }),
      });
      setNoteText('');
      setNoteFor(null);
      notify('Note saved');
      fetchActivities();
      if (detail?.id === cid) openDrawer({ ...detail, notes: noteText });
    } catch (e) {
      notify('Failed to save note', 'error');
    }
  };

  // ── Complete task ────────────────────────────────────────────────────────────
  const completeTask = async (tid: string) => {
    const t = tasks.find(x => x.id === tid);
    setTasks(p => p.map(x => x.id === tid ? { ...x, status: 'done' } : x));
    try {
      await fetch('/api/crm/tasks', {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ id: tid, status: 'done' }),
      });
      if (t) {
        await fetch('/api/crm/activities', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ contractor_id: t.contractor_id, type: 'task_completed', description: `Task: ${t.title}` }),
        });
      }
      notify('Task complete ✓');
      fetchActivities();
    } catch (e) {
      notify('Failed to update task', 'error');
    }
  };

  // ── Save new task ────────────────────────────────────────────────────────────
  const saveTask = async () => {
    if (!editTask?.title || !editTask.contractor_id || !editTask.due_date) {
      notify('Fill required fields', 'error');
      return;
    }
    try {
      const r = await fetch('/api/crm/tasks', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          contractor_id:   editTask.contractor_id,
          contractor_name: editTask.contractor_name || '',
          title:           editTask.title,
          due_date:        editTask.due_date,
          priority:        editTask.priority || 'medium',
          assignee:        editTask.assignee || 'Admin',
          notes:           editTask.notes,
        }),
      });
      if (r.ok) {
        const d = await r.json();
        setTasks(p => [d.task, ...p]);
        setEditTask(null);
        setNewTaskModal(false);
        notify('Task created');
      }
    } catch (e) {
      notify('Failed to create task', 'error');
    }
  };

  // ── Save offer code ──────────────────────────────────────────────────────────
  const saveOfferCode = async () => {
    if (!editCode?.code || !editCode.description) { notify('Fill required fields', 'error'); return; }
    try {
      const isNew = !offerCodes.find(c => c.id === editCode.id);
      const r = await fetch('/api/crm/offer-codes', {
        method:  isNew ? 'POST' : 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(isNew ? {
          code: editCode.code, description: editCode.description, discount: editCode.discount,
          type: editCode.type, max_usage: editCode.max_usage, expires_at: editCode.expires_at, active: editCode.active,
        } : editCode),
      });
      if (r.ok) {
        fetchOfferCodes();
        setShowCodeModal(false);
        notify('Offer code saved');
      } else {
        const d = await r.json();
        notify(d.error || 'Failed to save', 'error');
      }
    } catch (e) { notify('Failed to save offer code', 'error'); }
  };

  // ── AI template generation ───────────────────────────────────────────────────
  const genAI = async (opp?: Opportunity) => {
    setAiGen(true);
    setShowTplPanel(true);
    try {
      const activeCode = offerCodes.find(c => c.active && (c.isAvailable !== false))?.code || 'PRECISE14';

      if (opp) {
        // For opportunity-based: create a targeted template
        const res = await fetch('/api/outreach/generate-template', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            targetAudience: `federal contractors with NAICS code ${opp.naicsCode} interested in ${opp.setAside || 'open competition'} opportunities`,
            offerType: `Free 14-day trial to help win ${opp.title} (${opp.agency})`,
            messageLength: 'medium',
            category: 'opportunity',
            offerCode: activeCode,
            naicsCode: opp.naicsCode,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          setCurTemplate({
            id: `ai-${Date.now()}`,
            name: `AI: ${opp.title.slice(0, 40)}...`,
            subject: data.subject || `New ${opp.setAside || ''} Opportunity: ${opp.title.slice(0, 50)} — ${opp.agency}`,
            body: data.body || `Hi [FIRST_NAME],\n\nA new ${opp.setAside ? opp.setAside + ' set-aside ' : ''}solicitation matching NAICS ${opp.naicsCode}:\n\n📋 ${opp.title}\n🏛️ ${opp.agency}\n💰 ${opp.value}\n📅 Deadline: ${opp.responseDeadline}\n🔢 ${opp.solicitationNumber}\n\nPrecise Analytics can help support your bid. Use code ${activeCode} for 14-day free access.\n\nPrecise Analytics — Federal Business Development\nVirginia | VOSB | Minority-Owned`,
            offerCode:   activeCode,
            aiGenerated: true,
            category:    'opportunity',
          });
        } else {
          // Fallback to local template
          setCurTemplate({
            id: `ai-${Date.now()}`,
            name: `AI: ${opp.title.slice(0, 40)}...`,
            subject: `New ${opp.setAside || ''} Opportunity: ${opp.title.slice(0, 50)} — ${opp.agency}`,
            body: `Hi [FIRST_NAME],\n\nA new ${opp.setAside ? opp.setAside + ' set-aside ' : ''}solicitation matching NAICS ${opp.naicsCode}:\n\n📋 ${opp.title}\n🏛️ ${opp.agency}\n💰 ${opp.value}\n📅 Deadline: ${opp.responseDeadline}\n🔢 ${opp.solicitationNumber}\n\nPrecise Analytics can help support your bid. Use code ${activeCode} for 14-day free access.\n\nPrecise Analytics — Federal Business Development\nVirginia | VOSB | Minority-Owned`,
            offerCode:   activeCode,
            aiGenerated: true,
            category:    'opportunity',
          });
        }
      } else {
        // Generic cold outreach AI generation
        const res = await fetch('/api/outreach/generate-template', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            targetAudience: `federal contractors (${selected.size} recipients) recently registered on SAM.gov`,
            offerType: `Free 14-day trial with code ${activeCode}`,
            messageLength: 'medium',
            category: 'cold',
            offerCode: activeCode,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          setCurTemplate({
            id: `ai-${Date.now()}`,
            name: `AI Campaign — ${new Date().toLocaleDateString()} (${selected.size} contractors)`,
            subject: data.subject || `Federal Contracting Opportunities for [COMPANY_NAME] — Use Code ${activeCode}`,
            body: data.body || `Hi [FIRST_NAME],\n\nCongratulations on your recent SAM.gov registration!\n\nAt Precise Analytics, we specialize in helping [BUSINESS_TYPE] firms identify and win federal contracts through our AI-powered opportunity matching platform.\n\nUse code ${activeCode} to access our platform free for 14 days — no credit card required.\n\nBest regards,\nPrecise Analytics — Federal Business Development\nVirginia | VOSB | Minority-Owned`,
            offerCode:   activeCode,
            aiGenerated: true,
            category:    'cold',
          });
        } else {
          setCurTemplate({
            id: `ai-${Date.now()}`,
            name: `AI Campaign — ${new Date().toLocaleDateString()} (${selected.size} contractors)`,
            subject: `Federal Contracting Opportunities for [COMPANY_NAME] — Use Code ${activeCode}`,
            body: `Hi [FIRST_NAME],\n\nCongratulations on your recent SAM.gov registration!\n\nAt Precise Analytics, we specialize in helping [BUSINESS_TYPE] firms identify and win federal contracts through our AI-powered opportunity matching platform.\n\nUse code ${activeCode} to access our platform free for 14 days — no credit card required.\n\nBest regards,\nPrecise Analytics — Federal Business Development\nVirginia | VOSB | Minority-Owned`,
            offerCode:   activeCode,
            aiGenerated: true,
            category:    'cold',
          });
        }
      }
    } finally {
      setAiGen(false);
    }
  };

  // ── Test contractor helpers ──────────────────────────────────────────────────
  const saveTestOutreachContractor = async () => {
    if (!newTestOutreach.name || !newTestOutreach.email) {
      notify('Name and email are required', 'error'); return;
    }
    const res = await fetch('/api/outreach/test-contractors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newTestOutreach),
    });
    const data = await res.json();
    if (res.ok) {
      notify(`✅ ${data.message}`);
      setShowAddTestOutreach(false);
      setNewTestOutreach({ name: '', email: '', company: '', naics_code: '', state: 'VA', business_type: 'Small Business' });
      setOutreachCompanyType('test');
      fetchContractors('test');
    } else {
      notify(data.error || 'Failed to create test contractor', 'error');
    }
  };

  const purgeTestContractors = async () => {
    if (!confirm(`Permanently delete all ${testCount} test contractor(s)? This cannot be undone.`)) return;
    const res = await fetch('/api/outreach/test-contractors', { method: 'DELETE' });
    const data = await res.json();
    if (res.ok) {
      notify(`🗑️ Deleted ${data.deleted} test contractor(s)`);
      setTestCount(0);
      setOutreachCompanyType('real');
      fetchContractors('real');
    } else {
      notify('Failed to purge test contractors', 'error');
    }
  };

  // ── Send emails ──────────────────────────────────────────────────────────────
  const sendEmails = async () => {
    if (!curTemplate || selected.size === 0) return;
    setSending(true);
    try {
      const toSend = contractors.filter(c => selected.has(c.id));
      const r = await fetch('/api/outreach/send', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          contractors:      toSend,
          template: {
            ...curTemplate,
            offerCode: curTemplate.offerCode ?? (curTemplate as any).offer_code ?? null,
          },
          personalizeEmails: true,
          allowTestRecords: true,  // is_test is a label only, never block sends
        }),
      });
      const d = await r.json();
      if (d.success !== false) {
        setShowSendModal(false);
        setSendResult({
          sentCount: d.sentCount ?? 0,
          skipped:   (d.results || []).filter((r: any) => r.status === 'skipped').length,
          failed:    d.failedCount ?? 0,
          message:   d.message || `Sent ${d.sentCount} email${d.sentCount !== 1 ? 's' : ''}`,
          testMode:  isOutreachTestOnly,
        });
        setSelected(new Set());
        setCurTemplate(null);
        setShowTplPanel(false);
        fetchContractors();
        fetchStats();
        fetchPipeline();
      } else {
        notify(`Error: ${d.error || 'Unknown error'}`, 'error');
      }
    } catch (e: any) {
      notify('Error sending emails', 'error');
    } finally {
      setSending(false);
    }
  };

  const clip = (s: string) => { navigator.clipboard.writeText(s); setCopied(s); setTimeout(() => setCopied(null), 2000); };

  const buildExportRows = (rows: Contractor[]) => rows.map(row => ({
    name: row.name || '',
    email: row.email || '',
    phone: row.phone || '',
    state: row.state || '',
    naics_code: row.naics_code || '',
    naics_title: naicsLabel(row.naics_code),
    field: contractorFieldCategory(row),
    business_type: row.business_type || '',
    registration_date: row.registration_date || '',
    sam_gov_id: row.sam_gov_id || '',
    uei_number: row.uei_number || '',
    cage_code: row.cage_code || '',
    pipeline_stage: row.pipeline_stage || '',
    score: row.score ?? '',
    last_contact: row.last_contact || '',
    created_at: row.created_at || '',
  }));

  const csvEscape = (value: unknown) => {
    const str = String(value ?? '');
    if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
    return str;
  };

  const downloadBlob = (content: string, mime: string, filename: string) => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const exportContractorsList = (rows: Contractor[], format: 'csv' | 'txt' | 'json' | 'pdf', filenameBase: string) => {
    if (rows.length === 0) {
      notify('No contacts available to export', 'error');
      return;
    }

    const exportRows = buildExportRows(rows);

    if (format === 'csv') {
      const headers = Object.keys(exportRows[0]);
      const body = exportRows.map(row => headers.map(header => csvEscape((row as any)[header])).join(','));
      downloadBlob([headers.join(','), ...body].join('\n'), 'text/csv;charset=utf-8', `${filenameBase}.csv`);
      notify(`Exported ${rows.length} contacts to CSV`);
      return;
    }

    if (format === 'txt') {
      const body = exportRows.map((row, index) => [
        `${index + 1}. ${row.name || 'Unknown Contractor'}`,
        `Email: ${row.email || 'No email'}`,
        `Phone: ${row.phone || 'No phone'}`,
        `State: ${row.state || '—'}`,
        `NAICS: ${row.naics_code || '—'}${row.naics_title ? ` (${row.naics_title})` : ''}`,
        `Field: ${row.field || '—'}`,
        `Set-Aside: ${row.business_type || '—'}`,
        `Registered: ${row.registration_date || '—'}`,
        `SAM ID: ${row.sam_gov_id || '—'}`,
        `UEI: ${row.uei_number || '—'}`,
        `CAGE: ${row.cage_code || '—'}`,
        `Stage: ${row.pipeline_stage || '—'}`,
        `Score: ${row.score || '—'}`,
        '',
      ].join('\n')).join('\n');
      downloadBlob(body, 'text/plain;charset=utf-8', `${filenameBase}.txt`);
      notify(`Exported ${rows.length} contacts to TXT`);
      return;
    }

    if (format === 'json') {
      downloadBlob(JSON.stringify(exportRows, null, 2), 'application/json;charset=utf-8', `${filenameBase}.json`);
      notify(`Exported ${rows.length} contacts to JSON`);
      return;
    }

    const printWindow = window.open('', '_blank', 'width=1200,height=800');
    if (!printWindow) {
      notify('Pop-up blocked. Allow pop-ups to export PDF.', 'error');
      return;
    }
    const headers = Object.keys(exportRows[0]);
    const tableRows = exportRows.map(row => (
      `<tr>${headers.map(header => `<td style="border:1px solid #cbd5e1;padding:8px;font-size:12px;vertical-align:top;">${String((row as any)[header] || '—')}</td>`).join('')}</tr>`
    )).join('');
    printWindow.document.write(`
      <html>
        <head>
          <title>${filenameBase}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; color: #0f172a; }
            h1 { margin: 0 0 8px; font-size: 22px; }
            p { margin: 0 0 16px; color: #475569; }
            table { width: 100%; border-collapse: collapse; }
            th { border: 1px solid #94a3b8; background: #e2e8f0; padding: 8px; font-size: 12px; text-transform: uppercase; text-align: left; }
          </style>
        </head>
        <body>
          <h1>${filenameBase.replace(/_/g, ' ')}</h1>
          <p>${rows.length} contacts exported on ${new Date().toLocaleString()}</p>
          <table>
            <thead><tr>${headers.map(header => `<th>${header.replace(/_/g, ' ')}</th>`).join('')}</tr></thead>
            <tbody>${tableRows}</tbody>
          </table>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    notify(`Prepared ${rows.length} contacts for PDF export`);
  };

  // ── Derived UI values ────────────────────────────────────────────────────────
  const cfg     = PILL_CONFIG[filterView];
  const selectedAudience = contractors.filter(c => selected.has(c.id));
  const selectedTestCount = selectedAudience.filter(isTestLikeContractor).length;
  const selectedRealCount = selectedAudience.length - selectedTestCount;
  const selectedAudienceTone = selectedAudience.length === 0
    ? null
    : selectedTestCount === selectedAudience.length
      ? {
          wrap: 'bg-amber-50 border-amber-200',
          text: 'text-amber-900',
          sub: 'text-amber-800',
          label: 'Test audience selected',
          detail: 'This campaign is pointed at test contractors only. Use it for dry runs and QA, not live outreach.',
        }
      : selectedRealCount === selectedAudience.length
        ? {
            wrap: 'bg-emerald-50 border-emerald-200',
            text: 'text-emerald-900',
            sub: 'text-emerald-800',
            label: 'Live audience selected',
            detail: 'This campaign targets real contractor accounts. Review the audience and template carefully before sending.',
          }
        : {
            wrap: 'bg-orange-50 border-orange-200',
            text: 'text-orange-900',
            sub: 'text-orange-800',
            label: 'Mixed audience selected',
          detail: 'This audience contains both real and test contractors. Split them before sending to avoid confusion.',
        };
  const hiddenRealNeedsEnrichmentCount = pipeline.filter(c => !isTestLikeContractor(c) && needsContactEnrichment(c)).length;
  const folderCounts = (['newToday', 'readyCold', 'followUpDue', 'waiting', 'converted', 'noEmail', 'all'] as OutreachFolder[]).reduce((acc, folder) => {
    acc[folder] = folder === 'all'
      ? contractors.length
      : contractors.filter(c => getCampaignFolder(c) === folder).length;
    return acc;
  }, {} as Record<OutreachFolder, number>);
  const outreachAlerts = [
    {
      key: 'newToday',
      count: folderCounts.newToday,
      title: 'New pull available',
      detail: 'Review the latest contractors added today before they roll into the backlog.',
    },
    {
      key: 'readyCold',
      count: folderCounts.readyCold,
      title: 'Cold campaign ready',
      detail: 'These contractors have email addresses and have not been contacted yet.',
    },
    {
      key: 'followUpDue',
      count: folderCounts.followUpDue,
      title: 'Follow-ups due',
      detail: 'These contractors have aged into the next touch window and need follow-up action.',
    },
    {
      key: 'noEmail',
      count: folderCounts.noEmail,
      title: 'Needs enrichment',
      detail: 'These contractors do not have a deliverable email yet and should be enriched before an email campaign.',
    },
  ].filter(alert => alert.count > 0) as Array<{ key: OutreachFolder; count: number; title: string; detail: string }>;
  const fieldOptions = ['all', ...Array.from(new Set(contractors.map(contractorFieldCategory))).sort()];
  const visible = contractors.filter(c => {
    if (!contractorMatchesSearch(c, searchTerm)) return false;
    const folderMatch = outreachFolder === 'all' || getCampaignFolder(c) === outreachFolder;
    if (!folderMatch) return false;
    if (quickSegments.states.length > 0 && !quickSegments.states.includes(c.state || '')) return false;
    if (quickSegments.setAside !== 'all' && (c.business_type || '') !== quickSegments.setAside) return false;
    if (quickSegments.field !== 'all' && contractorFieldCategory(c) !== quickSegments.field) return false;
    if (quickSegments.hasEmail === 'withEmail' && !c.email) return false;
    if (quickSegments.hasEmail === 'missingEmail' && !!c.email) return false;
    if (filterView === 'contacted')  return c.contacted;
    if (filterView === 'enrolled')   return c.enrolled;
    if (filterView === 'inProgress') return c.contacted && !c.enrolled;
    if (filterView === 'success')    return c.enrolled;
    return true;
  });
  const outreachExportRows = selected.size > 0
    ? visible.filter(c => selected.has(c.id))
    : visible;
  const activeFC = [
    filters.registrationDateFrom || filters.registrationDateTo,
    filters.naicsCodes.length > 0,
    filters.states.length > 0,
    filters.businessTypes.length > 0,
    quickSegments.states.length > 0,
    quickSegments.setAside !== 'all',
    quickSegments.field !== 'all',
    quickSegments.hasEmail !== 'all',
  ].filter(Boolean).length;

  const pipeByStage = (Object.keys(STAGES) as PipelineStage[]).reduce((acc, s) => {
    acc[s] = pipeline.filter(c =>
      (c.pipeline_stage || 'new') === s &&
      (!crmSearch || c.name.toLowerCase().includes(crmSearch.toLowerCase()))
    );
    return acc;
  }, {} as Record<PipelineStage, Contractor[]>);

  const now = new Date();
  const oppTypeOptions = ['all', ...Array.from(new Set(liveOpps.map(o => o.type).filter(Boolean))).sort()];
  const oppSetAsideOptions = ['all', ...Array.from(new Set(liveOpps.map(o => o.setAside).filter(Boolean) as string[])).sort()];
  const filteredOpps = liveOpps.filter(o => {
    if (!opportunityMatchesSearch(o, oppSearch)) return false;
    if (oppSegments.states.length > 0 && !oppSegments.states.includes(o.businessState || '')) return false;
    if (oppSegments.setAside !== 'all' && (o.setAside || '') !== oppSegments.setAside) return false;
    if (oppSegments.type !== 'all' && (o.type || '') !== oppSegments.type) return false;
    if (oppSegments.field !== 'all' && fieldCategoryForCode(o.naicsCode) !== oppSegments.field) return false;
    return true;
  });
  const activeOpps  = filteredOpps.filter(o => new Date(o.responseDeadline) >= now);
  const expiredOpps = filteredOpps.filter(o => new Date(o.responseDeadline) <  now);

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">

      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-[100] px-5 py-3 rounded-xl shadow-xl font-semibold text-sm flex items-center gap-2 transition-all ${
          toast.type === 'success' ? 'bg-emerald-600 text-white' :
          toast.type === 'error'   ? 'bg-red-600 text-white' :
                                     'bg-blue-600 text-white'
        }`}>
          {toast.type === 'success' && <CheckCircle2 className="w-4 h-4" />}
          {toast.type === 'error'   && <AlertCircle  className="w-4 h-4" />}
          {toast.type === 'info'    && <Bell         className="w-4 h-4" />}
          {toast.msg}
        </div>
      )}

      {/* ── Solid Header ─────────────────────────────────────────────────────── */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border-b-4 border-orange-500">
        <div className="px-8 py-8">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-lg shadow-orange-500/20">
                <GitBranch className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-black text-white tracking-tight">PreciseGovCon CRM</h1>
                <p className="text-slate-400 mt-0.5 font-medium">Full-funnel contractor acquisition — track, engage, convert</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {overdueCount > 0 && (
                <div className="relative group">
                  <button onClick={() => setActiveTab('crm')} className="flex items-center gap-2 px-4 py-2.5 bg-red-500/20 border border-red-500/40 rounded-xl text-sm font-bold text-red-300 hover:bg-red-500/30 transition">
                    <AlertTriangle className="w-4 h-4" />{overdueCount} Overdue Task{overdueCount !== 1 ? 's' : ''}
                  </button>
                  {/* Tooltip on hover — shows which tasks are overdue */}
                  <div className="absolute right-0 top-full mt-2 w-72 bg-slate-900 border border-red-500/30 rounded-xl shadow-2xl p-3 z-50 hidden group-hover:block">
                    <p className="text-xs font-black text-red-400 uppercase tracking-wide mb-2">⚠️ Overdue Tasks</p>
                    <div className="space-y-1.5">
                      {tasks.filter(t => t.status === 'overdue').slice(0, 5).map(t => (
                        <div key={t.id} className="flex items-start gap-2">
                          <AlertTriangle className="w-3 h-3 text-red-400 mt-0.5 flex-shrink-0" />
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-white truncate">{t.title}</p>
                            <p className="text-xs text-slate-400">{t.contractor_name} · Due {t.due_date?.slice(0, 10)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-slate-500 mt-2">Click to open CRM & Pipeline tab to manage tasks</p>
                  </div>
                </div>
              )}
              {trialsEndSoon > 0 && (
                <button onClick={() => setActiveTab('crm')} className="flex items-center gap-2 px-4 py-2.5 bg-amber-500/20 border border-amber-500/40 rounded-xl text-sm font-bold text-amber-300 hover:bg-amber-500/30 transition">
                  <Timer className="w-4 h-4" />{trialsEndSoon} Trial Ending
                </button>
              )}
              <button
                onClick={async () => {
                  setSyncSt('syncing');
                  try {
                    const r = await fetch(`/api/cron/sam-sync?days=90&limit=300&requireEmail=true`, {
                      method: 'GET',
                      headers: { 'Authorization': `Bearer ${process.env.NEXT_PUBLIC_CRON_SECRET || ''}` },
                    });
                    const d = await r.json();
                    if (r.ok && d.success) {
                      setSyncSt('ok');
                      setOutreachFolder('newToday');
                      const detail = typeof d?.skippedNoEmailCount === 'number'
                        ? ` Filtered out ${d.skippedNoEmailCount} with no email.`
                        : '';
                      notify(`✅ Synced ${d.synced || 0} contactable contractors (${d.newRecords || 0} new).${detail}`);
                      fetchPipeline();
                      fetchStats();
                      if (activeTab === 'outreach') fetchContractors();
                    } else {
                      const detail = typeof d?.missingEmailCount === 'number'
                        ? ` Missing email: ${d.missingEmailCount}. Accepted email: ${d.acceptedEmailCount || 0}. Skipped no email: ${d.skippedNoEmailCount || 0}.`
                        : '';
                      const apiDetail = d?.lastApiError ? ` ${d.lastApiError}` : '';
                      throw new Error((d.error || 'Sync failed') + detail + apiDetail);
                    }
                  } catch (e: any) { 
                    setSyncSt('idle'); 
                    notify(e.message || 'Sync failed', 'error'); 
                  }
                  setTimeout(() => setSyncSt('idle'), 4000);
                }}
                disabled={syncSt === 'syncing'}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all shadow-lg ${
                  syncSt === 'ok'
                    ? 'bg-emerald-500 text-white border border-emerald-400 shadow-emerald-500/30'
                    : syncSt === 'syncing'
                    ? 'bg-orange-500/30 border border-orange-400/50 text-orange-200 cursor-not-allowed'
                    : 'bg-orange-500 hover:bg-orange-400 text-white border border-orange-400 shadow-orange-500/30'
                }`}
              >
                <RefreshCw className={`w-4 h-4 ${syncSt === 'syncing' ? 'animate-spin' : ''}`} />
                {syncSt === 'syncing' ? 'Syncing SAM.gov...' : syncSt === 'ok' ? '✓ Sync Complete' : 'Sync SAM.gov'}
              </button>
            </div>
          </div>

          {/* ── Tabs ───────────────────────────────────────────────────────────── */}
          <div className="flex gap-2 mt-6">
            {([
              {
                id: 'crm',
                label: 'CRM & Pipeline',
                icon: GitBranch,
                color: 'from-blue-500 to-blue-600',
                idle: 'bg-blue-700 border border-blue-600 text-white hover:bg-blue-600',
              },
              {
                id: 'outreach',
                label: 'Outreach',
                icon: Mail,
                color: 'from-emerald-500 to-emerald-600',
                idle: 'bg-emerald-700 border border-emerald-600 text-white hover:bg-emerald-600',
              },
              {
                id: 'opportunities',
                label: 'Opportunities',
                icon: Target,
                color: 'from-violet-500 to-violet-600',
                idle: 'bg-violet-700 border border-violet-600 text-white hover:bg-violet-600',
              },
              {
                id: 'leadPipeline',
                label: 'Lead Pipeline',
                icon: Activity,
                color: 'from-cyan-500 to-cyan-600',
                idle: 'bg-cyan-700 border border-cyan-600 text-white hover:bg-cyan-600',
              },
              {
                id: 'templates',
                label: 'Templates',
                icon: FileText,
                color: 'from-amber-500 to-amber-600',
                idle: 'bg-amber-700 border border-amber-600 text-white hover:bg-amber-600',
              },
              {
                id: 'offerCodes',
                label: 'Offer Codes',
                icon: Tag,
                color: 'from-rose-500 to-rose-600',
                idle: 'bg-rose-700 border border-rose-600 text-white hover:bg-rose-600',
              },
              {
                id: 'sentEmails',
                label: 'Sent Emails',
                icon: Mail,
                color: 'from-sky-500 to-sky-600',
                idle: 'bg-sky-700 border border-sky-600 text-white hover:bg-sky-600',
              },
              {
                id: 'testData',
                label: 'Test Data',
                icon: AlertTriangle,
                color: 'from-orange-500 to-orange-600',
                idle: 'bg-orange-700 border border-orange-600 text-white hover:bg-orange-600',
              },
            ] as { id: ActiveTab; label: string; icon: any; color: string; idle: string }[]).map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${
                  activeTab === tab.id
                    ? `bg-gradient-to-r ${tab.color} text-white shadow-lg`
                    : tab.idle
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
                {tab.id === 'crm' && overdueCount > 0 && (
                  <span className="w-5 h-5 bg-red-500 text-white text-xs font-black rounded-full flex items-center justify-center ml-1">{overdueCount}</span>
                )}
                {tab.id === 'sentEmails' && emailLogsTotal > 0 && (
                  <span className="px-1.5 py-0.5 bg-white/20 text-white text-xs font-black rounded-full ml-1">{emailLogsTotal > 999 ? '999+' : emailLogsTotal}</span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 px-8 py-8">

        {/* ════════════════════════════════════════════════════════════════════ */}
        {/* CRM TAB                                                              */}
        {/* ════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'crm' && (
          <div className="space-y-8">

            {/* KPI Row — colorful like subscriptions */}
            <div className="grid grid-cols-5 gap-5">
              {[
                { label: 'Total Leads',    value: pipeline.length,        sub: `+${newThisWeek} this week`,          icon: Users,      gradient: 'from-slate-700 to-slate-800',   iconBg: 'bg-white/20', textColor: 'text-white', subColor: 'text-slate-300' },
                { label: 'Conversion Rate',value: `${convRate}%`,         sub: 'Pipeline → Converted',               icon: TrendingUp, gradient: 'from-emerald-500 to-emerald-600', iconBg: 'bg-white/20', textColor: 'text-white', subColor: 'text-emerald-100' },
                { label: 'Active Trials',  value: activeTrials,           sub: `${trialsEndSoon} ending < 3 days`,   icon: Timer,      gradient: 'from-orange-500 to-orange-600',  iconBg: 'bg-white/20', textColor: 'text-white', subColor: 'text-orange-100' },
                { label: 'Total Revenue',  value: fmtUSD(totalRevenue),   sub: 'Converted contractors',              icon: DollarSign, gradient: 'from-blue-500 to-blue-600',      iconBg: 'bg-white/20', textColor: 'text-white', subColor: 'text-blue-100' },
                { label: 'Email Open Rate',value: openRate !== null ? `${openRate}%` : '—', sub: replyRate !== null ? `${replyRate}% reply rate` : 'No emails tracked yet', icon: Mail, gradient: 'from-violet-500 to-violet-600', iconBg: 'bg-white/20', textColor: 'text-white', subColor: 'text-violet-100' },
              ].map(k => (
                <div key={k.label} className={`bg-gradient-to-br ${k.gradient} rounded-2xl px-6 py-5 shadow-lg relative overflow-hidden`}>
                  <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full -translate-y-8 translate-x-8" />
                  <div className="flex items-center justify-between mb-3">
                    <div className={`w-10 h-10 rounded-xl ${k.iconBg} flex items-center justify-center backdrop-blur`}>
                      <k.icon className="w-5 h-5 text-white" />
                    </div>
                    <ArrowUp className="w-4 h-4 text-white/40" />
                  </div>
                  <p className={`text-3xl font-black ${k.textColor} tracking-tight`}>{k.value}</p>
                  <p className={`text-sm font-semibold ${k.subColor} mt-0.5`}>{k.label}</p>
                  <p className={`text-xs ${k.subColor} opacity-70 mt-0.5`}>{k.sub}</p>
                </div>
              ))}
            </div>

            {/* Pipeline — Full-width data table */}
            {(() => {
              const basePipeline = [...pipeline]
                .filter(c => (
                  crmSegments.companyType === 'test'
                    ? isTestLikeContractor(c)
                    : crmSegments.companyType === 'all'
                      ? true
                      : !isTestLikeContractor(c)
                ));

              const contactableRealPipeline = basePipeline.filter(c => (
                crmSegments.companyType === 'real'
                  ? hasContactMethod(c)
                  : true
              ));

              const showingRealEnrichmentFallback = crmSegments.companyType === 'real' && contactableRealPipeline.length === 0 && basePipeline.length > 0;

              const sortedPipeline = (showingRealEnrichmentFallback ? basePipeline : contactableRealPipeline)
                .filter(c => contractorMatchesSearch(c, crmSearch))
                .filter(c => stageFilter === 'all' || (c.pipeline_stage || 'new') === stageFilter)
                .filter(c => !crmSegments.naicsFilter || (c.naics_code || '').startsWith(crmSegments.naicsFilter.trim()))
                .filter(c => !crmSegments.regDateFrom  || (c.registration_date && c.registration_date >= crmSegments.regDateFrom))
                .filter(c => !crmSegments.regDateTo    || (c.registration_date && c.registration_date <= crmSegments.regDateTo))
                .filter(c => crmSegments.contactedFilter === 'all' ? true : crmSegments.contactedFilter === 'contacted' ? !!c.contacted : !c.contacted)
                .filter(c => crmSegments.enrolledFilter  === 'all' ? true : crmSegments.enrolledFilter  === 'enrolled'  ? !!c.enrolled  : !c.enrolled)
                .sort((a, b) => {
                  let av: any = a[sortKey as keyof Contractor] ?? '';
                  let bv: any = b[sortKey as keyof Contractor] ?? '';
                  if (sortKey === 'score') { av = Number(av); bv = Number(bv); }
                  const cmp = av < bv ? -1 : av > bv ? 1 : 0;
                  return sortDir === 'asc' ? cmp : -cmp;
                });

              const toggleSort = (k: PipeSortKey) => {
                if (sortKey === k) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
                else { setSortKey(k); setSortDir('desc'); }
              };

              const crmFilterTone = crmSegments.companyType === 'test'
                ? {
                    wrap: 'bg-amber-50 border-amber-200',
                    icon: 'bg-amber-500',
                    text: 'text-amber-900',
                    sub: 'text-amber-800',
                    label: 'Filtered to test companies only',
                    detail: 'Campaigns started from this view are test-safe and should not be treated as live outreach.',
                  }
                : crmSegments.companyType === 'all'
                  ? {
                      wrap: 'bg-orange-50 border-orange-200',
                      icon: 'bg-orange-500',
                      text: 'text-orange-900',
                      sub: 'text-orange-800',
                      label: 'Mixed view: real and test companies',
                      detail: 'Review the company type before sending a campaign. Test records should stay out of live outreach.',
                    }
                  : {
                      wrap: 'bg-emerald-50 border-emerald-200',
                      icon: 'bg-emerald-500',
                      text: 'text-emerald-900',
                      sub: 'text-emerald-800',
                      label: 'Filtered to real companies only',
                      detail: showingRealEnrichmentFallback
                        ? `No contactable live companies are available yet, so this view is temporarily showing ${basePipeline.length.toLocaleString()} real compan${basePipeline.length === 1 ? 'y' : 'ies'} that still need enrichment.`
                        : hiddenRealNeedsEnrichmentCount > 0
                        ? `Campaign-ready live contractors are shown here first. ${hiddenRealNeedsEnrichmentCount} real compan${hiddenRealNeedsEnrichmentCount === 1 ? 'y is' : 'ies are'} missing both email and phone and should be worked from Lead Pipeline or Outreach > Needs Enrichment.`
                        : 'Campaigns started from this view target live contractor accounts unless you manually add test records.',
                    };

              const allSelected = crmSelected.size === sortedPipeline.length && sortedPipeline.length > 0;
              const toggleAll   = () => setCrmSelected(allSelected ? new Set() : new Set(sortedPipeline.map(c => c.id)));
              const crmExportRows = crmSelected.size > 0
                ? sortedPipeline.filter(c => crmSelected.has(c.id))
                : sortedPipeline;

              const SortIcon = ({ k }: { k: PipeSortKey }) => sortKey !== k ? null : (
                <span className="ml-0.5 text-orange-400">{sortDir === 'asc' ? '↑' : '↓'}</span>
              );

              const Th = ({ k, label, cls = '' }: { k: PipeSortKey; label: string; cls?: string }) => (
                <th className={`px-3 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider cursor-pointer hover:text-slate-800 select-none ${cls}`} onClick={() => toggleSort(k)}>
                  {label}<SortIcon k={k} />
                </th>
              );

              const saveTrialDates = async (id: string) => {
                const t = trialEdits[id];
                if (!t) return;
                await fetch('/api/crm/pipeline', {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ id, trial_start: t.start, trial_end: t.end, pipeline_stage: 'trial' }),
                });
                setPipeline(p => p.map(c => c.id === id ? { ...c, trial_start: t.start, trial_end: t.end, pipeline_stage: 'trial' } : c));
                setTrialEdits(prev => { const n = { ...prev }; delete n[id]; return n; });
                notify('Trial dates saved');
              };

              return (
                <div className="space-y-4">
                  {/* Pipeline table card */}
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    {/* Toolbar */}
                    <div className="px-5 py-3.5 border-b border-slate-100 flex items-center gap-3 flex-wrap">
                      <div>
                        <h2 className="font-black text-slate-900 text-sm">Sales Pipeline</h2>
                        <p className="text-xs text-slate-400">{sortedPipeline.length} of {pipeline.length} leads</p>
                      </div>
                      <AudienceDropdown
                        label="Company Type"
                        value={crmSegments.companyType}
                        onChange={(value) => setCrmSegments(prev => ({ ...prev, companyType: value }))}
                        open={crmAudienceOpen}
                        setOpen={setCrmAudienceOpen}
                        options={COMPANY_AUDIENCE_OPTIONS}
                      />
                      <button
                        onClick={() => setShowAddTest(true)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-100 text-violet-700 border border-violet-200 rounded-lg text-xs font-bold hover:bg-violet-200 transition"
                      >
                        <Plus className="w-3.5 h-3.5" />Add Test Company
                      </button>
                      <select
                        value={crmSegments.setAside}
                        onChange={e => setCrmSegments(prev => ({ ...prev, setAside: e.target.value }))}
                        className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 bg-slate-50 focus:outline-none"
                      >
                        {SET_ASIDE_OPTIONS.map(option => (
                          <option key={option} value={option}>{option === 'all' ? 'All Set-Asides' : option}</option>
                        ))}
                      </select>
                      <select
                        value={crmSegments.field}
                        onChange={e => setCrmSegments(prev => ({ ...prev, field: e.target.value }))}
                        className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 bg-sky-50 focus:outline-none"
                      >
                        <option value="all">All Fields</option>
                        {fieldOptions.filter(option => option !== 'all').map(option => (
                          <option key={option} value={option}>{option}</option>
                        ))}
                      </select>
                      <select
                        value=""
                        onChange={e => {
                          const value = e.target.value;
                          if (!value) return;
                          setCrmSegments(prev => ({
                            ...prev,
                            states: prev.states.includes(value) ? prev.states : [...prev.states, value],
                          }));
                        }}
                        className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 bg-amber-50 focus:outline-none"
                      >
                        <option value="">State / Territory</option>
                        {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                      {crmSegments.states.length > 0 && (
                        <div className="flex items-center gap-1 flex-wrap">
                          {crmSegments.states.map(s => (
                            <button
                              key={s}
                              onClick={() => setCrmSegments(prev => ({ ...prev, states: prev.states.filter(x => x !== s) }))}
                              className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-lg font-mono font-bold bg-blue-600 text-white"
                            >
                              {s}
                              <X className="w-3 h-3" />
                            </button>
                          ))}
                        </div>
                      )}
                      {/* NAICS code filter */}
                      <input
                        value={crmSegments.naicsFilter}
                        onChange={e => setCrmSegments(prev => ({ ...prev, naicsFilter: e.target.value }))}
                        placeholder="NAICS prefix..."
                        className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 bg-green-50 focus:outline-none w-32"
                      />
                      {/* Contacted filter */}
                      <select
                        value={crmSegments.contactedFilter}
                        onChange={e => setCrmSegments(prev => ({ ...prev, contactedFilter: e.target.value as any }))}
                        className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 bg-blue-50 focus:outline-none"
                      >
                        <option value="all">All Contacted</option>
                        <option value="contacted">✅ Contacted</option>
                        <option value="not_contacted">❌ Not Contacted</option>
                      </select>
                      {/* Enrolled filter */}
                      <select
                        value={crmSegments.enrolledFilter}
                        onChange={e => setCrmSegments(prev => ({ ...prev, enrolledFilter: e.target.value as any }))}
                        className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 bg-purple-50 focus:outline-none"
                      >
                        <option value="all">All Enrolled</option>
                        <option value="enrolled">✅ Enrolled</option>
                        <option value="not_enrolled">❌ Not Enrolled</option>
                      </select>
                      {/* Reg date range */}
                      <div className="flex items-center gap-1">
                        <input
                          type="date"
                          value={crmSegments.regDateFrom}
                          onChange={e => setCrmSegments(prev => ({ ...prev, regDateFrom: e.target.value }))}
                          className="px-2 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-700 bg-orange-50 focus:outline-none"
                          title="Registration date from"
                        />
                        <span className="text-xs text-slate-400">→</span>
                        <input
                          type="date"
                          value={crmSegments.regDateTo}
                          onChange={e => setCrmSegments(prev => ({ ...prev, regDateTo: e.target.value }))}
                          className="px-2 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-700 bg-orange-50 focus:outline-none"
                          title="Registration date to"
                        />
                        {(crmSegments.regDateFrom || crmSegments.regDateTo) && (
                          <button onClick={() => setCrmSegments(prev => ({ ...prev, regDateFrom: '', regDateTo: '' }))} className="p-1 rounded text-slate-400 hover:text-red-500">
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                      {/* Stage filter pills */}
                      <div className="flex gap-1 flex-wrap items-center">
                        <button onClick={() => setStageFilter('all')} className={`text-xs px-2.5 py-1 rounded-lg font-bold transition ${stageFilter === 'all' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>All</button>
                        {(Object.keys(STAGES) as PipelineStage[]).map(s => {
                          const sc = STAGES[s as PipelineStage]; const SI = sc.icon; const cnt = funnel[s] || 0; if (!cnt && stageFilter !== s) return null;
                          return (
                            <button key={s} onClick={() => setStageFilter(stageFilter === s ? 'all' : s)} className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg font-bold transition ${stageFilter === s ? `${sc.bg} ${sc.color} border ${sc.border}` : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
                              <SI className="w-3 h-3" />{sc.label} <span className="opacity-60">{cnt}</span>
                            </button>
                          );
                        })}
                      </div>
                      {/* Active filter chips */}
                      {(crmSegments.naicsFilter || crmSegments.contactedFilter !== 'all' || crmSegments.enrolledFilter !== 'all' || crmSegments.regDateFrom || crmSegments.regDateTo) && (
                        <button
                          onClick={() => setCrmSegments(prev => ({ ...prev, naicsFilter: '', regDateFrom: '', regDateTo: '', contactedFilter: 'all', enrolledFilter: 'all' }))}
                          className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg font-bold bg-red-100 text-red-700 hover:bg-red-200 transition"
                        >
                          <X className="w-3 h-3" />Clear Filters
                        </button>
                      )}
                      <div className="ml-auto flex items-center gap-2">
                        <div className="flex items-center gap-1">
                          {(['csv', 'txt', 'json', 'pdf'] as const).map(format => (
                            <button
                              key={format}
                              type="button"
                              onClick={() => exportContractorsList(crmExportRows, format, `crm_contacts_${crmSegments.companyType}_${new Date().toISOString().slice(0, 10)}`)}
                              className="px-2.5 py-2 border border-slate-200 rounded-lg text-[11px] font-black uppercase text-slate-700 bg-white hover:border-orange-300 hover:text-orange-700"
                            >
                              {format}
                            </button>
                          ))}
                        </div>
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                          <input
                            value={crmSearch}
                            onChange={e => setCrmSearch(e.target.value)}
                            placeholder="Search or use state:VA, naics:541512..."
                            className="pl-9 pr-4 py-2.5 border-2 border-slate-300 rounded-xl text-sm font-semibold text-black placeholder:text-slate-500 focus:outline-none bg-white w-80"
                          />
                        </div>
                        {crmSelected.size > 0 && (
                          <button onClick={() => setShowCampaign(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg text-xs font-bold hover:from-orange-600 hover:to-orange-700 transition shadow-sm">
                            <Mail className="w-3.5 h-3.5" />{crmSelected.size} Selected — Send Campaign
                          </button>
                        )}
                        <button onClick={fetchPipeline} className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition">
                          <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
                        </button>
                      </div>
                    </div>

                    <div className={`mx-5 mt-4 rounded-2xl border px-4 py-3 flex items-start gap-3 ${crmFilterTone.wrap}`}>
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-white ${crmFilterTone.icon}`}>
                        <AlertTriangle className="w-4 h-4" />
                      </div>
                      <div>
                        <p className={`text-sm font-black ${crmFilterTone.text}`}>{crmFilterTone.label}</p>
                        <p className={`text-xs mt-1 ${crmFilterTone.sub}`}>{crmFilterTone.detail}</p>
                      </div>
                    </div>

                    {/* Table */}
                    {crmLoading ? (
                      <div className="flex items-center justify-center py-16 text-slate-400"><Loader2 className="w-5 h-5 animate-spin mr-2" />Loading pipeline...</div>
                    ) : (
                      <div className="overflow-auto max-h-[600px]">
                        <table className="w-full min-w-[960px]">
                          <thead className="bg-slate-50 border-b border-slate-100 sticky top-0 z-10">
                            <tr>
                              <th className="px-3 py-3 w-8 bg-slate-50">
                                <input type="checkbox" checked={allSelected} onChange={toggleAll} className="w-3.5 h-3.5 rounded border-slate-300 cursor-pointer" />
                              </th>
                              <Th k="name"              label="Company"     cls="min-w-[200px] bg-slate-50" />
                              <th className="px-3 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider min-w-[190px] bg-slate-50">Email</th>
                              <th className="px-3 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider min-w-[140px] bg-slate-50">Phone</th>
                              <Th k="state"             label="State"       cls="w-16 bg-slate-50" />
                              <Th k="naics_code"        label="NAICS"       cls="w-24 bg-slate-50" />
                              <th className="px-3 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider w-36 bg-slate-50">Set-Aside</th>
                              <Th k="registration_date" label="Reg. Date"   cls="w-28 bg-slate-50" />
                              <Th k="pipeline_stage"    label="Stage"       cls="w-32 bg-slate-50" />
                              <Th k="trial_end"         label="Trial"       cls="w-52 bg-slate-50" />
                              <Th k="score"             label="Score"       cls="w-16 bg-slate-50" />
                              <th className="px-3 py-3 w-28 bg-slate-50 text-xs font-bold text-slate-500 uppercase tracking-wider">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50">
                            {sortedPipeline.map(c => {
                              const sc  = STAGES[(c.pipeline_stage || 'new') as PipelineStage];
                              const SI  = sc.icon;
                              const sel = crmSelected.has(c.id);
                              const te  = trialEdits[c.id];
                              const isTrial = (c.pipeline_stage || 'new') === 'trial';
                              const trialDaysLeft = c.trial_end ? Math.ceil((new Date(c.trial_end).getTime() - Date.now()) / 86400000) : null;
                              return (
                                <tr key={c.id} className={`group hover:bg-blue-100 transition ${sel ? 'bg-blue-50' : ''}`}>
                                  <td className="px-3 py-2.5" onClick={e => e.stopPropagation()}>
                                    <input type="checkbox" checked={sel} onChange={() => {
                                      const s = new Set<string>(crmSelected);
                                      sel ? s.delete(c.id) : s.add(c.id);
                                      setCrmSelected(s);
                                    }} className="w-3.5 h-3.5 rounded border-slate-300 cursor-pointer" />
                                  </td>
                                  <td className="px-3 py-2.5 cursor-pointer" onClick={() => openDrawer(c)}>
                                    <p className="font-bold text-sm text-slate-900 leading-tight truncate max-w-[200px]">{c.name}</p>
                                    <p className="text-xs text-slate-400 truncate max-w-[200px]">{c.business_type || 'Small Business'}</p>
                                    {c.business_type && c.business_type !== 'Small Business' && (
                                      <span className={`text-xs px-1.5 py-0.5 rounded font-semibold mt-0.5 inline-block ${bizBadge(c.business_type)}`}>{c.business_type}</span>
                                    )}
                                  </td>
                                  <td className="px-3 py-2.5 text-xs">
                                    {c.email ? (
                                      <span className="text-slate-700 font-medium break-all">{c.email}</span>
                                    ) : (
                                      <span className="text-slate-400">No email</span>
                                    )}
                                  </td>
                                  <td className="px-3 py-2.5 text-xs">
                                    {c.phone ? (
                                      <span className="text-slate-700 font-medium">{c.phone}</span>
                                    ) : (
                                      <span className="text-slate-400">No phone</span>
                                    )}
                                  </td>
                                  <td className="px-3 py-2.5 text-xs font-bold text-slate-600">{c.state || '—'}</td>
                                  <td className="px-3 py-2.5">
                                    <span className="font-mono text-xs text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">{c.naics_code || '—'}</span>
                                  </td>
                                  <td className="px-3 py-2.5">
                                    <span className={`text-xs px-1.5 py-0.5 rounded font-semibold ${bizBadge(c.business_type)}`}>{c.business_type || 'Small Business'}</span>
                                  </td>
                                  <td className="px-3 py-2.5 text-xs text-slate-500 font-mono">{c.registration_date ? c.registration_date.slice(0, 10) : '—'}</td>
                                  <td className="px-3 py-2.5" onClick={e => e.stopPropagation()}>
                                    <div className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-lg w-fit ${sc.bg} ${sc.color}`}>
                                      <SI className="w-3 h-3 flex-shrink-0" />
                                      <select value={c.pipeline_stage || 'new'} onChange={e => stageChange(c.id, e.target.value as PipelineStage)} className={`bg-transparent border-none outline-none cursor-pointer font-bold text-xs ${sc.color} appearance-none`}>
                                        {(Object.keys(STAGES) as PipelineStage[]).map(s => (
                                          <option key={s} value={s}>{STAGES[s as PipelineStage].label}</option>
                                        ))}
                                      </select>
                                    </div>
                                  </td>
                                  <td className="px-3 py-2.5" onClick={e => e.stopPropagation()}>
                                    {te ? (
                                      <div className="flex flex-col gap-1">
                                        <div className="flex gap-1 items-center">
                                          <input type="date" value={te.start} onChange={e => setTrialEdits(p => ({ ...p, [c.id]: { ...p[c.id], start: e.target.value } }))} className="text-xs border border-slate-200 rounded px-1.5 py-0.5 w-[108px] focus:outline-none focus:border-orange-400" />
                                          <span className="text-xs text-slate-400">→</span>
                                          <input type="date" value={te.end}   onChange={e => setTrialEdits(p => ({ ...p, [c.id]: { ...p[c.id], end:   e.target.value } }))} className="text-xs border border-slate-200 rounded px-1.5 py-0.5 w-[108px] focus:outline-none focus:border-orange-400" />
                                        </div>
                                        <div className="flex gap-1">
                                          <button onClick={() => saveTrialDates(c.id)} className="text-xs px-2 py-0.5 bg-orange-600 text-white rounded font-bold hover:bg-orange-700">Save</button>
                                          <button onClick={() => setTrialEdits(p => { const n = { ...p }; delete n[c.id]; return n; })} className="text-xs px-2 py-0.5 border border-slate-300 text-slate-700 rounded hover:bg-slate-200">×</button>
                                        </div>
                                      </div>
                                    ) : isTrial && c.trial_end ? (
                                      <button onClick={() => setTrialEdits(p => ({ ...p, [c.id]: { start: c.trial_start?.slice(0,10) || '', end: c.trial_end?.slice(0,10) || '' } }))}
                                        className={`text-xs font-semibold px-2 py-1 rounded-lg flex items-center gap-1 ${trialDaysLeft !== null && trialDaysLeft <= 3 ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'} hover:opacity-80 transition`}>
                                        <Timer className="w-3 h-3" />
                                        {trialDaysLeft !== null && trialDaysLeft > 0 ? `${trialDaysLeft}d left` : 'Expired'} · {c.trial_end.slice(0,10)}
                                      </button>
                                    ) : (
                                      <button onClick={() => {
                                        const today = new Date().toISOString().slice(0,10);
                                        const end14 = new Date(Date.now() + 14*86400000).toISOString().slice(0,10);
                                        setTrialEdits(p => ({ ...p, [c.id]: { start: today, end: end14 } }));
                                      }} className="text-xs text-slate-700 bg-slate-200 hover:bg-orange-600 hover:text-white px-2 py-1 rounded-lg transition flex items-center gap-1 opacity-0 group-hover:opacity-100">
                                        <Plus className="w-3 h-3" />Set Trial
                                      </button>
                                    )}
                                  </td>
                                  <td className="px-3 py-2.5">
                                    {c.score != null && (
                                      <span className={`text-xs font-black px-2 py-0.5 rounded-lg ${scoreBg(c.score)}`}>{c.score}</span>
                                    )}
                                  </td>
                                  <td className="px-3 py-2.5" onClick={e => e.stopPropagation()}>
                                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition">
                                      <button
                                        onClick={() => openDrawer(c)}
                                        title="View details"
                                        className="p-1.5 hover:bg-blue-100 rounded-lg text-slate-400 hover:text-blue-600 transition"
                                      >
                                        <Eye className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        onClick={() => setEditContractor(c)}
                                        title="Edit contractor"
                                        className="p-1.5 hover:bg-amber-100 rounded-lg text-slate-400 hover:text-amber-600 transition"
                                      >
                                        <Edit3 className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        onClick={() => {
                                          setCrmSelected(new Set([c.id]));
                                          setShowCampaign(true);
                                        }}
                                        title="Add to campaign"
                                        className="p-1.5 hover:bg-orange-100 rounded-lg text-slate-400 hover:text-orange-600 transition"
                                      >
                                        <Mail className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        onClick={async () => {
                                          if (!confirm(`Delete "${c.name}"? This cannot be undone.`)) return;
                                          try {
                                            const r = await fetch(`/api/outreach/contractors/${c.id}`, { method: 'DELETE' });
                                            if (r.ok) {
                                              notify(`🗑️ Deleted ${c.name}`);
                                              fetchPipeline();
                                            } else {
                                              const d = await r.json();
                                              notify(d.error || 'Delete failed', 'error');
                                            }
                                          } catch { notify('Delete failed', 'error'); }
                                        }}
                                        title="Delete contractor"
                                        className="p-1.5 hover:bg-red-100 rounded-lg text-slate-400 hover:text-red-500 transition"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                            {sortedPipeline.length === 0 && (
                              <tr><td colSpan={12} className="py-16 text-center text-sm text-slate-400">No leads match current filters</td></tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    )}
                    {sortedPipeline.length > 0 && (
                      <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
                        <span className="text-xs text-slate-500">{sortedPipeline.length} leads{crmSelected.size > 0 ? ` · ${crmSelected.size} selected` : ' · Click rows to select for campaign'}</span>
                        <div className="flex items-center gap-4 text-xs">
                          {(Object.keys(STAGES) as PipelineStage[]).filter(s => (funnel[s] || 0) > 0).map(s => (
                            <span key={s} className={`font-bold ${STAGES[s as PipelineStage].color}`}>{STAGES[s as PipelineStage].label}: {funnel[s]}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Campaign launcher */}
                  {showCampaign && (
                    <div className="bg-white rounded-2xl border-2 border-orange-200 shadow-lg p-5">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center">
                            <Mail className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <h3 className="font-black text-slate-900 text-sm">Email Campaign</h3>
                            <p className="text-xs text-slate-500">{crmSelected.size} contractor{crmSelected.size !== 1 ? 's' : ''} selected from pipeline</p>
                          </div>
                        </div>
                        <button onClick={() => setShowCampaign(false)} className="p-1.5 hover:bg-slate-100 rounded-lg"><X className="w-4 h-4 text-slate-400" /></button>
                      </div>
                      <div className="flex gap-3 items-end flex-wrap">
                        <div className="flex-1 min-w-[240px]">
                          <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">Select Template</label>
                          <select className="w-full px-3 py-2.5 border-2 border-slate-200 rounded-xl text-sm font-semibold text-slate-700 bg-white focus:outline-none focus:border-orange-400"
                            onChange={e => { const t = templates.find(x => x.id === e.target.value); if (t) setCampaignTpl(t); }} defaultValue="">
                            <option value="" disabled>Choose a template...</option>
                            {templates.map(t => <option key={t.id} value={t.id}>{t.name} — {t.category}</option>)}
                          </select>
                        </div>
                        <button
                          onClick={() => { setContractors(pipeline.filter(c => crmSelected.has(c.id))); setSelected(new Set<string>(crmSelected)); setCurTemplate(campaignTpl); setShowSendModal(true); setShowCampaign(false); }}
                          disabled={!campaignTpl}
                          className="px-5 py-2.5 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl text-sm font-bold hover:from-orange-600 hover:to-orange-700 disabled:opacity-40 disabled:cursor-not-allowed transition shadow-sm flex items-center gap-2"
                        >
                          <Send className="w-4 h-4" />Send Campaign
                        </button>
                        <button onClick={async () => { const sel = pipeline.filter(c => crmSelected.has(c.id)); setContractors(sel); setSelected(new Set<string>(crmSelected)); await genAI(); setShowSendModal(true); setShowCampaign(false); }}
                          className="px-4 py-2.5 border-2 border-orange-300 text-orange-700 rounded-xl text-sm font-bold hover:bg-orange-50 transition flex items-center gap-2">
                          <Sparkles className="w-4 h-4" />AI Generate
                        </button>
                      </div>
                      {campaignTpl && (
                        <div className="mt-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                          <p className="text-xs font-bold text-slate-700">{campaignTpl.subject}</p>
                          <p className="text-xs text-slate-400 mt-1 line-clamp-2">{campaignTpl.body?.slice(0,120)}...</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Tasks + Activity + Funnel as 3-col row below table */}
                  <div className="grid grid-cols-3 gap-4">

                    {/* Tasks */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <ListTodo className="w-4 h-4 text-slate-600" />
                          <h2 className="font-black text-slate-900 text-sm">Tasks</h2>
                          {overdueCount > 0 && (
                            <span className="text-xs font-black bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full">{overdueCount} overdue</span>
                          )}
                        </div>
                        <button onClick={() => { setEditTask({ priority: 'medium', status: 'pending' }); setNewTaskModal(true); }} className="w-7 h-7 bg-slate-800 text-white rounded-lg flex items-center justify-center hover:bg-slate-700 transition">
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
                        {tasks.filter(t => t.status !== 'done').sort((a, b) => a.status === 'overdue' ? -1 : 1).map(task => (
                          <div key={task.id} className={`px-4 py-3 flex items-start gap-3 ${task.status === 'overdue' ? 'bg-red-50' : ''}`}>
                            <button onClick={() => completeTask(task.id)} className={`mt-0.5 w-4 h-4 rounded border-2 flex-shrink-0 flex items-center justify-center hover:border-emerald-400 transition ${task.status === 'overdue' ? 'border-red-400' : 'border-slate-300'}`}>
                              <Check className="w-2.5 h-2.5 text-transparent hover:text-emerald-500" />
                            </button>
                            <div className="flex-1 min-w-0">
                              <p className={`text-xs font-bold leading-tight ${task.status === 'overdue' ? 'text-red-800' : 'text-slate-900'}`}>{task.title}</p>
                              <p className="text-xs text-slate-500 mt-0.5 truncate">{task.contractor_name}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${task.priority === 'high' ? 'bg-red-100 text-red-700' : task.priority === 'medium' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>{task.priority}</span>
                                <span className={`text-xs ${task.status === 'overdue' ? 'text-red-600 font-bold' : 'text-slate-400'}`}>Due {task.due_date?.slice(0, 10)}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                        {tasks.filter(t => t.status !== 'done').length === 0 && (
                          <div className="px-4 py-6 text-center text-sm text-slate-400">All tasks clear! 🎉</div>
                        )}
                      </div>
                    </div>

                    {/* Activity Feed */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                      <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
                        <Activity className="w-4 h-4 text-slate-600" />
                        <h2 className="font-black text-slate-900 text-sm">Recent Activity</h2>
                      </div>
                      <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
                        {activities.slice(0, 15).map(act => {
                          const ac = ACT_CFG[act.type] || ACT_CFG['note_added']; const AI = ac.icon;
                          return (
                            <div key={act.id} className="px-4 py-3 flex items-start gap-3">
                              <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                                <AI className={`w-3.5 h-3.5 ${ac.color}`} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-bold text-slate-700 truncate">{act.contractor_name || 'Contractor'}</p>
                                <p className="text-xs text-slate-500">{act.description}</p>
                              </div>
                              <span className="text-xs text-slate-400 flex-shrink-0">{timeAgo(act.created_at)}</span>
                            </div>
                          );
                        })}
                        {activities.length === 0 && (
                          <div className="px-4 py-6 text-center text-sm text-slate-400">No activity yet</div>
                        )}
                      </div>
                    </div>

                    {/* Funnel Breakdown */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                      <h2 className="font-black text-slate-900 mb-4 flex items-center gap-2 text-sm">
                        <PieChart className="w-4 h-4 text-violet-600" />Funnel Breakdown
                      </h2>
                      <div className="space-y-2.5">
                        {(Object.keys(STAGES) as PipelineStage[]).map(stage => {
                          const sc = STAGES[stage as PipelineStage]; const count = funnel[stage] || 0;
                          const pct = pipeline.length ? Math.round((count / pipeline.length) * 100) : 0;
                          const SI = sc.icon;
                          return (
                            <div key={stage} className="flex items-center gap-2">
                              <div className={`w-5 h-5 rounded-md ${sc.bg} flex items-center justify-center flex-shrink-0`}>
                                <SI className={`w-3 h-3 ${sc.color}`} />
                              </div>
                              <span className="text-xs font-semibold text-slate-600 w-20 flex-shrink-0">{sc.label}</span>
                              <div className="flex-1 bg-slate-100 rounded-full h-1.5">
                                <div className={`h-1.5 rounded-full ${sc.bg.replace('-100', '-400')}`} style={{ width: `${pct}%` }} />
                              </div>
                              <span className="text-xs font-black text-slate-700 w-5 text-right">{count}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* ── Add Test Company Modal ────────────────────────────────────────── */}
        {showAddTest && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="text-lg font-black text-slate-900">Add Test Company</h2>
                  <p className="text-xs text-slate-500 mt-0.5">Manually add any company to the CRM pipeline for testing — e.g. Precise Analytics</p>
                </div>
                <button onClick={() => setShowAddTest(false)} className="p-1.5 hover:bg-slate-100 rounded-lg"><X className="w-5 h-5 text-slate-400" /></button>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-500 mb-1">Company Name *</label>
                  <input value={testTarget.name} onChange={e => setTestTarget(p => ({ ...p, name: e.target.value }))} placeholder="Precise Analytics LLC" className="w-full px-3 py-2.5 border-2 border-slate-200 rounded-xl text-sm focus:outline-none focus:border-violet-400" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Email *</label>
                  <input value={testTarget.email} onChange={e => setTestTarget(p => ({ ...p, email: e.target.value }))} placeholder="contact@company.com" className="w-full px-3 py-2.5 border-2 border-slate-200 rounded-xl text-sm focus:outline-none focus:border-violet-400" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Business Type</label>
                  <select value={testTarget.bizType} onChange={e => setTestTarget(p => ({ ...p, bizType: e.target.value }))} className="w-full px-3 py-2.5 border-2 border-slate-200 rounded-xl text-sm bg-white focus:outline-none">
                    {['Small Business','Veteran-Owned','Woman-Owned','8(a) Certified','HUBZone','Minority-Owned','Service-Disabled Veteran-Owned'].map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">UEI Number</label>
                  <input value={testTarget.uei} onChange={e => setTestTarget(p => ({ ...p, uei: e.target.value }))} placeholder="e.g. ABCD1234EFG5" className="w-full px-3 py-2.5 border-2 border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:border-violet-400" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">CAGE Code</label>
                  <input value={testTarget.cage} onChange={e => setTestTarget(p => ({ ...p, cage: e.target.value }))} placeholder="e.g. 7XYZ4" className="w-full px-3 py-2.5 border-2 border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:border-violet-400" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">NAICS Code</label>
                  <input value={testTarget.naics} onChange={e => setTestTarget(p => ({ ...p, naics: e.target.value }))} placeholder="e.g. 541512" className="w-full px-3 py-2.5 border-2 border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:border-violet-400" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">State</label>
                  <input value={testTarget.state} onChange={e => setTestTarget(p => ({ ...p, state: e.target.value }))} placeholder="VA" maxLength={2} className="w-full px-3 py-2.5 border-2 border-slate-200 rounded-xl text-sm focus:outline-none focus:border-violet-400" />
                </div>
              </div>
              <div className="bg-violet-50 border border-violet-200 rounded-xl p-3 mb-4">
                <p className="text-xs text-violet-700 font-semibold">ℹ️ This creates a real DB record — you can then test sending emails, offer code redemption, stage changes, etc. Delete it from the pipeline table when done.</p>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setShowAddTest(false)} className="flex-1 px-4 py-2.5 border-2 border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50">Cancel</button>
                <button
                  onClick={async () => {
                    if (!testTarget.name || !testTarget.email) { notify('Name and email required', 'error'); return; }
                    try {
                      const r = await fetch('/api/outreach/test-contractors', {
                        method:  'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body:    JSON.stringify({
                          name:          testTarget.name,
                          email:         testTarget.email,
                          business_type: testTarget.bizType,
                          uei_number:    testTarget.uei  || null,
                          cage_code:     testTarget.cage || null,
                          naics_code:    testTarget.naics || null,
                          state:         testTarget.state || null,
                          pipeline_stage:'new',
                          score:         50,
                          notes:         'TEST RECORD — added manually via admin CRM',
                        }),
                      });
                      const d = await r.json();
                      if (r.ok) {
                        notify(`✅ ${testTarget.name} added as test contractor`);
                        setTestTarget({ name: '', email: '', uei: '', cage: '', naics: '', state: '', bizType: 'Small Business' });
                        setShowAddTest(false);
                        fetchPipeline();
                        fetchTestCompanies();
                        setTestCount(c => c + 1);
                      } else {
                        notify(d.error || 'Failed to create test company', 'error');
                      }
                    } catch { notify('Request failed', 'error'); }
                  }}
                  className="flex-1 px-4 py-2.5 bg-violet-600 text-white rounded-xl text-sm font-bold hover:bg-violet-700 transition"
                >
                  Add to Pipeline
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════════ */}
        {/* OUTREACH TAB                                                         */}
        {/* ════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'outreach' && (
          <>
            {/* Stat Pills */}
            <div className="flex flex-wrap gap-2 mb-4">
              {(['total', 'contacted', 'enrolled', 'inProgress', 'success'] as FilterView[]).map(view => {
                const c = PILL_CONFIG[view]; const Icon = c.icon; const isActive = filterView === view;
                let count = 0;
                if (view === 'total')      count = stats.totalContractors;
                else if (view === 'contacted')  count = stats.contacted;
                else if (view === 'enrolled')   count = stats.enrolled;
                else if (view === 'inProgress') count = stats.inProgress;
                else count = stats.contacted > 0
                ? Math.round((stats.enrolled / stats.contacted) * 100)
                : 0;
                return (
                  <button
                    key={view}
                    onClick={() => setFilterView(view)}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border transition-all text-left text-xs font-semibold leading-none ${
                      isActive
                        ? `${c.activeBg} ${c.activeText} ${c.activeBorder} border-transparent`
                        : `bg-white border-slate-200 ${c.inactiveHover} text-slate-700`
                    }`}
                  >
                    <div className={`w-3.5 h-3.5 rounded flex items-center justify-center flex-shrink-0 ${isActive ? c.activeIconBg : 'bg-slate-100'}`}>
                      <Icon className={`w-2.5 h-2.5 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                    </div>
                    <span>{view === 'success' ? `${count}%` : count.toLocaleString()}</span>
                  </button>
                );
              })}
            </div>

            {/* Send Bar */}
            {selected.size > 0 && (
              <div className={`${cfg.sectionBg} ${cfg.sectionBorder} border-2 rounded-2xl p-5 mb-6 flex items-center justify-between shadow-sm`}>
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl ${cfg.activeBg} flex items-center justify-center`}>
                    <Send className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className={`font-black text-lg ${cfg.sectionTitle}`}>{selected.size} Contractor{selected.size !== 1 ? 's' : ''} Selected</p>
                    <p className="text-sm text-slate-500 font-medium">Ready for AI-powered outreach</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <select className="appearance-none pr-8 pl-4 py-2.5 border-2 border-slate-200 rounded-xl text-sm font-semibold text-slate-700 bg-white cursor-pointer focus:outline-none"
                      onChange={e => { const t = templates.find(x => x.id === e.target.value); if (t) { setCurTemplate({ ...t }); setShowTplPanel(true); } }}
                      defaultValue=""
                    >
                      <option value="" disabled>Use saved template...</option>
                      {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                    <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  </div>
                  <button
                    onClick={() => genAI()}
                    disabled={aiGen}
                    className={`flex items-center gap-2 px-5 py-2.5 ${cfg.activeBg} text-white rounded-xl hover:opacity-90 transition font-bold text-sm disabled:opacity-50`}
                  >
                    {aiGen ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                    {aiGen ? 'Generating...' : 'Generate AI Template'}
                  </button>
                  {curTemplate && (
                    <button onClick={() => setShowSendModal(true)} className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition font-bold text-sm">
                      <Send className="w-4 h-4" />Send Campaign
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Template Preview Panel */}
            {showTplPanel && curTemplate && (
              <div className={`bg-white border-2 ${cfg.sectionBorder} rounded-2xl p-6 mb-6 shadow-sm`}>
                <div className="flex items-start justify-between mb-5">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl ${cfg.activeBg} flex items-center justify-center`}>
                      <Sparkles className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-black text-lg text-slate-900">{curTemplate.aiGenerated ? 'AI-Generated Template' : curTemplate.name}</h3>
                        {curTemplate.aiGenerated && <span className="text-xs font-bold bg-violet-100 text-violet-800 px-2 py-0.5 rounded-full">AI</span>}
                      </div>
                      <p className="text-sm text-slate-500 mt-0.5">Personalized for {selected.size} contractor{selected.size !== 1 ? 's' : ''}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={async () => {
                      const res = await fetch('/api/outreach/templates', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ name: curTemplate.name || 'AI Template', subject: curTemplate.subject, body: curTemplate.body, category: curTemplate.category || 'cold', offer_code: curTemplate.offerCode, tags: curTemplate.tags || [], ai_generated: curTemplate.aiGenerated || false }),
                      });
                      if (res.ok) { await fetchTemplates(); notify('Saved to library'); }
                      else notify('Failed to save template', 'error');
                    }} 
                  className="text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg">Save to Library</button>
                    <button onClick={() => setShowTplPanel(false)} className="text-slate-400 hover:text-slate-600 p-1"><X className="w-5 h-5" /></button>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">Subject Line</label>
                    <input type="text" value={curTemplate.subject} onChange={e => setCurTemplate({ ...curTemplate, subject: e.target.value })} className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl font-semibold text-slate-900 focus:outline-none focus:border-slate-400" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">Email Body</label>
                    <textarea value={curTemplate.body} onChange={e => setCurTemplate({ ...curTemplate, body: e.target.value })} rows={10} className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-slate-400 font-mono text-sm leading-relaxed" />
                    <p className="text-xs text-slate-400 mt-1.5">Variables: [FIRST_NAME] [COMPANY_NAME] [BUSINESS_TYPE] [NAICS_CODE] [OFFER_CODE] [SIGNUP_URL]</p>
                  </div>
                  {curTemplate.offerCode && (
                    <div className={`${cfg.sectionBg} border-2 ${cfg.sectionBorder} rounded-xl p-4 flex items-center gap-3`}>
                      <Tag className={`w-5 h-5 ${cfg.sectionTitle}`} />
                      <div className="flex-1">
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Active Offer Code</p>
                        <p className={`text-xl font-black font-mono ${cfg.sectionTitle}`}>{curTemplate.offerCode}</p>
                      </div>
                      <button onClick={() => clip(curTemplate.offerCode || '')} className="p-2 rounded-lg hover:bg-white/50">
                        {copied === curTemplate.offerCode ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-slate-500" />}
                      </button>
                      <div className="relative">
                        <select className="appearance-none pr-7 pl-3 py-1.5 border border-slate-300 rounded-lg text-xs font-bold bg-white cursor-pointer focus:outline-none"
                          value={curTemplate.offerCode}
                          onChange={e => setCurTemplate({ ...curTemplate, offerCode: e.target.value })}
                        >
                          {offerCodes.filter(c => c.active).map(c => {
                            const avail = c.isAvailable !== false;
                            return (
                              <option key={c.id} value={c.code}>
                                {avail ? '✓' : '⚠'} {c.code} — {c.discount}{c.remaining != null && c.remaining !== undefined ? ` (${c.remaining} left)` : ''}
                              </option>
                            );
                          })}
                        </select>
                        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-3 mb-6">
              {(['newToday', 'readyCold', 'followUpDue', 'waiting', 'converted', 'noEmail', 'all'] as OutreachFolder[]).map(folder => {
                const meta = folderMeta[folder];
                const isActive = outreachFolder === folder;
                return (
                  <button
                    key={folder}
                    onClick={() => setOutreachFolder(folder)}
                    className={`rounded-2xl border px-4 py-3 text-left transition shadow-sm ${
                      isActive ? meta.accent : `${meta.tone} border`
                    }`}
                  >
                    <p className={`text-[11px] font-black uppercase tracking-wide ${isActive ? 'text-white/80' : ''}`}>{meta.label}</p>
                    <p className={`text-2xl font-black mt-1 ${isActive ? 'text-white' : 'text-slate-900'}`}>{folderCounts[folder].toLocaleString()}</p>
                  </button>
                );
              })}
            </div>

            {/* Contractor Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">

              {/* ── Test Mode Toolbar ── */}
              <div className={`px-5 py-3 flex items-center gap-3 flex-wrap border-b ${isOutreachTestOnly ? 'bg-amber-50 border-amber-200' : isOutreachMixedMode ? 'bg-slate-50 border-slate-200' : 'bg-emerald-50 border-emerald-200'}`}>
                <AudienceDropdown
                  label="Audience"
                  value={outreachCompanyType}
                  onChange={(value) => {
                    setOutreachCompanyType(value);
                    fetchContractors(value);
                  }}
                  open={outreachAudienceOpen}
                  setOpen={setOutreachAudienceOpen}
                  options={[
                    { value: 'real', label: 'Real Contractors Only', buttonClass: 'bg-green-600 text-white border-green-600', menuClass: 'bg-green-600 text-white hover:bg-green-700' },
                    { value: 'test', label: 'Test Contractors Only', buttonClass: 'bg-orange-500 text-white border-orange-500', menuClass: 'bg-orange-500 text-white hover:bg-orange-600' },
                    { value: 'all', label: 'Real + Test Contractors', buttonClass: 'bg-slate-700 text-white border-slate-700', menuClass: 'bg-slate-700 text-white hover:bg-slate-800' },
                  ]}
                />

                {/* Add test contractor */}
                <button
                  onClick={() => setShowAddTestOutreach(true)}
                  className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 hover:border-amber-300 hover:text-amber-700 text-slate-500 rounded-xl text-xs font-bold transition"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Test Contractor
                </button>
                <button
                  onClick={() => {
                    const next = contractors
                      .filter(c => getCampaignFolder(c) === 'newToday' && hasEmailAddress(c))
                      .map(c => c.id);
                    setOutreachFolder('newToday');
                    setSelected(new Set(next));
                  }}
                  className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 hover:border-emerald-300 hover:text-emerald-700 text-slate-500 rounded-xl text-xs font-bold transition"
                >
                  <CheckSquare className="w-3.5 h-3.5" /> Select New Pull
                </button>

                {/* Test count badge + purge */}
                {testCount > 0 && (
                  <>
                    <span className="text-xs font-semibold text-white bg-orange-500 border border-orange-600 px-2.5 py-1.5 rounded-lg">
                      TEST
                    </span>
                    <button
                      onClick={purgeTestContractors}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-600 text-white border border-orange-700 rounded-xl text-xs font-bold hover:bg-orange-700 transition"
                    >
                      <Trash2 className="w-3 h-3" /> Purge All
                    </button>
                  </>
                )}

                <div className="ml-auto flex items-center gap-3">
                  <div className="flex items-center gap-1">
                    {(['csv', 'txt', 'json', 'pdf'] as const).map(format => (
                      <button
                        key={format}
                        type="button"
                        onClick={() => exportContractorsList(outreachExportRows, format, `outreach_contacts_${outreachCompanyType}_${outreachFolder}_${new Date().toISOString().slice(0, 10)}`)}
                        className="px-2.5 py-2 rounded-lg border border-slate-200 bg-white text-[11px] font-black uppercase text-slate-700 hover:border-orange-300 hover:text-orange-700"
                      >
                        {format}
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (outreachAlerts.length > 0) setOutreachFolder(outreachAlerts[0].key);
                    }}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-bold hover:border-orange-300"
                  >
                    <Bell className={`w-4 h-4 ${outreachAlerts.length > 0 ? 'text-orange-500' : 'text-slate-400'}`} />
                    {outreachAlerts.length > 0 ? `${outreachAlerts.length} action alerts` : 'No alerts'}
                  </button>
                  <span className={`text-xs font-semibold ${isOutreachTestOnly ? 'text-amber-700' : isOutreachMixedMode ? 'text-slate-600' : 'text-emerald-700'}`}>
                    {isOutreachTestOnly
                      ? `Showing ${contractors.length} test contractor${contractors.length !== 1 ? 's' : ''} only`
                      : isOutreachMixedMode
                        ? `${visible.length.toLocaleString()} in mixed audience · ${contractors.length.toLocaleString()} total`
                        : `${visible.length.toLocaleString()} in ${folderMeta[outreachFolder].label.toLowerCase()} · ${contractors.length.toLocaleString()} total`}
                  </span>
                </div>
              </div>

              <div className={`mx-5 mt-4 rounded-2xl border px-4 py-3 ${isOutreachTestOnly ? 'bg-amber-50 border-amber-200' : isOutreachMixedMode ? 'bg-slate-50 border-slate-200' : 'bg-emerald-50 border-emerald-200'}`}>
                <p className={`text-sm font-black ${isOutreachTestOnly ? 'text-amber-900' : isOutreachMixedMode ? 'text-slate-900' : 'text-emerald-900'}`}>
                  {isOutreachTestOnly ? 'Test contractors filter is active' : isOutreachMixedMode ? 'Mixed contractors filter is active' : 'Real contractors filter is active'}
                </p>
                <p className={`text-xs mt-1 ${isOutreachTestOnly ? 'text-amber-800' : isOutreachMixedMode ? 'text-slate-700' : 'text-emerald-800'}`}>
                  {isOutreachTestOnly
                    ? 'This view is restricted to test records for safe QA and dry runs. Live campaigns should not be launched from here.'
                    : isOutreachMixedMode
                      ? 'This view mixes real and test contractors. Split them before launching a live campaign.'
                      : folderCounts.noEmail > 0
                        ? `This view is showing live contractor records. ${folderCounts.noEmail.toLocaleString()} contractor${folderCounts.noEmail === 1 ? '' : 's'} currently need contact enrichment before campaign launch.`
                        : 'This view is showing live contractor records. Review the audience carefully before sending any campaign.'}
                </p>
              </div>

              {outreachAlerts.length > 0 && (
                <div className="mx-5 mt-4 rounded-2xl border border-orange-200 bg-orange-50 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Bell className="w-4 h-4 text-orange-500" />
                    <p className="text-sm font-black text-orange-900">Action alerts</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {outreachAlerts.map(alert => (
                      <button
                        key={alert.key}
                        type="button"
                        onClick={() => setOutreachFolder(alert.key)}
                        className="text-left rounded-xl border border-orange-200 bg-white px-4 py-3 hover:border-orange-300"
                      >
                        <p className="text-xs font-black uppercase tracking-wide text-orange-600">{alert.title}</p>
                        <p className="text-2xl font-black text-slate-900 mt-1">{alert.count}</p>
                        <p className="text-xs text-slate-600 mt-1">{alert.detail}</p>
                        <p className="text-xs font-bold text-orange-600 mt-2">Open {folderMeta[alert.key].label}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className={`px-6 py-4 border-b-2 ${cfg.sectionBorder} ${cfg.sectionBg}`}>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-3 mb-4">
                  <div>
                    <label className="block text-[11px] font-black text-slate-500 mb-1 uppercase tracking-wide">State / Territory</label>
                    <select
                      value=""
                      onChange={e => {
                        const value = e.target.value;
                        if (!value) return;
                        setQuickSegments(prev => ({
                          ...prev,
                          states: prev.states.includes(value) ? prev.states : [...prev.states, value],
                        }));
                      }}
                      className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 bg-white focus:outline-none"
                    >
                      <option value="">All States / Territories</option>
                      {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    {quickSegments.states.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2 min-h-6">
                        {quickSegments.states.map(s => (
                          <button
                            key={s}
                            onClick={() => setQuickSegments(prev => ({ ...prev, states: prev.states.filter(x => x !== s) }))}
                            className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-lg font-mono font-bold bg-emerald-600 text-white"
                          >
                            {s}
                            <X className="w-3 h-3" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block text-[11px] font-black text-slate-500 mb-1 uppercase tracking-wide">Set-Aside</label>
                    <select
                      value={quickSegments.setAside}
                      onChange={e => setQuickSegments({ ...quickSegments, setAside: e.target.value })}
                      className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 bg-white focus:outline-none"
                    >
                      {SET_ASIDE_OPTIONS.map(option => (
                        <option key={option} value={option}>
                          {option === 'all' ? 'All Set-Asides' : option}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-black text-slate-500 mb-1 uppercase tracking-wide">Field</label>
                    <select
                      value={quickSegments.field}
                      onChange={e => setQuickSegments({ ...quickSegments, field: e.target.value })}
                      className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 bg-white focus:outline-none"
                    >
                      {fieldOptions.map(option => (
                        <option key={option} value={option}>
                          {option === 'all' ? 'All Fields' : option}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-black text-slate-500 mb-1 uppercase tracking-wide">Email Status</label>
                    <select
                      value={quickSegments.hasEmail}
                      onChange={e => setQuickSegments({ ...quickSegments, hasEmail: e.target.value as QuickSegments['hasEmail'] })}
                      className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 bg-white focus:outline-none"
                    >
                      <option value="all">All Contacts</option>
                      <option value="withEmail">Has Email</option>
                      <option value="missingEmail">Needs Enrichment</option>
                    </select>
                  </div>
                  <div className="flex items-end">
                    <button
                      onClick={() => setQuickSegments({ states: [], setAside: 'all', field: 'all', hasEmail: 'all' })}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-600 hover:border-slate-300"
                    >
                      Reset Segments
                    </button>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search or use state:VA, naics:541512, field:technology..."
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && fetchContractors()}
                      className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-300 text-slate-700 placeholder-slate-400 bg-white"
                    />
                  </div>
                  <button
                    onClick={() => setShowFilters(!showFilters)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 font-semibold text-sm transition ${
                      showFilters || activeFC > 0 ? 'bg-blue-600 text-white border-blue-600' : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <SlidersHorizontal className="w-4 h-4" />
                    Filters
                    {activeFC > 0 && <span className="ml-1 bg-white text-blue-700 text-xs font-black rounded-full w-5 h-5 flex items-center justify-center">{activeFC}</span>}
                  </button>
                </div>
                {showFilters && (
                  <div className="mt-4 pt-4 border-t border-slate-200 grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wide">Registration Date Range</label>
                      <div className="flex gap-2">
                        <input type="date" value={filters.registrationDateFrom} onChange={e => setFilters({ ...filters, registrationDateFrom: e.target.value })} className="flex-1 px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none bg-white" />
                        <input type="date" value={filters.registrationDateTo}   onChange={e => setFilters({ ...filters, registrationDateTo:   e.target.value })} className="flex-1 px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none bg-white" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wide">NAICS Codes</label>
                      <div className="flex flex-wrap gap-1">
                        {['541511', '541512', '541519', '541611', '518210', '561210'].map(code => (
                          <button
                            key={code}
                            title={naicsLabel(code)}
                            onClick={() => setFilters({ ...filters, naicsCodes: filters.naicsCodes.includes(code) ? filters.naicsCodes.filter(x => x !== code) : [...filters.naicsCodes, code] })}
                            className={`text-xs px-2 py-1 rounded-lg font-medium transition ${filters.naicsCodes.includes(code) ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                          >{code}</button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wide">State / Territory</label>
                      <div className="space-y-2">
                        <select
                          value=""
                          onChange={e => {
                            const value = e.target.value;
                            if (!value) return;
                            setFilters({
                              ...filters,
                              states: filters.states.includes(value) ? filters.states : [...filters.states, value],
                            });
                          }}
                          className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 bg-white focus:outline-none"
                        >
                          <option value="">Select state or territory...</option>
                          {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                        <div className="flex flex-wrap gap-1 min-h-8">
                          {filters.states.map(s => (
                            <button
                              key={s}
                              onClick={() => setFilters({ ...filters, states: filters.states.filter(x => x !== s) })}
                              className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg font-mono font-bold bg-emerald-600 text-white"
                            >
                              {s}
                              <X className="w-3 h-3" />
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wide">Business Type</label>
                      <div className="flex flex-wrap gap-1.5">
                        {BIZ_TYPES.map(type => (
                          <button
                            key={type}
                            onClick={() => setFilters({ ...filters, businessTypes: filters.businessTypes.includes(type) ? filters.businessTypes.filter(x => x !== type) : [...filters.businessTypes, type] })}
                            className={`text-xs px-3 py-1.5 rounded-xl font-semibold border transition ${filters.businessTypes.includes(type) ? 'bg-purple-600 text-white border-purple-600' : 'border-slate-200 text-slate-600 hover:border-purple-300 bg-white'}`}
                          >{type}</button>
                        ))}
                      </div>
                    </div>
                    <div className="col-span-2 flex justify-end gap-3 pt-2">
                      <button onClick={() => setFilters({ registrationDateFrom: '', registrationDateTo: '', naicsCodes: [], states: [], businessTypes: [], naicsInput: '' })} className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-900">Clear All</button>
                      <button onClick={() => { fetchContractors(); setShowFilters(false); }} className="px-5 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition">Apply Filters</button>
                    </div>
                  </div>
                )}
              </div>

              {visible.length > 0 && (
                <div className={`px-6 py-3 border-b flex items-center gap-3 ${isOutreachTestOnly ? 'bg-amber-50 border-amber-100' : isOutreachMixedMode ? 'bg-slate-50 border-slate-200' : 'bg-slate-50 border-slate-100'}`}>
                  <input
                    type="checkbox"
                    checked={selected.size === visible.length && visible.length > 0}
                    onChange={() => setSelected(selected.size === visible.length ? new Set() : new Set(visible.map(c => c.id)))}
                    className="w-4 h-4 rounded border-slate-300 cursor-pointer"
                  />
                  <span className="text-xs font-semibold text-slate-600">{selected.size === visible.length ? 'Deselect All' : 'Select All'}</span>
                  {isOutreachTestOnly && (
                    <span className="text-xs font-black text-amber-600 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-lg">
                      TEST AUDIENCE — safe to send
                    </span>
                  )}
                  {selected.size > 0 && (
                    <>
                      <span className="ml-auto text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-1 rounded-lg">{selected.size} selected</span>
                      <button
                        className="ml-3 px-4 py-2 bg-red-600 text-white rounded-lg text-xs font-bold hover:bg-red-700 transition"
                        onClick={async (e) => {
                          e.stopPropagation();
                          if (!window.confirm(`Delete ${selected.size} selected contractor(s)? This cannot be undone.`)) return;
                          // Call bulk delete API
                          try {
                            const res = await fetch('/api/outreach/contractors/bulk-delete', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ ids: Array.from(selected) })
                            });
                            const data = await res.json();
                            if (res.ok && data.success) {
                              notify(`🗑️ Deleted ${data.deleted} contractor${data.deleted !== 1 ? 's' : ''}`);
                              setSelected(new Set());
                              fetchContractors();
                            } else {
                              notify(data.error || 'Bulk delete failed', 'error');
                            }
                          } catch (err) {
                            notify('Bulk delete failed', 'error');
                          }
                        }}
                        disabled={selected.size === 0}
                      >
                        Delete Selected
                      </button>
                    </>
                  )}
                </div>
              )}

              {loading ? (
                <div className="flex items-center justify-center py-16 text-slate-400">
                  <Loader2 className="w-6 h-6 animate-spin mr-2" />Loading contractors...
                </div>
              ) : visible.length === 0 ? (
                <div className="px-6 py-16 text-center">
                  {isOutreachTestOnly ? (
                    <>
                      <div className="text-5xl mb-4">🧪</div>
                      <p className="text-slate-700 font-bold text-base">No test contractors yet</p>
                      <p className="text-sm text-slate-400 mt-1 mb-4">Add test contractors to run safe campaigns without touching real data</p>
                      <button
                        onClick={() => setShowAddTestOutreach(true)}
                        className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-sm font-bold transition shadow-sm"
                      >
                        <Plus className="w-4 h-4 inline mr-1.5" />Add Test Contractor
                      </button>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-10 h-10 mx-auto mb-3 text-slate-200" />
                      <p className="text-slate-500 font-semibold">No contractors in this view</p>
                      <p className="text-sm text-slate-400 mt-1">Try a different filter or sync SAM.gov</p>
                    </>
                  )}
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {visible.map(contractor => (
                    <div
                      key={contractor.id}
                      className={`px-6 py-4 flex items-center gap-4 transition cursor-pointer ${isOutreachTestOnly ? 'hover:bg-amber-50/50' : 'hover:bg-slate-50'} ${selected.has(contractor.id) ? (isOutreachTestOnly ? 'bg-amber-100/70' : cfg.sectionBg) : ''}`}
                      onClick={() => { const s = new Set(selected); s.has(contractor.id) ? s.delete(contractor.id) : s.add(contractor.id); setSelected(s); }}
                    >
                      <input type="checkbox" checked={selected.has(contractor.id)} onChange={() => {}} onClick={e => e.stopPropagation()} className="w-4 h-4 rounded border-slate-300 cursor-pointer flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-sm text-slate-900">{contractor.name}</span>
                          {contractor.business_type && (
                            <span className={`text-xs px-2 py-0.5 rounded-md font-semibold ${bizBadge(contractor.business_type)}`}>{contractor.business_type}</span>
                          )}
                          <span className={`text-[11px] px-2 py-0.5 rounded-md font-black border ${folderMeta[getCampaignFolder(contractor)].tone}`}>{folderMeta[getCampaignFolder(contractor)].label}</span>
                          {isTestLikeContractor(contractor) && (
                            <span className="text-xs px-2 py-0.5 rounded-md font-black bg-amber-100 text-amber-700 border border-amber-300">🧪 TEST</span>
                          )}
                          {!contractor.email && (
                            <span className="text-xs px-2 py-0.5 rounded-md font-black bg-rose-100 text-rose-700 border border-rose-300">No Email</span>
                          )}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-1.5">
                          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                            <p className="text-[11px] font-black uppercase tracking-wide text-slate-500">Email</p>
                            <p className="text-xs text-slate-700 mt-1 break-all">{contractor.email || 'No email provided by SAM.gov'}</p>
                          </div>
                          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                            <p className="text-[11px] font-black uppercase tracking-wide text-slate-500">Phone</p>
                            <p className="text-xs text-slate-700 mt-1">{contractor.phone || 'No phone on file'}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                          {contractor.sam_gov_id && <span className="font-mono flex items-center gap-1 text-xs text-slate-400"><Hash className="w-3 h-3" />{contractor.sam_gov_id}</span>}
                          {contractor.naics_code && <span className="font-mono flex items-center gap-1 text-xs text-slate-400" title={naicsLabel(contractor.naics_code)}><Building2 className="w-3 h-3" />NAICS {contractor.naics_code}</span>}
                          {contractor.business_type && <span className="flex items-center gap-1 text-xs text-slate-400"><ShieldCheck className="w-3 h-3" />Set-Aside {contractor.business_type}</span>}
                          {contractor.state && <span className="flex items-center gap-1 text-xs font-semibold text-slate-500"><MapPin className="w-3 h-3" />{contractor.state}</span>}
                        </div>
                        <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                          {contractor.naics_code && <span className="flex items-center gap-1 text-xs text-slate-400"><Tag className="w-3 h-3" />{naicsLabel(contractor.naics_code)}</span>}
                          <span className="flex items-center gap-1 text-xs text-slate-400"><Target className="w-3 h-3" />Field {contractorFieldCategory(contractor)}</span>
                          {contractor.registration_date && <span className="flex items-center gap-1 text-xs text-slate-400"><Calendar className="w-3 h-3" />Registered {contractor.registration_date}</span>}
                          {contractor.synced_at && <span className="flex items-center gap-1 text-xs text-slate-400"><RefreshCw className="w-3 h-3" />Synced {new Date(contractor.synced_at).toLocaleDateString()}</span>}
                          {contractor.cage_code && <span className="font-mono flex items-center gap-1 text-xs text-slate-400"><FileText className="w-3 h-3" />CAGE {contractor.cage_code}</span>}
                          {contractor.last_contact && <span className="flex items-center gap-1 text-xs text-slate-400"><Mail className="w-3 h-3" />Last contact {new Date(contractor.last_contact).toLocaleDateString()}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <div className="flex flex-col items-end gap-1">
                          {contractor.enrolled && <span className="flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full"><CheckCircle2 className="w-3 h-3" />Enrolled</span>}
                          {contractor.contacted && !contractor.enrolled && <span className="flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full"><Clock className="w-3 h-3" />In Progress</span>}
                          {contractor.contacted && !contractor.enrolled ? null : contractor.contacted && !contractor.enrolled && <span className="flex items-center gap-1 text-xs font-semibold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full"><Mail className="w-3 h-3" />Contacted</span>}
                          <span className="text-xs text-slate-400">{contractor.contact_attempts || 0} attempt{contractor.contact_attempts !== 1 ? 's' : ''}</span>
                          <span className={`text-xs font-black px-2 py-0.5 rounded-full ${scoreBg(contractor.score || 0)}`}>Score {(contractor.score || 0).toString()}</span>
                        </div>
                        <button
                          className="flex items-center gap-1 px-3 py-1.5 bg-orange-600 text-white rounded-lg text-xs font-bold hover:bg-orange-700 transition"
                          title="Edit contractor"
                          onClick={e => {
                            e.stopPropagation();
                            setEditContractor(contractor);
                            setShowEditModal(true);
                          }}
                        >
                          <Edit3 className="w-4 h-4" />
                          Edit
                        </button>
                        <button
                          className="flex items-center gap-1 px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-bold hover:bg-red-700 transition ml-1"
                          title="Delete contractor"
                          onClick={async e => {
                            e.stopPropagation();
                            if (!window.confirm(`Delete contractor '${contractor.name}'? This cannot be undone.`)) return;
                            try {
                              const res = await fetch(`/api/outreach/contractors/${contractor.id}`, { method: 'DELETE' });
                              if (res.ok) {
                                notify(`🗑️ Deleted ${contractor.name}`);
                                fetchContractors();
                              } else {
                                const data = await res.json();
                                notify(data.error || 'Failed to delete', 'error');
                              }
                            } catch {
                              notify('Delete failed', 'error');
                            }
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                          Delete
                        </button>
                        <ExternalLink className="w-3.5 h-3.5 text-slate-300 hover:text-slate-500 transition" />
                      </div>
                    </div>
                  ))}
                      {/* Contractor Edit Modal */}
                      <ContractorEditModal
                        isOpen={showEditModal}
                        onClose={() => setShowEditModal(false)}
                        contractor={editContractor}
                        onSuccess={() => { fetchContractors(); }}
                      />
                </div>
              )}
              {visible.length > 0 && (
                <div className={`px-6 py-3 border-t ${cfg.sectionBorder} ${cfg.sectionBg} flex items-center justify-between`}>
                  <span className="text-xs text-slate-500">Showing {visible.length.toLocaleString()} contractors in {folderMeta[outreachFolder].label.toLowerCase()}</span>
                  {activeFC > 0 && <span className="text-xs font-semibold text-blue-600">{activeFC} filter{activeFC !== 1 ? 's' : ''} active</span>}
                </div>
              )}
            </div>
          </>
        )}

        {/* ════════════════════════════════════════════════════════════════════ */}
        {/* OPPORTUNITIES TAB                                                    */}
        {/* ════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'opportunities' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-black text-slate-900">Federal Opportunities</h2>
                <p className="text-sm text-slate-500 mt-1">
                  {liveOpps.length > 0
                    ? <>Loaded from cache · {liveOpps.length} active · {lastOppSync ? `Last sync: ${new Date(lastOppSync).toLocaleDateString()}` : 'Sync to refresh'}</>
                    : 'SAM.gov solicitations — connect cache for live results'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={fetchOpportunities}
                  disabled={oppsLoading}
                  className="flex items-center gap-2 px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-bold text-slate-600 bg-white hover:border-slate-300 transition disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 ${oppsLoading ? 'animate-spin' : ''}`} />{oppsLoading ? 'Loading...' : 'Refresh'}
                </button>
                <button
                  onClick={async () => {
                    setOppSyncSt('syncing');
                    try {
                      const r = await fetch('/api/cron/opportunity-sync', {
                        method: 'POST',
                        headers: { 
                          'Content-Type': 'application/json', 
                          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_CRON_SECRET || ''}` 
                        },
                        body: JSON.stringify({ limit: 200 }),
                      });
                      const d = await r.json();
                      if (r.ok && d.success) {
                        setOppSyncSt('ok');
                        notify(`✅ Synced ${d.upserted || 0} opportunities from SAM.gov`);
                        fetchOpportunities();
                      } else {
                        throw new Error(d.error || 'Sync failed');
                      }
                    } catch (e: any) { 
                      setOppSyncSt('idle'); 
                      notify(e.message || 'Sync failed', 'error'); 
                    }
                    setTimeout(() => setOppSyncSt('idle'), 4000);
                  }}
                  disabled={oppSyncSt === 'syncing'}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition shadow-sm ${
                    oppSyncSt === 'ok'
                      ? 'bg-emerald-500 text-white border border-emerald-400'
                      : oppSyncSt === 'syncing'
                      ? 'bg-violet-400/50 text-white border border-violet-300 cursor-not-allowed'
                      : 'bg-violet-600 hover:bg-violet-700 text-white border border-violet-500 shadow-violet-500/20'
                  }`}
                >
                  <RefreshCw className={`w-4 h-4 ${oppSyncSt === 'syncing' ? 'animate-spin' : ''}`} />
                  {oppSyncSt === 'syncing' ? 'Syncing SAM.gov...' : oppSyncSt === 'ok' ? '✓ Synced' : 'Sync from SAM.gov'}
                </button>
              </div>
            </div>
            <div className="mb-5">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-3 mb-4">
                <select
                  value=""
                  onChange={e => {
                    const value = e.target.value;
                    if (!value) return;
                    setOppSegments(prev => ({
                      ...prev,
                      states: prev.states.includes(value) ? prev.states : [...prev.states, value],
                    }));
                  }}
                  className="px-3 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 bg-white focus:outline-none"
                >
                  <option value="">All States / Territories</option>
                  {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <select
                  value={oppSegments.setAside}
                  onChange={e => setOppSegments(prev => ({ ...prev, setAside: e.target.value }))}
                  className="px-3 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 bg-white focus:outline-none"
                >
                  {oppSetAsideOptions.map(option => (
                    <option key={option} value={option}>{option === 'all' ? 'All Set-Asides' : option}</option>
                  ))}
                </select>
                <select
                  value={oppSegments.field}
                  onChange={e => setOppSegments(prev => ({ ...prev, field: e.target.value }))}
                  className="px-3 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 bg-white focus:outline-none"
                >
                  <option value="all">All Fields</option>
                  {fieldOptions.filter(option => option !== 'all').map(option => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
                <select
                  value={oppSegments.type}
                  onChange={e => setOppSegments(prev => ({ ...prev, type: e.target.value }))}
                  className="px-3 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 bg-white focus:outline-none"
                >
                  {oppTypeOptions.map(option => (
                    <option key={option} value={option}>{option === 'all' ? 'All Notice Types' : option}</option>
                  ))}
                </select>
                <button
                  onClick={() => setOppSegments({ states: [], setAside: 'all', field: 'all', type: 'all' })}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-600 hover:border-slate-300"
                >
                  Reset Opportunity Filters
                </button>
              </div>
              {oppSegments.states.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-4">
                  {oppSegments.states.map(s => (
                    <button
                      key={s}
                      onClick={() => setOppSegments(prev => ({ ...prev, states: prev.states.filter(x => x !== s) }))}
                      className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-lg font-mono font-bold bg-emerald-600 text-white"
                    >
                      {s}
                      <X className="w-3 h-3" />
                    </button>
                  ))}
                </div>
              )}
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input type="text" placeholder="Search or use agency:VA, state:TX, naics:541512..." value={oppSearch} onChange={e => setOppSearch(e.target.value)} className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-slate-300 bg-white" />
              </div>
            </div>
            <div className="space-y-4">
            {/* Live count banner */}
            <div className="flex items-center gap-3 mb-4">
              <span className="text-sm font-bold text-slate-700">{activeOpps.length} Live</span>
              <span className="w-1 h-1 rounded-full bg-slate-300" />
              {expiredOpps.length > 0 && <span className="text-sm font-semibold text-slate-400">{expiredOpps.length} Expired</span>}
              {liveOpps.length > 0
                ? <span className="ml-auto text-xs text-emerald-700 font-semibold bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">✓ Live cache data</span>
                : <span className="ml-auto text-xs text-amber-600 font-semibold bg-amber-50 border border-amber-200 px-3 py-1 rounded-full">⚠ Mock data — click "Sync from SAM.gov" to populate</span>
              }
            </div>
              {(activeOpps.length > 0 ? activeOpps : filteredOpps).map(opp => {
                const isSel = selOpp?.id === opp.id;
                const days  = Math.ceil((new Date(opp.responseDeadline).getTime() - Date.now()) / 86400000);
                const isExp = days < 0;
                return (
                  <div key={opp.id} className={`bg-white rounded-2xl border transition-all ${isExp ? 'opacity-40 border-slate-100' : isSel ? 'border-emerald-400 shadow-lg' : 'border-slate-200 hover:border-slate-300 hover:shadow-md'}`}>
                    <div className="p-5 cursor-pointer" onClick={() => setSelOpp(isSel ? null : opp)}>
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${saBadge(opp.setAside)}`}>{opp.setAside || 'Open'}</span>
                            <span className="text-xs font-semibold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{opp.type}</span>
                            <span className="font-mono text-xs font-semibold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">NAICS {opp.naicsCode}</span>
                            <span className="text-xs font-semibold bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">{fieldCategoryForCode(opp.naicsCode)}</span>
                            {days < 0 && <span className="text-xs font-bold bg-slate-200 text-slate-500 px-2 py-0.5 rounded-full">Expired {Math.abs(days)}d ago</span>}
                            {days >= 0 && days <= 7 && <span className="text-xs font-bold bg-red-100 text-red-700 px-2 py-0.5 rounded-full">⚡ {days}d left</span>}
                          </div>
                          <h3 className="font-black text-slate-900 text-base">{opp.title}</h3>
                          <p className="text-sm text-slate-500 mt-0.5 font-medium">{opp.agency}</p>
                          <div className="flex items-center gap-4 mt-2">
                            <span className="flex items-center gap-1 text-xs text-slate-400"><DollarSign className="w-3 h-3" />{opp.value}</span>
                            <span className="flex items-center gap-1 text-xs text-slate-400"><Calendar className="w-3 h-3" />Deadline: {opp.responseDeadline}</span>
                            <span className="flex items-center gap-1 text-xs text-slate-400"><Tag className="w-3 h-3" />{naicsLabel(opp.naicsCode)}</span>
                            {opp.businessState && <span className="flex items-center gap-1 text-xs text-slate-400"><MapPin className="w-3 h-3" />{opp.businessState}</span>}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2 flex-shrink-0">
                          <button
                            onClick={e => { e.stopPropagation(); setActiveTab('outreach'); genAI(opp); notify('Generating campaign...', 'info'); }}
                            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition"
                          >
                            <Sparkles className="w-3.5 h-3.5" />Build Campaign
                          </button>
                          <button onClick={e => { e.stopPropagation(); window.open(opp.url, '_blank'); }} className="flex items-center gap-1 text-xs font-semibold text-slate-400 hover:text-slate-600">
                            View on SAM.gov <ArrowUpRight className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                    {isSel && (
                      <div className="px-5 pb-5 pt-2 border-t border-slate-100">
                        <p className="text-sm text-slate-600 mb-3">{opp.description}</p>
                        <span className="text-xs font-mono font-semibold text-slate-500 bg-slate-100 px-2 py-1 rounded-lg">{opp.solicitationNumber}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════════ */}
        {/* LEAD PIPELINE TAB                                                    */}
        {/* ════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'leadPipeline' && (
          <div className="space-y-6">
            {(() => {
              const enrichedCount = pipelineEntities.filter(entity => entity.enrichment?.enrichmentStatus === 'enriched').length;
              const pendingCount = pipelineEntities.filter(entity => entity.enrichment?.enrichmentStatus === 'pending').length;
              const manualReviewCount = pipelineEntities.filter(entity => entity.enrichment?.enrichmentStatus === 'manual_review').length;
              const queuedCount = pipelineQueue.filter((item: any) => item.status === 'queued').length;
              const approvedCount = pipelineQueue.filter((item: any) => item.status === 'approved').length;
              const candidatePool = [...pipelineEntities].sort((a, b) => (b.leadScore?.score || 0) - (a.leadScore?.score || 0));
              const topScored = candidatePool.filter(entity => {
                if (pipelineEntityView === 'all') return true;
                if (pipelineEntityView === 'loaded') {
                  return Boolean(entity.enrichment?.publicEmail || entity.enrichment?.publicPhone || entity.enrichment?.websiteUrl);
                }
                if (pipelineEntityView === 'contactable') {
                  return Boolean(entity.enrichment?.publicEmail || entity.enrichment?.publicPhone);
                }
                if (pipelineEntityView === 'enriched') return entity.enrichment?.enrichmentStatus === 'enriched';
                if (pipelineEntityView === 'pending') return !entity.enrichment?.enrichmentStatus || entity.enrichment?.enrichmentStatus === 'pending';
                if (pipelineEntityView === 'manual_review') return entity.enrichment?.enrichmentStatus === 'manual_review';
                return true;
              });
              const recentQueue = pipelineQueue.filter((item: any) => {
                if (pipelineQueueView === 'all') return true;
                return item.status === pipelineQueueView;
              }).slice(0, 50);
              const queueActionGroups = [
                {
                  key: 'approved',
                  label: 'Send Now',
                  detail: 'Approved leads with confirmed email, ready for campaign selection.',
                  count: pipelineQueue.filter((item: any) => item.status === 'approved' && item.samEntity?.enrichment?.publicEmail).length,
                  tone: 'bg-emerald-50 border-emerald-200 text-emerald-900',
                  button: 'Open Outreach',
                },
                {
                  key: 'queued',
                  label: 'Review Queue',
                  detail: 'Queued leads synced into Outreach so you can approve and stage them.',
                  count: pipelineQueue.filter((item: any) => item.status === 'queued' && item.samEntity?.enrichment?.publicEmail).length,
                  tone: 'bg-blue-50 border-blue-200 text-blue-900',
                  button: 'Open Review Folder',
                },
                {
                  key: 'sent',
                  label: 'Already Sent',
                  detail: 'Leads that have already moved through the first send and should be monitored for follow-up.',
                  count: pipelineQueue.filter((item: any) => item.status === 'sent').length,
                  tone: 'bg-slate-50 border-slate-200 text-slate-900',
                  button: 'View Queue',
                },
              ] as const;
              const candidateViewLabel = pipelineEntityView === 'all'
                ? 'all loaded entities'
                : pipelineEntityView === 'loaded'
                  ? 'entities with any contact signal'
                  : pipelineEntityView === 'contactable'
                    ? 'entities with email or phone'
                    : pipelineEntityView === 'manual_review'
                      ? 'manual-review entities'
                      : `${pipelineEntityView.replace('_', ' ')} entities`;
              const queueViewLabel = pipelineQueueView === 'all' ? 'all queue statuses' : `${pipelineQueueView} queue items`;
              const focusEntityPanel = (view: 'all' | 'loaded' | 'contactable' | 'enriched' | 'pending' | 'manual_review') => {
                setPipelineEntityView(view);
                setTimeout(() => pipelineEntityPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0);
              };
              const focusQueuePanel = (view: 'all' | 'queued' | 'approved') => {
                setPipelineQueueView(view);
                setTimeout(() => pipelineQueuePanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0);
              };
              const ingestRun = pipelineRunState.ingest;
              const ingestData = ingestRun?.data;
              const persistedParams = latestIngestRun?.requestParams || null;
              const currentSlice = typeof ingestData?.weekOffset === 'number'
                ? ingestData.weekOffset
                : typeof persistedParams?.weekOffset === 'number'
                  ? persistedParams.weekOffset
                  : null;
              const maxSlice = typeof ingestData?.maxOffset === 'number'
                ? ingestData.maxOffset
                : typeof persistedParams?.maxOffset === 'number'
                  ? persistedParams.maxOffset
                  : null;
              const nextSlice = currentSlice !== null && maxSlice !== null ? ((currentSlice + 1) % (maxSlice + 1)) : null;
              const cadenceMode = ingestData?.autoAdvanceMode || persistedParams?.autoAdvanceMode || null;
              const cadenceWindow = ingestData?.window || (persistedParams ? { from: persistedParams.from, to: persistedParams.to } : null);
              const selectedDaysFrom = Math.max(0, parseInt(ingestDaysFrom || '0', 10) || 0);
              const selectedDaysTo = Math.max(1, parseInt(ingestDaysTo || '1', 10) || 1);
              const ingestWindowInvalid = selectedDaysFrom >= selectedDaysTo;
              const ingestPresetLabel =
                selectedDaysFrom === 30 && selectedDaysTo === 180 ? 'Fresh registrants' :
                selectedDaysFrom === 90 && selectedDaysTo === 365 ? 'Contact-ready' :
                selectedDaysFrom === 180 && selectedDaysTo === 540 ? 'Established firms' :
                'Custom window';
              const nextSliceLabel = cadenceMode === 'reused_current_week'
                ? 'Will reuse this same weekly slice until next week starts.'
                : nextSlice !== null
                  ? `Next weekly run will advance to slice ${nextSlice}.`
                  : 'Next weekly slice will be chosen automatically.';
              const lastCompletedForStep = (step: PipelineStep) => pipelineRunState[step]?.completedAt || pipelineRunState[step]?.startedAt || null;
              const fmtDateTime = (iso?: string | null) => iso ? new Date(iso).toLocaleString() : 'Not run yet';
              const nextPacificMidnightEt = () => {
                const now = new Date();
                const etHour = Number(new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', hour: '2-digit', hour12: false }).format(now));
                const next = new Date(now);
                next.setHours(etHour >= 3 ? 27 : 3, 0, 0, 0);
                return next;
              };
              const actionAvailability: Array<{ step: PipelineStep; label: string; lastRun: string | null; available: string }> = [
                {
                  step: 'ingest',
                  label: 'Ingest',
                  lastRun: latestIngestRun?.startedAt || lastCompletedForStep('ingest'),
                  available: cadenceMode === 'reused_current_week'
                    ? `Available now for ${selectedDaysFrom}-${selectedDaysTo} day targets. Next new weekly slice after ${nextPacificMidnightEt().toLocaleString()}.`
                    : `Available now for ${selectedDaysFrom}-${selectedDaysTo} day targets.`,
                },
                {
                  step: 'enrich',
                  label: 'Enrich',
                  lastRun: lastCompletedForStep('enrich'),
                  available: pipelineRunState.enrich?.data?.mode === 'hybrid'
                    ? 'Available now. Free-first mode is active, with optional paid providers enabled.'
                    : 'Available now. Free mode uses public web crawling and government data.',
                },
                {
                  step: 'score',
                  label: 'Score',
                  lastRun: lastCompletedForStep('score'),
                  available: 'Available now.',
                },
                {
                  step: 'queue',
                  label: 'Queue',
                  lastRun: lastCompletedForStep('queue'),
                  available: 'Available now.',
                },
              ];
              const buildIngestUrl = () => {
                if (!Number.isFinite(selectedDaysFrom) || !Number.isFinite(selectedDaysTo) || ingestWindowInvalid) {
                  throw new Error('Choose an ingest window where the newer bound is smaller than the older bound.');
                }
                const params = new URLSearchParams({
                  daysFrom: String(selectedDaysFrom),
                  daysTo: String(selectedDaysTo),
                  autoAdvance: 'true',
                });
                return `/api/sam/daily-ingest?${params.toString()}`;
              };

              const runPipelineStep = async (step: PipelineStep) => {
                const startedAt = new Date().toISOString();
                try {
                  setPipelineLoading(true);
                  setPipelineActiveStep(step);
                  setPipelineLogFocus(step);
                  setPipelineRunState(prev => ({
                    ...prev,
                    [step]: {
                      status: 'running',
                      startedAt,
                    },
                  }));
                  let response: Response;
                  if (step === 'ingest') {
                    response = await fetch(buildIngestUrl(), { method: 'GET' });
                  } else if (step === 'enrich') {
                    // Limit 25 per run to keep free enrichment batches manageable
                    // and leave room for follow-up/manual review work.
                    response = await fetch('/api/sam/enrich', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ limit: 25, status: 'pending' }),
                    });
                  } else if (step === 'score') {
                    response = await fetch('/api/sam/score', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ limit: 250, minUpdatedHours: 72 }),
                    });
                  } else {
                    // requireConfirmedEmail=true — only queue entities with a real
                    // confirmed email (confidence >= 0.6). Filters out guessed addresses.
                    response = await fetch('/api/sam/queue', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        minScore: 70,
                        limit: 100,
                        campaignType: 'new_registrant',
                        requireConfirmedEmail: true,
                      }),
                    });
                  }

                  const data = await response.json();
                  if (!response.ok) {
                    const detail = data?.nextAccessTime
                      ? `${data.error || `${step} failed`} Try again after ${new Date(data.nextAccessTime).toLocaleString()}.${data.detail ? ` ${data.detail}` : ''}`
                      : (data?.detail ? `${data.error || `${step} failed`} ${data.detail}` : (data?.error || `${step} failed`));
                    throw new Error(detail);
                  }
                    setPipelineRunState(prev => ({
                      ...prev,
                      [step]: {
                        status: 'completed',
                        startedAt,
                        completedAt: new Date().toISOString(),
                        data,
                      },
                    }));
                    await fetchLeadPipeline();
                    if (step === 'ingest' && Array.isArray(data?.warnings) && data.warnings.length > 0) {
                      const warningSummary = data.warnings
                        .map((warning: any) => String(warning.dateField || 'source').replace('Date', '-date'))
                        .join(' + ');
                      const retryAt = data.warnings[0]?.nextAccessTime
                        ? ` Try again after ${new Date(data.warnings[0].nextAccessTime).toLocaleString()}.`
                        : '';
                      notify(`Ingest completed with fallback results (${warningSummary} throttled).${retryAt}`, 'info');
                    } else {
                      notify(`${step[0].toUpperCase()}${step.slice(1)} completed`);
                    }
                } catch (error: any) {
                  setPipelineRunState(prev => ({
                    ...prev,
                    [step]: {
                      status: 'failed',
                      startedAt,
                      completedAt: new Date().toISOString(),
                      error: error.message || `${step} failed`,
                    },
                  }));
                  notify(error.message || `${step} failed`, 'error');
                } finally {
                  setPipelineLoading(false);
                  setPipelineActiveStep(null);
                }
              };

              const runDailyFlow = async () => {
                for (const step of ['ingest', 'enrich', 'score', 'queue'] as const) {
                  try {
                    await runPipelineStep(step);
                  } catch {
                    break;
                  }
                }
              };

              return (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex-1">
                      <h2 className="text-3xl md:text-4xl font-black tracking-tight text-slate-900">Daily Lead Pipeline</h2>
                      {!pipelineHeroCollapsed && (
                        <div className="flex flex-wrap items-center gap-3 mt-2">
                          <p className="text-base md:text-lg text-slate-600 font-semibold">Pull companies registered {selectedDaysFrom}-{selectedDaysTo} days ago, enrich weekly using public web and government data, and queue only confirmed emails.</p>
                          <span className="inline-flex items-center gap-2 rounded-xl border border-orange-200 bg-orange-50 px-3 py-1.5 text-sm font-bold text-orange-800">
                            Recommended Order:
                            <span className="text-slate-900">Ingest {'->'} Enrich {'->'} Score {'->'} Queue</span>
                          </span>
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => setPipelineHeroCollapsed(!pipelineHeroCollapsed)}
                      className="p-2 rounded-lg hover:bg-slate-100 transition flex-shrink-0 ml-4"
                      title={pipelineHeroCollapsed ? 'Show instructions' : 'Hide instructions'}
                    >
                      <ChevronDown className={`w-5 h-5 text-slate-500 transition ${pipelineHeroCollapsed ? '-rotate-90' : ''}`} />
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                      <button disabled={pipelineLoading || ingestWindowInvalid} onClick={runDailyFlow} className="px-5 py-3 bg-orange-600 text-white rounded-xl text-base font-black hover:bg-orange-700 disabled:opacity-60 shadow-sm">{pipelineLoading && !pipelineActiveStep ? 'Running...' : 'Run Daily Flow'}</button>
                      <button disabled={pipelineLoading || ingestWindowInvalid} onClick={() => runPipelineStep('ingest')} className="px-5 py-3 bg-slate-900 text-white rounded-xl text-base font-black hover:bg-slate-800 disabled:opacity-60 shadow-sm">{pipelineActiveStep === 'ingest' ? 'Running Ingest...' : 'Run Ingest'}</button>
                      <button disabled={pipelineLoading} onClick={() => runPipelineStep('enrich')} className="px-5 py-3 bg-cyan-600 text-white rounded-xl text-base font-black hover:bg-cyan-700 disabled:opacity-60 shadow-sm">{pipelineActiveStep === 'enrich' ? 'Running Enrich...' : 'Run Enrich'}</button>
                      <button disabled={pipelineLoading} onClick={() => runPipelineStep('score')} className="px-5 py-3 bg-violet-600 text-white rounded-xl text-base font-black hover:bg-violet-700 disabled:opacity-60 shadow-sm">{pipelineActiveStep === 'score' ? 'Running Score...' : 'Run Score'}</button>
                      <button disabled={pipelineLoading} onClick={() => runPipelineStep('queue')} className="px-5 py-3 bg-emerald-600 text-white rounded-xl text-base font-black hover:bg-emerald-700 disabled:opacity-60 shadow-sm">{pipelineActiveStep === 'queue' ? 'Running Queue...' : 'Run Queue'}</button>
                      <button onClick={fetchLeadPipeline} className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50">
                        <RefreshCw className={`w-4 h-4 text-slate-500 ${pipelineLoading ? 'animate-spin' : ''}`} />
                      </button>
                    </div>

                  {!pipelineHeroCollapsed && (
                    <div className="rounded-2xl border border-orange-200 bg-orange-50 px-5 py-4 shadow-sm">
                      <div className="flex items-center justify-between gap-4 flex-wrap">
                        <div>
                          <p className="text-sm font-black text-orange-900">Ingest Window</p>
                          <p className="text-xs text-orange-800 mt-1">Older firms often have better public web presence. Try a wider or older range to improve phone and email odds.</p>
                        </div>
                      <span className="inline-flex items-center rounded-xl bg-white border border-orange-200 px-3 py-1.5 text-xs font-black text-orange-800">
                        {ingestPresetLabel}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mt-4">
                      {[
                        { label: 'Fresh', daysFrom: '30', daysTo: '180' },
                        { label: 'Contact-Ready', daysFrom: '90', daysTo: '365' },
                        { label: 'Established', daysFrom: '180', daysTo: '540' },
                      ].map(preset => (
                        <button
                          key={preset.label}
                          type="button"
                          onClick={() => {
                            setIngestDaysFrom(preset.daysFrom);
                            setIngestDaysTo(preset.daysTo);
                          }}
                          className={`rounded-xl px-4 py-3 text-left border transition ${
                            ingestDaysFrom === preset.daysFrom && ingestDaysTo === preset.daysTo
                              ? 'border-orange-400 bg-white shadow-sm'
                              : 'border-orange-200 bg-orange-50 hover:bg-white'
                          }`}
                        >
                          <p className="text-xs font-black uppercase tracking-[0.14em] text-orange-700">{preset.label}</p>
                          <p className="text-sm font-semibold text-slate-800 mt-1">{preset.daysFrom} to {preset.daysTo} days ago</p>
                        </button>
                      ))}
                      <div className="rounded-xl border border-orange-200 bg-white px-4 py-3">
                        <p className="text-xs font-black uppercase tracking-[0.14em] text-orange-700">Custom</p>
                        <div className="grid grid-cols-2 gap-2 mt-2">
                          <label className="text-xs font-semibold text-slate-600">
                            Newer
                            <input
                              type="number"
                              min={0}
                              value={ingestDaysFrom}
                              onChange={e => setIngestDaysFrom(e.target.value)}
                              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-900"
                            />
                          </label>
                          <label className="text-xs font-semibold text-slate-600">
                            Older
                            <input
                              type="number"
                              min={1}
                              value={ingestDaysTo}
                              onChange={e => setIngestDaysTo(e.target.value)}
                              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-900"
                            />
                          </label>
                        </div>
                      </div>
                    </div>
                    <p className={`text-xs mt-3 font-semibold ${ingestWindowInvalid ? 'text-red-600' : 'text-orange-800'}`}>
                        {ingestWindowInvalid
                          ? 'Set the newer bound to a smaller number than the older bound.'
                          : `Current ingest target: companies registered roughly ${selectedDaysFrom} to ${selectedDaysTo} days ago.`}
                      </p>
                    </div>
                  )}

                  {!pipelineHeroCollapsed && (
                    <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
                      <div className="flex items-center gap-2 mb-3">
                        <FileText className="w-4 h-4 text-slate-500" />
                        <p className="text-sm font-black text-slate-900">Action Legend</p>
                      </div>
                      <p className="text-sm text-slate-600 font-semibold mb-3">Use `Run Daily Flow` when you want the safe default. Use individual buttons only when re-running a specific step.</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3">
                      {[
                        { label: 'Run Daily Flow', detail: 'Runs ingest, enrich, score, and queue in sequence.' },
                        { label: 'Run Ingest', detail: 'Pulls SAM entities into the lead pipeline.' },
                        { label: 'Run Enrich', detail: 'Finds public website, email, and phone details from public web and government sources.' },
                        { label: 'Run Score', detail: 'Ranks leads by fit, recency, and contactability.' },
                        { label: 'Run Queue', detail: 'Moves qualified leads into outreach review.' },
                      ].map(item => (
                        <div key={item.label} className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                          <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">{item.label}</p>
                          <p className="text-base font-semibold text-slate-800 mt-2 leading-relaxed">{item.detail}</p>
                        </div>
                      ))}
                    </div>
                    </div>
                  )}

                  {pipelineActiveStep && (
                    <div className="rounded-2xl border border-cyan-200 bg-cyan-50 px-5 py-4">
                      <p className="text-sm font-black text-cyan-900">Running {pipelineActiveStep}</p>
                      <p className="text-xs text-cyan-800 mt-1">The pipeline is processing now. Results and updated records will appear below when the step completes.</p>
                    </div>
                  )}

                  <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
                    {[ 
                      { label: 'Entities Loaded', value: pipelineEntities.length, tone: 'bg-slate-900 text-white', onClick: () => focusEntityPanel('all') },
                      { label: 'Enriched', value: enrichedCount, tone: 'bg-emerald-600 text-white', onClick: () => focusEntityPanel('enriched') },
                      { label: 'Pending', value: pendingCount, tone: 'bg-amber-500 text-white', onClick: () => focusEntityPanel('pending') },
                      { label: 'Manual Review', value: manualReviewCount, tone: 'bg-rose-600 text-white', onClick: () => focusEntityPanel('manual_review') },
                      { label: 'Queued', value: queuedCount, tone: 'bg-blue-600 text-white', onClick: () => focusQueuePanel('queued') },
                      { label: 'Approved', value: approvedCount, tone: 'bg-violet-600 text-white', onClick: () => focusQueuePanel('approved') },
                    ].map(card => (
                      <button key={card.label} type="button" onClick={card.onClick} className={`rounded-2xl px-5 py-4 shadow-sm text-left transition hover:scale-[1.01] ${card.tone}`}>
                        <p className="text-sm font-black uppercase tracking-[0.12em] opacity-80">{card.label}</p>
                        <p className="text-4xl md:text-5xl font-black tracking-tight mt-2">{card.value}</p>
                      </button>
                    ))}
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
                    <div className="flex items-center gap-2 mb-3">
                      <Clock className="w-4 h-4 text-slate-500" />
                      <p className="text-sm font-black text-slate-900">Action Availability</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
                      {actionAvailability.map(item => (
                        <button
                          key={item.step}
                          type="button"
                          onClick={() => setPipelineLogFocus(item.step)}
                          className={`rounded-xl border px-4 py-3 text-left transition ${
                            pipelineLogFocus === item.step
                              ? 'border-orange-300 bg-orange-50 shadow-sm'
                              : 'border-slate-200 bg-slate-50 hover:border-slate-300'
                          }`}
                        >
                          <p className="text-[11px] font-black uppercase tracking-wide text-slate-500">{item.label}</p>
                          <p className="text-xs text-slate-500 mt-2">Last run</p>
                          <p className="text-base font-black text-slate-900 mt-0.5">{fmtDateTime(item.lastRun)}</p>
                          <p className="text-xs text-slate-500 mt-2">Availability</p>
                          <p className="text-base font-semibold text-slate-800 mt-0.5 leading-relaxed">{item.available}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  {(ingestRun?.status === 'completed' && ingestData) || latestIngestRun ? (
                    <div className="rounded-2xl border border-violet-200 bg-violet-50 px-5 py-4">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-violet-700" />
                        <p className="text-sm font-black text-violet-900">Weekly Ingest Cadence</p>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mt-3">
                        <div className="rounded-xl border border-violet-200 bg-white px-4 py-3">
                          <p className="text-[11px] font-black uppercase tracking-wide text-violet-500">Last Slice</p>
                          <p className="text-2xl font-black text-slate-900 mt-1">{currentSlice ?? '—'}</p>
                        </div>
                        <div className="rounded-xl border border-violet-200 bg-white px-4 py-3">
                          <p className="text-[11px] font-black uppercase tracking-wide text-violet-500">Range</p>
                          <p className="text-sm font-bold text-slate-900 mt-1">{cadenceWindow?.from || '—'} to {cadenceWindow?.to || '—'}</p>
                        </div>
                        <div className="rounded-xl border border-violet-200 bg-white px-4 py-3">
                          <p className="text-[11px] font-black uppercase tracking-wide text-violet-500">Target Window</p>
                          <p className="text-sm font-bold text-slate-900 mt-1">
                            {typeof persistedParams?.requestedDaysFrom === 'number' && typeof persistedParams?.requestedDaysTo === 'number'
                              ? `${persistedParams.requestedDaysFrom} to ${persistedParams.requestedDaysTo} days ago`
                              : `${selectedDaysFrom} to ${selectedDaysTo} days ago`}
                          </p>
                        </div>
                        <div className="rounded-xl border border-violet-200 bg-white px-4 py-3">
                          <p className="text-[11px] font-black uppercase tracking-wide text-violet-500">Mode</p>
                          <p className="text-sm font-bold text-slate-900 mt-1">{String(cadenceMode || 'manual').replaceAll('_', ' ')}</p>
                        </div>
                        <div className="rounded-xl border border-violet-200 bg-white px-4 py-3">
                          <p className="text-[11px] font-black uppercase tracking-wide text-violet-500">Next Run</p>
                          <p className="text-sm font-bold text-slate-900 mt-1">{nextSliceLabel}</p>
                        </div>
                      </div>
                      {latestIngestRun && (
                        <p className="text-xs text-violet-800 mt-3">
                          Last successful DB-backed ingest: {new Date(latestIngestRun.startedAt).toLocaleString()}
                          {latestIngestRun.finishedAt ? ` · finished ${new Date(latestIngestRun.finishedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}` : ''}
                        </p>
                      )}
                    </div>
                  ) : null}

                  {Object.keys(pipelineRunState).length > 0 && (() => {
                    const STEP_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
                      ingest: { bg: 'bg-slate-900',   text: 'text-white',         dot: 'bg-slate-400'   },
                      enrich: { bg: 'bg-cyan-600',    text: 'text-white',         dot: 'bg-cyan-300'    },
                      score:  { bg: 'bg-violet-600',  text: 'text-white',         dot: 'bg-violet-300'  },
                      queue:  { bg: 'bg-emerald-600', text: 'text-white',         dot: 'bg-emerald-300' },
                    };
                    const STEP_RESULT_FIELDS: Record<string, { key: string; label: string; color: string }[]> = {
                      ingest: [
                        { key: 'fetched',  label: 'Fetched',        color: 'text-slate-700'   },
                        { key: 'inserted', label: 'New entities',   color: 'text-emerald-600' },
                        { key: 'updated',  label: 'Updated',        color: 'text-cyan-600'    },
                        { key: 'weekOffset', label: 'Week Slice',   color: 'text-violet-600'  },
                        { key: 'errors',   label: 'Errors',         color: 'text-red-500'     },
                      ],
                      enrich: [
                        { key: 'processed',    label: 'Processed',    color: 'text-slate-700'   },
                        { key: 'enriched',     label: 'Enriched',     color: 'text-emerald-600' },
                        { key: 'crawlHits',    label: 'Web Hits',     color: 'text-cyan-600'    },
                        { key: 'manualReview', label: 'Manual Review',color: 'text-rose-500'    },
                      ],
                      score: [
                        { key: 'scored',  label: 'Scored',  color: 'text-violet-600' },
                        { key: 'skipped', label: 'Skipped', color: 'text-slate-400'  },
                        { key: 'errors',  label: 'Errors',  color: 'text-red-500'    },
                      ],
                      queue: [
                        { key: 'queued',       label: 'Queued',            color: 'text-emerald-600' },
                        { key: 'autoApproved', label: 'Auto-approved',     color: 'text-blue-600'    },
                        { key: 'reviewQueued', label: 'Pending review',    color: 'text-amber-600'   },
                        { key: 'skipped',      label: 'Skipped',           color: 'text-slate-400'   },
                      ],
                    };
                    const fmtDur = (start: string, end?: string) => {
                      if (!end) return null;
                      const ms = new Date(end).getTime() - new Date(start).getTime();
                      return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`;
                    };
                    const fmtT = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

                    return (
                      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                        <div className="px-5 py-4 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
                          <Activity className="w-4 h-4 text-slate-500" />
                          <h3 className="text-sm font-black text-slate-900">Run Log</h3>
                          <span className="text-xs bg-slate-200 text-slate-600 font-bold px-2 py-0.5 rounded-full ml-1">
                            {Object.keys(pipelineRunState).length} step{Object.keys(pipelineRunState).length !== 1 ? 's' : ''} this session
                          </span>
                          <div className="ml-auto flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setPipelineLogFocus('all')}
                              className={`px-2.5 py-1 rounded-lg text-[11px] font-black transition ${
                                pipelineLogFocus === 'all'
                                  ? 'bg-slate-900 text-white'
                                  : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-300'
                              }`}
                            >
                              Show All
                            </button>
                          </div>
                        </div>
                        <div className="divide-y divide-slate-100">
                          {Object.entries(pipelineRunState).map(([key, value]) => {
                            const sc     = STEP_COLORS[key] || STEP_COLORS.ingest;
                            const fields = STEP_RESULT_FIELDS[key] || [];
                            const dur    = fmtDur(value?.startedAt || '', value?.completedAt);
                            const isRunning   = value?.status === 'running';
                            const isCompleted = value?.status === 'completed';
                            const isFailed    = value?.status === 'failed';
                            const stepKey = key as PipelineStep;
                            const isFocused = pipelineLogFocus === 'all' || pipelineLogFocus === stepKey;

                            return (
                              <div key={key} className={`px-5 py-4 transition ${isFocused ? 'opacity-100' : 'opacity-45'}`}>
                                {/* Row: badge + status + time + duration */}
                                <div className="flex items-center gap-3 flex-wrap">
                                  <button
                                    type="button"
                                    onClick={() => setPipelineLogFocus(stepKey)}
                                    className={`px-2.5 py-1 rounded-lg text-xs font-black transition ${sc.bg} ${sc.text} ${isFocused ? 'ring-2 ring-offset-1 ring-orange-300' : ''}`}
                                  >
                                    {key.toUpperCase()}
                                  </button>
                                  {isRunning && (
                                    <span className="flex items-center gap-1 text-xs font-bold text-cyan-600">
                                      <Loader2 className="w-3 h-3 animate-spin" /> Running…
                                    </span>
                                  )}
                                  {isCompleted && (
                                    <span className="flex items-center gap-1 text-xs font-bold text-emerald-600">
                                      <CheckCircle2 className="w-3 h-3" /> Completed
                                    </span>
                                  )}
                                  {isFailed && (
                                    <span className="flex items-center gap-1 text-xs font-bold text-red-500">
                                      <AlertCircle className="w-3 h-3" /> Failed
                                    </span>
                                  )}
                                  {value?.startedAt && (
                                    <span className="text-xs text-slate-400">Started {fmtT(value.startedAt)}</span>
                                  )}
                                  {value?.completedAt && (
                                    <span className="text-xs text-slate-400">· Finished {fmtT(value.completedAt)}</span>
                                  )}
                                  {dur && (
                                    <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                                      {dur}
                                    </span>
                                  )}
                                </div>

                                {/* Result metric pills */}
                                {isFocused && isCompleted && value?.data && (
                                  <div className="flex items-center gap-4 mt-3 flex-wrap">
                                    {fields.map(f => {
                                      const val = value.data?.[f.key];
                                      if (val === undefined || val === null) return null;
                                      return (
                                        <button
                                          key={f.key}
                                          type="button"
                                          onClick={() => setPipelineLogFocus(stepKey)}
                                          className="flex flex-col items-center bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 min-w-[72px] hover:border-orange-300"
                                        >
                                          <span className={`text-xl font-black ${f.color}`}>{val}</span>
                                          <span className="text-[11px] text-slate-400 font-semibold mt-0.5">{f.label}</span>
                                        </button>
                                      );
                                    })}
                                    {key === 'enrich' && typeof value.data?.crawlHits === 'number' && (
                                      <span className="text-xs text-cyan-700 font-semibold bg-cyan-50 border border-cyan-200 px-3 py-1.5 rounded-xl">
                                        {value.data.crawlHits > 0
                                          ? `✓ ${value.data.crawlHits} website${value.data.crawlHits !== 1 ? 's' : ''} returned public contact data`
                                          : 'No public website contacts found in this batch'}
                                      </span>
                                    )}
                                    {key === 'enrich' && value.data?.mode === 'hybrid' && (
                                      <span className="text-xs text-violet-700 font-semibold bg-violet-50 border border-violet-200 px-3 py-1.5 rounded-xl">
                                        Optional paid providers were enabled for this run
                                      </span>
                                    )}
                                    {key === 'enrich' && value.data?.mode === 'free' && (
                                      <span className="text-xs text-emerald-700 font-semibold bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl">
                                        Free mode: SAM payload + public web + government data
                                      </span>
                                    )}
                                    {key === 'ingest' && value.data?.autoAdvanceMode && (
                                      <span className="text-xs text-violet-700 font-semibold bg-violet-50 border border-violet-200 px-3 py-1.5 rounded-xl">
                                        Slice mode: {String(value.data.autoAdvanceMode).replaceAll('_', ' ')}
                                      </span>
                                    )}
                                    {key === 'ingest' && Array.isArray(value.data?.warnings) && value.data.warnings.length > 0 && (
                                      <span className="text-xs text-amber-700 font-semibold bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-xl">
                                        Partial ingest fallback used
                                      </span>
                                    )}
                                  </div>
                                )}

                                  {/* Error message */}
                                  {isFocused && isFailed && value?.error && (
                                    <p className="text-xs text-red-600 mt-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
                                      {value.error}
                                    </p>
                                  )}
                                  {isFocused && isCompleted && key === 'ingest' && Array.isArray(value?.data?.warnings) && value.data.warnings.length > 0 && (
                                    <p className="text-xs text-amber-700 mt-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                                      {value.data.warnings.map((warning: any, index: number) => {
                                        const label = String(warning.dateField || 'source').replace('Date', '-date');
                                        const retryAt = warning.nextAccessTime ? ` Try again after ${new Date(warning.nextAccessTime).toLocaleString()}.` : '';
                                        const detail = warning.detail ? ` ${warning.detail}` : '';
                                        return `${index > 0 ? ' ' : ''}${label}: ${warning.error}${retryAt}${detail}`;
                                      }).join('')}
                                    </p>
                                  )}

                                {/* Updated records list for enrich */}
                                {isFocused && isCompleted && value?.data?.updated?.length > 0 && (
                                  <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3 max-h-48 overflow-auto">
                                    <p className="text-[11px] font-black uppercase tracking-wide text-slate-500 mb-2">
                                      Updated Records ({value.data.updated.length})
                                    </p>
                                    <div className="space-y-2">
                                      {value.data.updated.slice(0, 10).map((item: any) => (
                                        <div key={item.samEntityId} className="flex items-start gap-2">
                                          <span className={`mt-0.5 text-[10px] font-black px-1.5 py-0.5 rounded flex-shrink-0 ${
                                            item.status === 'enriched' ? 'bg-emerald-100 text-emerald-700' :
                                            item.status === 'manual_review' ? 'bg-rose-100 text-rose-700' :
                                            'bg-amber-100 text-amber-700'
                                          }`}>{item.status}</span>
                                          <div className="min-w-0">
                                            <p className="text-[11px] font-bold text-slate-900 truncate">{item.legalBusinessName}</p>
                                            <p className="text-[11px] text-slate-500">
                                              {item.publicEmail || item.publicPhone || item.websiteUrl || 'No contact found yet'}
                                            </p>
                                          </div>
                                        </div>
                                      ))}
                                      {value.data.updated.length > 10 && (
                                        <p className="text-[11px] text-slate-400">
                                          +{value.data.updated.length - 10} more records updated
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}

                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                    <div ref={pipelineEntityPanelRef} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                      <div className="px-5 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between gap-3">
                        <div>
                          <h3 className="text-sm font-black text-slate-900">Lead Entities</h3>
                          <p className="text-xs text-slate-500 mt-1">Showing {candidateViewLabel}. Use these filters or the top counters to jump to a tighter list.</p>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <button
                            type="button"
                            onClick={() => focusEntityPanel('all')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-black transition ${pipelineEntityView === 'all' ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-300'}`}
                          >
                            Show All
                          </button>
                          <button
                            type="button"
                            onClick={() => focusEntityPanel('loaded')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-black transition ${pipelineEntityView === 'loaded' ? 'bg-cyan-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-300'}`}
                          >
                            Any Contact Signal
                          </button>
                          <button
                            type="button"
                            onClick={() => focusEntityPanel('contactable')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-black transition ${pipelineEntityView === 'contactable' ? 'bg-emerald-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-300'}`}
                          >
                            Top Contactable
                          </button>
                        </div>
                      </div>
                      <div className="divide-y divide-slate-100 max-h-[560px] overflow-auto">
                        {/* Section: Enriched */}
                        {topScored.filter(e => e.enrichment?.enrichmentStatus === 'enriched').length > 0 && (
                          <>
                            <div className="px-5 py-2 bg-emerald-50 flex items-center gap-2 sticky top-0 z-10">
                              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block flex-shrink-0" />
                              <span className="text-xs font-black text-emerald-700 uppercase tracking-wide">
                                Enriched — {topScored.filter(e => e.enrichment?.enrichmentStatus === 'enriched').length}
                              </span>
                            </div>
                            {topScored.filter(e => e.enrichment?.enrichmentStatus === 'enriched').map(entity => (
                          <div key={entity.id} className="px-5 py-4">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="text-sm font-black text-slate-900 truncate">{entity.legalBusinessName}</p>
                                <p className="text-xs text-slate-500 mt-1 font-mono">{entity.uei}</p>
                                <div className="flex items-center gap-2 flex-wrap mt-2">
                                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-bold">
                                    {entity.enrichment?.enrichmentStatus || 'pending'}
                                  </span>
                                  {entity.enrichment?.publicEmail && <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-bold">Email</span>}
                                  {entity.enrichment?.publicPhone && <span className="text-[11px] px-2 py-0.5 rounded-full bg-cyan-100 text-cyan-700 font-bold">Phone</span>}
                                  {entity.enrichment?.websiteUrl && <span className="text-[11px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-bold">Website</span>}
                                </div>
                              </div>
                              <div className="text-right">
                                <span className={`text-xs font-black px-2 py-1 rounded-full ${scoreBg(entity.leadScore?.score || 0)}`}>Score {entity.leadScore?.score ?? 0}</span>
                              </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-3 text-xs text-slate-600">
                              <div className="rounded-xl bg-slate-50 border border-slate-200 px-3 py-2">
                                <p className="font-bold text-slate-500 uppercase tracking-wide">Contact</p>
                                <p className="mt-1 break-all">{entity.enrichment?.publicEmail || 'No public email'}</p>
                                <p className="mt-1">{entity.enrichment?.publicPhone || 'No public phone'}</p>
                                {entity.enrichment?.sourceConfidence != null && entity.enrichment.sourceConfidence < 0.5 && entity.enrichment?.publicEmail && (
                                  <p className="mt-2 text-[11px] font-bold text-amber-700">Candidate email inferred from domain</p>
                                )}
                              </div>
                              <div className="rounded-xl bg-slate-50 border border-slate-200 px-3 py-2">
                                <p className="font-bold text-slate-500 uppercase tracking-wide">Dates</p>
                                <p className="mt-1">Registered: {entity.registrationDate || '—'}</p>
                                <p className="mt-1">Activated: {entity.activationDate || '—'}</p>
                              </div>
                            </div>
                            {entity.leadScore?.reasons && entity.leadScore.reasons.length > 0 && (
                              <div className="mt-3 flex flex-wrap gap-1">
                                {entity.leadScore.reasons.slice(0, 4).map(reason => (
                                  <span key={reason} className="text-[11px] px-2 py-0.5 rounded-full bg-orange-50 text-orange-700 border border-orange-200">{reason}</span>
                                ))}
                              </div>
                            )}
                            <div className="mt-3 flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => openPipelineEdit(entity)}
                                className="px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-bold hover:bg-slate-800"
                              >
                                {entity.enrichment?.publicEmail || entity.enrichment?.publicPhone ? 'Edit Contact Info' : 'Add Contact Info'}
                              </button>
                            </div>
                          </div>
                        ))}
                          </>
                        )}

                        {/* Section: Pending */}
                        {topScored.filter(e => !e.enrichment?.enrichmentStatus || e.enrichment?.enrichmentStatus === 'pending').length > 0 && (
                          <>
                            <div className="px-5 py-2 bg-amber-50 flex items-center gap-2 sticky top-0 z-10">
                              <span className="w-2 h-2 rounded-full bg-amber-400 inline-block flex-shrink-0" />
                              <span className="text-xs font-black text-amber-700 uppercase tracking-wide">
                                Pending Enrichment — {topScored.filter(e => !e.enrichment?.enrichmentStatus || e.enrichment?.enrichmentStatus === 'pending').length}
                              </span>
                              <span className="ml-auto text-xs text-amber-600">
                                Waiting for first enrichment pass or manual review
                              </span>
                            </div>
                            {topScored.filter(e => !e.enrichment?.enrichmentStatus || e.enrichment?.enrichmentStatus === 'pending').map(entity => (
                              <div key={entity.id} className="px-5 py-4">
                                <div className="flex items-start justify-between gap-3">
                                  <div className="min-w-0">
                                    <p className="text-sm font-black text-slate-900 truncate">{entity.legalBusinessName}</p>
                                    <p className="text-xs text-slate-500 mt-1 font-mono">{entity.uei}</p>
                                    <div className="flex items-center gap-2 flex-wrap mt-2">
                                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-bold">pending</span>
                                    </div>
                                  </div>
                                  <span className={`text-xs font-black px-2 py-1 rounded-full flex-shrink-0 ${scoreBg(entity.leadScore?.score || 0)}`}>Score {entity.leadScore?.score ?? 0}</span>
                                </div>
                                <div className="grid grid-cols-2 gap-2 mt-3 text-xs text-slate-600">
                                  <div className="rounded-xl bg-slate-50 border border-slate-200 px-3 py-2">
                                    <p className="font-bold text-slate-400 uppercase tracking-wide text-[10px]">Contact</p>
                                    <p className="mt-1 text-slate-400">No public email</p>
                                    <p className="mt-0.5 text-slate-400">No public phone</p>
                                  </div>
                                  <div className="rounded-xl bg-slate-50 border border-slate-200 px-3 py-2">
                                    <p className="font-bold text-slate-400 uppercase tracking-wide text-[10px]">Dates</p>
                                    <p className="mt-1">Registered: {entity.registrationDate || '—'}</p>
                                    <p className="mt-1">Activated: {entity.activationDate || '—'}</p>
                                  </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-2 text-xs">
                                  <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                                    <p className="font-bold text-slate-400 uppercase tracking-wide text-[10px]">Enrichment State</p>
                                    <p className="mt-1 font-semibold text-slate-700">
                                      {entity.enrichment?.lastEnrichedAt
                                        ? `Tried ${new Date(entity.enrichment.lastEnrichedAt).toLocaleString()}`
                                        : 'Not tried yet'}
                                    </p>
                                    <p className="mt-0.5 text-slate-500">
                                      {entity.enrichment?.enrichmentMode
                                        ? `${entity.enrichment.enrichmentMode} mode`
                                        : 'Awaiting first enrich run'}
                                    </p>
                                  </div>
                                  <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                                    <p className="font-bold text-slate-400 uppercase tracking-wide text-[10px]">Website Signal</p>
                                    <p className={`mt-1 font-semibold ${
                                      entity.enrichment?.hasWebsiteSignal
                                        ? 'text-emerald-700'
                                        : entity.enrichment?.hasWeakWebsiteHint
                                          ? 'text-amber-700'
                                          : 'text-slate-500'
                                    }`}>
                                      {entity.enrichment?.hasWebsiteSignal
                                        ? 'Crawl target ready'
                                        : entity.enrichment?.hasWeakWebsiteHint
                                          ? 'Weak website hint only'
                                          : 'No website hint yet'}
                                    </p>
                                    <p className="mt-0.5 text-slate-500 truncate">
                                      {entity.enrichment?.websiteUrl || entity.enrichment?.contactPageUrl || entity.enrichment?.crawlTargetUrl || (
                                        entity.enrichment?.hasWeakWebsiteHint
                                          ? 'Need to turn the hint into a real crawlable URL'
                                          : 'No public website lead saved yet'
                                      )}
                                    </p>
                                  </div>
                                  <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                                    <p className="font-bold text-slate-400 uppercase tracking-wide text-[10px]">Next Action</p>
                                    <p className="mt-1 font-semibold text-slate-700">
                                      {entity.enrichment?.hasWebsiteSignal
                                        ? 'Run Enrich again to scrape the site'
                                        : entity.enrichment?.hasWeakWebsiteHint
                                          ? 'Add a better website URL or search manually'
                                          : 'Add website/contact manually'}
                                    </p>
                                    <p className="mt-0.5 text-slate-500">
                                      {entity.enrichment?.providersUsed?.length
                                        ? `Sources: ${entity.enrichment.providersUsed.join(', ')}`
                                        : 'No sources have returned contact data yet'}
                                    </p>
                                  </div>
                                </div>
                                {entity.leadScore?.reasons && entity.leadScore.reasons.length > 0 && (
                                  <div className="mt-2 flex flex-wrap gap-1">
                                    {entity.leadScore.reasons.slice(0, 3).map(reason => (
                                      <span key={reason} className="text-[11px] px-2 py-0.5 rounded-full bg-orange-50 text-orange-700 border border-orange-200">{reason}</span>
                                    ))}
                                  </div>
                                )}
                                {entity.enrichment?.enrichmentNotes && (
                                  <div className="mt-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2">
                                    <p className="text-[10px] font-bold uppercase tracking-wide text-amber-700">Last Enrichment Note</p>
                                    <p className="text-xs text-amber-900 mt-1">{entity.enrichment.enrichmentNotes}</p>
                                  </div>
                                )}
                                <div className="mt-3">
                                  <button type="button" onClick={() => openPipelineEdit(entity)} className="px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-bold hover:bg-slate-800">
                                    Add Contact Info
                                  </button>
                                </div>
                              </div>
                            ))}
                          </>
                        )}

                        {/* Section: Manual Review */}
                        {topScored.filter(e => e.enrichment?.enrichmentStatus === 'manual_review').length > 0 && (
                          <>
                            <div className="px-5 py-2 bg-rose-50 flex items-center gap-2 sticky top-0 z-10">
                              <span className="w-2 h-2 rounded-full bg-rose-500 inline-block flex-shrink-0" />
                              <span className="text-xs font-black text-rose-700 uppercase tracking-wide">
                                Manual Review — {topScored.filter(e => e.enrichment?.enrichmentStatus === 'manual_review').length}
                              </span>
                              <span className="ml-auto text-xs text-rose-500">Click Edit to add contact info manually</span>
                            </div>
                            {topScored.filter(e => e.enrichment?.enrichmentStatus === 'manual_review').map(entity => (
                              <div key={entity.id} className="px-5 py-4 bg-rose-50/30">
                                <div className="flex items-start justify-between gap-3">
                                  <div className="min-w-0">
                                    <p className="text-sm font-black text-slate-900 truncate">{entity.legalBusinessName}</p>
                                    <p className="text-xs text-slate-500 mt-1 font-mono">{entity.uei}</p>
                                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 font-bold mt-2 inline-block">manual_review</span>
                                  </div>
                                  <span className={`text-xs font-black px-2 py-1 rounded-full flex-shrink-0 ${scoreBg(entity.leadScore?.score || 0)}`}>Score {entity.leadScore?.score ?? 0}</span>
                                </div>
                                {entity.enrichment?.enrichmentNotes && (
                                  <p className="text-xs text-slate-500 mt-2 truncate">{entity.enrichment.enrichmentNotes}</p>
                                )}
                                <div className="mt-3">
                                  <button type="button" onClick={() => openPipelineEdit(entity)} className="px-3 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-bold hover:bg-rose-700">
                                    Add Contact Info
                                  </button>
                                </div>
                              </div>
                            ))}
                          </>
                        )}

                        {topScored.length === 0 && (
                          <div className="px-5 py-12 text-center text-sm text-slate-400">No pipeline entities loaded yet. Run ingest first.</div>
                        )}
                      </div>
                    </div>

                    <div ref={pipelineQueuePanelRef} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                      <div className="px-5 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                        <div>
                          <h3 className="text-sm font-black text-slate-900">Outreach Queue</h3>
                          <p className="text-xs text-slate-500 mt-1">Showing {queueViewLabel}. Click `Queued` or `Approved` above to filter this list.</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {queuedCount > 0 && (
                            <span className="text-xs font-black bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full">{queuedCount} ready</span>
                          )}
                          <button
                            type="button"
                            onClick={() => focusQueuePanel('all')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-black transition ${pipelineQueueView === 'all' ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-300'}`}
                          >
                            Show All
                          </button>
                        </div>
                      </div>
                      <div className="px-5 py-4 border-b border-slate-100 bg-white">
                        <div className="flex items-center gap-2 mb-3">
                          <Send className="w-4 h-4 text-slate-500" />
                          <p className="text-sm font-black text-slate-900">Actionable Categories</p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          {queueActionGroups.map(group => (
                            <div key={group.key} className={`rounded-2xl border px-4 py-4 ${group.tone}`}>
                              <p className="text-[11px] font-black uppercase tracking-[0.14em] opacity-80">{group.label}</p>
                              <p className="text-3xl font-black mt-2">{group.count}</p>
                              <p className="text-xs mt-2 opacity-80 min-h-[34px]">{group.detail}</p>
                              <button
                                type="button"
                                onClick={() => {
                                  if (group.key === 'approved' || group.key === 'queued') {
                                    openQueuedCampaignFolder(group.key);
                                  } else {
                                    setActiveTab('outreach');
                                    setOutreachCompanyType('real');
                                    setOutreachFolder('followUpDue');
                                    setSearchTerm('');
                                    fetchContractors('real');
                                  }
                                }}
                                className="mt-3 px-3 py-2 rounded-xl bg-white/90 border border-white text-xs font-black text-slate-800 hover:bg-white"
                              >
                                {group.button}
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="divide-y divide-slate-100 max-h-[560px] overflow-auto">
                        {/* Section: Approved */}
                        {recentQueue.filter((i: any) => i.status === 'approved').length > 0 && (
                          <>
                            <div className="px-5 py-2 bg-emerald-50 flex items-center gap-2 sticky top-0 z-10">
                              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block flex-shrink-0" />
                              <span className="text-xs font-black text-emerald-700 uppercase tracking-wide">
                                Approved — {recentQueue.filter((i: any) => i.status === 'approved').length}
                              </span>
                            </div>
                            {recentQueue.filter((i: any) => i.status === 'approved').map((item: any) => (
                              <div key={item.id} className="px-5 py-4">
                                <div className="flex items-start justify-between gap-3">
                                  <div className="min-w-0">
                                    <p className="text-sm font-black text-slate-900 truncate">{item.samEntity?.legalBusinessName || 'Unknown'}</p>
                                    <p className="text-xs text-slate-500 mt-0.5 font-mono">{item.samEntity?.uei || '—'}</p>
                                  </div>
                                  <span className="text-xs font-black px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 flex-shrink-0">approved</span>
                                </div>
                                <div className="grid grid-cols-2 gap-2 mt-2 text-xs text-slate-600">
                                  <div className="rounded-xl bg-slate-50 border border-slate-100 px-3 py-2">
                                    <p className="font-black text-slate-400 uppercase tracking-wide text-[10px] mb-1">Campaign</p>
                                    <p>{item.campaignType || 'new_registrant'}</p>
                                    <p className="text-slate-400">Queued: {item.queuedAt ? String(item.queuedAt).slice(0, 10) : '—'}</p>
                                  </div>
                                  <div className="rounded-xl bg-slate-50 border border-slate-100 px-3 py-2">
                                    <p className="font-black text-slate-400 uppercase tracking-wide text-[10px] mb-1">Contact</p>
                                    <p className={item.samEntity?.enrichment?.publicEmail ? 'text-emerald-700 font-semibold truncate' : 'text-slate-400'}>{item.samEntity?.enrichment?.publicEmail || 'No email'}</p>
                                    <p className={item.samEntity?.enrichment?.publicPhone ? 'text-emerald-700' : 'text-slate-400'}>{item.samEntity?.enrichment?.publicPhone || 'No phone'}</p>
                                  </div>
                                </div>
                                <div className="mt-2 flex items-center gap-2 flex-wrap">
                                  <span className={`text-xs font-black px-2 py-0.5 rounded-full ${scoreBg(item.samEntity?.leadScore?.score || 0)}`}>Score {item.samEntity?.leadScore?.score ?? 0}</span>
                                  {item.notes && <span className="text-xs text-slate-500 truncate">{item.notes}</span>}
                                  <div className="ml-auto flex items-center gap-1.5">
                                    <button
                                      onClick={() => queueAction(item.id, 'reject')}
                                      className="text-xs px-2 py-1 rounded-lg bg-red-50 text-red-600 font-bold hover:bg-red-100 transition flex items-center gap-1"
                                      title="Reject — move out of approved"
                                    ><XCircle className="w-3 h-3" />Reject</button>
                                    <button
                                      onClick={() => { if (window.confirm('Remove this entry permanently?')) queueAction(item.id, 'delete'); }}
                                      className="text-xs px-2 py-1 rounded-lg bg-slate-100 text-slate-500 font-bold hover:bg-slate-200 transition flex items-center gap-1"
                                      title="Delete permanently"
                                    ><Trash2 className="w-3 h-3" /></button>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </>
                        )}

                        {/* Section: Queued */}
                        {recentQueue.filter((i: any) => i.status === 'queued').length > 0 && (
                          <>
                            <div className="px-5 py-2 bg-blue-50 flex items-center gap-2 sticky top-0 z-10">
                              <span className="w-2 h-2 rounded-full bg-blue-500 inline-block flex-shrink-0" />
                              <span className="text-xs font-black text-blue-700 uppercase tracking-wide">
                                Queued — {recentQueue.filter((i: any) => i.status === 'queued').length}
                              </span>
                            </div>
                            {recentQueue.filter((i: any) => i.status === 'queued').map((item: any) => (
                              <div key={item.id} className="px-5 py-4">
                                <div className="flex items-start justify-between gap-3">
                                  <div className="min-w-0">
                                    <p className="text-sm font-black text-slate-900 truncate">{item.samEntity?.legalBusinessName || 'Unknown'}</p>
                                    <p className="text-xs text-slate-500 mt-0.5 font-mono">{item.samEntity?.uei || '—'}</p>
                                  </div>
                                  <span className="text-xs font-black px-2 py-1 rounded-full bg-amber-100 text-amber-700 flex-shrink-0">queued</span>
                                </div>
                                <div className="grid grid-cols-2 gap-2 mt-2 text-xs text-slate-600">
                                  <div className="rounded-xl bg-slate-50 border border-slate-100 px-3 py-2">
                                    <p className="font-black text-slate-400 uppercase tracking-wide text-[10px] mb-1">Campaign</p>
                                    <p>{item.campaignType || 'new_registrant'}</p>
                                    <p className="text-slate-400">Queued: {item.queuedAt ? String(item.queuedAt).slice(0, 10) : '—'}</p>
                                  </div>
                                  <div className="rounded-xl bg-slate-50 border border-slate-100 px-3 py-2">
                                    <p className="font-black text-slate-400 uppercase tracking-wide text-[10px] mb-1">Contact</p>
                                    <p className={item.samEntity?.enrichment?.publicEmail ? 'text-emerald-700 font-semibold truncate' : 'text-slate-400'}>{item.samEntity?.enrichment?.publicEmail || 'No email'}</p>
                                  </div>
                                </div>
                                <div className="mt-2 flex items-center gap-2 flex-wrap">
                                  <span className={`text-xs font-black px-2 py-0.5 rounded-full ${scoreBg(item.samEntity?.leadScore?.score || 0)}`}>Score {item.samEntity?.leadScore?.score ?? 0}</span>
                                  <div className="ml-auto flex items-center gap-1.5">
                                    <button
                                      onClick={() => queueAction(item.id, 'approve')}
                                      className="text-xs px-2 py-1 rounded-lg bg-emerald-50 text-emerald-700 font-bold hover:bg-emerald-100 transition flex items-center gap-1"
                                      title="Approve for sending"
                                    ><CheckCircle2 className="w-3 h-3" />Approve</button>
                                    <button
                                      onClick={() => { if (window.confirm('Remove this entry permanently?')) queueAction(item.id, 'delete'); }}
                                      className="text-xs px-2 py-1 rounded-lg bg-slate-100 text-slate-500 font-bold hover:bg-slate-200 transition flex items-center gap-1"
                                      title="Delete permanently"
                                    ><Trash2 className="w-3 h-3" /></button>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </>
                        )}

                        {/* Section: Sent */}
                        {recentQueue.filter((i: any) => i.status === 'sent').length > 0 && (
                          <>
                            <div className="px-5 py-2 bg-slate-50 flex items-center gap-2 sticky top-0 z-10">
                              <span className="w-2 h-2 rounded-full bg-slate-400 inline-block flex-shrink-0" />
                              <span className="text-xs font-black text-slate-600 uppercase tracking-wide">
                                Sent — {recentQueue.filter((i: any) => i.status === 'sent').length}
                              </span>
                            </div>
                            {recentQueue.filter((i: any) => i.status === 'sent').map((item: any) => (
                              <div key={item.id} className="px-5 py-3">
                                <div className="flex items-center justify-between gap-3">
                                  <div className="min-w-0">
                                    <p className="text-sm font-bold text-slate-700 truncate">{item.samEntity?.legalBusinessName || 'Unknown'}</p>
                                    <p className="text-xs text-slate-400 mt-0.5">{item.samEntity?.uei || '—'}</p>
                                  </div>
                                  <div className="flex items-center gap-1.5 flex-shrink-0">
                                    <span className="text-xs font-black px-2 py-1 rounded-full bg-blue-100 text-blue-700">sent</span>
                                    {item.sentAt && <span className="text-xs text-slate-400">{String(item.sentAt).slice(0,10)}</span>}
                                    <button
                                      onClick={() => { if (window.confirm('Remove this entry permanently?')) queueAction(item.id, 'delete'); }}
                                      className="text-xs px-1.5 py-1 rounded-lg bg-slate-100 text-slate-400 font-bold hover:bg-slate-200 transition"
                                      title="Delete permanently"
                                    ><Trash2 className="w-3 h-3" /></button>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </>
                        )}

                        {recentQueue.length === 0 && (
                          <div className="px-5 py-12 text-center text-sm text-slate-400">No queued entities yet. Run Score then Queue after enrichment.</div>
                        )}
                      </div>
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════════ */}
        {/* TEMPLATES TAB                                                        */}
        {/* ════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'templates' && (
          <div>
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-2xl font-black text-slate-900">Email Templates</h2>
                <p className="text-sm text-slate-500 mt-1">Manage outreach templates by category · {templates.length} template{templates.length !== 1 ? 's' : ''} in library</p>
              </div>
              <div className="flex items-center gap-3">
                {/* Seed templates button */}
                <button
                  onClick={async () => {
                    setSeedingTpls(true);
                    try {
                      const res = await fetch('/api/outreach/templates/seed', { method: 'POST' });
                      const data = await res.json();
                      if (res.ok) {
                        await fetchTemplates();
                        notify(`✅ ${data.message}`);
                      } else {
                        notify(data.error || 'Seed failed', 'error');
                      }
                    } catch {
                      notify('Seed request failed', 'error');
                    } finally {
                      setSeedingTpls(false);
                    }
                  }}
                  disabled={seedingTpls}
                  className="flex items-center gap-2 px-4 py-2.5 bg-white border-2 border-slate-200 hover:border-violet-400 hover:text-violet-700 text-slate-600 rounded-xl text-sm font-bold transition disabled:opacity-50"
                >
                  {seedingTpls ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  {seedingTpls ? 'Seeding...' : 'Seed Campaign Library'}
                </button>
                <button
                  onClick={() => {
                    setEditTpl({ id: `tpl-${Date.now()}`, name: '', subject: '', body: '', category: 'cold', usageCount: 0, tags: [] });
                    setShowTplModal(true);
                  }}
                  className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-xl text-sm font-bold hover:from-amber-600 hover:to-amber-700 transition shadow-lg shadow-amber-500/20"
                >
                  <Plus className="w-4 h-4" />New Template
                </button>
              </div>
            </div>

            {/* Category filter pills */}
            {templates.length > 0 && (() => {
              const catCounts = templates.reduce((acc, t) => {
                const c = t.category || 'cold';
                acc[c] = (acc[c] || 0) + 1;
                return acc;
              }, {} as Record<string, number>);
              const catCfgMap: Record<string, { label: string; color: string; bg: string }> = {
                cold:        { label: 'Cold Outreach',     color: 'text-blue-700',    bg: 'bg-blue-100'    },
                followup:    { label: 'Follow-Up',         color: 'text-amber-700',   bg: 'bg-amber-100'   },
                opportunity: { label: 'Opportunity-Based', color: 'text-emerald-700', bg: 'bg-emerald-100' },
                onboarding:  { label: 'Onboarding',        color: 'text-purple-700',  bg: 'bg-purple-100'  },
              };
              return (
                <div className="flex items-center gap-2 mb-5 flex-wrap">
                  {Object.entries(catCounts).map(([cat, count]) => {
                    const cfg = catCfgMap[cat] || { label: cat, color: 'text-slate-700', bg: 'bg-slate-100' };
                    return (
                      <span key={cat} className={`text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5 ${cfg.bg} ${cfg.color}`}>
                        {cfg.label}
                        <span className="w-4 h-4 rounded-full bg-white/60 flex items-center justify-center text-xs font-black">{count}</span>
                      </span>
                    );
                  })}
                  <span className="ml-auto text-xs text-slate-400 font-medium">
                    {templates.reduce((a, t) => a + (t.usageCount || 0), 0)} total sends
                  </span>
                </div>
              );
            })()}

            {templates.length === 0 ? (
              <div className="bg-white rounded-2xl border-2 border-dashed border-slate-200 py-20 text-center">
                <div className="text-5xl mb-4">📧</div>
                <p className="font-black text-slate-700 text-lg mb-1">No templates yet</p>
                <p className="text-sm text-slate-400 mb-6">Seed the library with 9 pre-built GovCon campaign templates, or create your own.</p>
                <div className="flex items-center justify-center gap-3">
                  <button
                    onClick={async () => {
                      setSeedingTpls(true);
                      try {
                        const res = await fetch('/api/outreach/templates/seed', { method: 'POST' });
                        const data = await res.json();
                        if (res.ok) { await fetchTemplates(); notify(`✅ ${data.message}`); }
                        else notify(data.error || 'Seed failed', 'error');
                      } catch { notify('Seed request failed', 'error'); } finally { setSeedingTpls(false); }
                    }}
                    disabled={seedingTpls}
                    className="flex items-center gap-2 px-6 py-3 bg-violet-600 text-white rounded-xl font-bold hover:bg-violet-700 transition shadow-lg shadow-violet-500/20 disabled:opacity-50"
                  >
                    {seedingTpls ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                    Seed 9 Campaign Templates
                  </button>
                  <button
                    onClick={() => { setEditTpl({ id: `tpl-${Date.now()}`, name: '', subject: '', body: '', category: 'cold', usageCount: 0, tags: [] }); setShowTplModal(true); }}
                    className="flex items-center gap-2 px-6 py-3 bg-white border-2 border-slate-200 text-slate-700 rounded-xl font-bold hover:border-amber-400 transition"
                  >
                    <Plus className="w-4 h-4" />Create Manually
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-5">
                {templates.map(tpl => {
                  const catKey  = tpl.category || 'cold';
                  const catCfg  = {
                    cold:        { label: 'Cold Outreach',     color: 'bg-blue-100 text-blue-800',       icon: Mail    },
                    followup:    { label: 'Follow-Up',         color: 'bg-amber-100 text-amber-800',     icon: RefreshCcw },
                    opportunity: { label: 'Opportunity-Based', color: 'bg-emerald-100 text-emerald-800', icon: Target  },
                    onboarding:  { label: 'Onboarding',        color: 'bg-purple-100 text-purple-800',   icon: Award   },
                  }[catKey] || { label: catKey, color: 'bg-slate-100 text-slate-700', icon: FileText };
                  const CI = catCfg.icon;

                  // Find linked offer code stats
                  const linkedCode = tpl.offerCode
                    ? offerCodes.find(c => c.code === tpl.offerCode)
                    : null;

                  return (
                    <div key={tpl.id} className="bg-white rounded-2xl border border-slate-200 p-6 hover:border-slate-300 hover:shadow-lg transition group">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1.5 ${catCfg.color}`}><CI className="w-3.5 h-3.5" />{catCfg.label}</span>
                          {tpl.aiGenerated && <span className="text-xs font-bold bg-violet-100 text-violet-700 px-2.5 py-1 rounded-full">✨ AI</span>}
                          {linkedCode && (
                            <span className={`text-xs font-black font-mono px-2.5 py-1 rounded-full flex items-center gap-1.5 ${linkedCode.isAvailable ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                              <Tag className="w-3 h-3" />
                              {linkedCode.code}
                              {!linkedCode.isAvailable && ' ⚠'}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition">
                          <button onClick={() => { setEditTpl({ ...tpl }); setShowTplModal(true); }} className="p-2 rounded-lg hover:bg-slate-100"><Edit3 className="w-4 h-4 text-slate-500" /></button>
                          <button onClick={() => { setCurTemplate(tpl); setShowTplPanel(true); setActiveTab('outreach'); }} className="p-2 rounded-lg hover:bg-slate-100"><Eye className="w-4 h-4 text-slate-500" /></button>
                          <button onClick={async () => {
                            const res = await fetch(`/api/outreach/templates?id=${tpl.id}`, { method: 'DELETE' });
                            if (res.ok) fetchTemplates();
                            else notify('Failed to delete template', 'error');
                          }} className="p-2 rounded-lg hover:bg-red-50"><Trash2 className="w-4 h-4 text-slate-400 hover:text-red-600" /></button>
                        </div>
                      </div>
                      <h3 className="font-black text-slate-900 text-base mb-2">{tpl.name}</h3>
                      <p className="text-sm text-slate-700 font-semibold mb-2.5 line-clamp-1">{tpl.subject}</p>
                      <p className="text-sm text-slate-600 line-clamp-2 leading-relaxed">{tpl.body.slice(0, 120)}...</p>

                      {/* Offer code activation stats */}
                      {linkedCode && (
                        <div className="mt-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-bold text-slate-600">Code Activation Stats</span>
                            <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${linkedCode.isAvailable ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                              {linkedCode.isExpired ? 'Expired' : linkedCode.isExhausted ? 'Exhausted' : !linkedCode.active ? 'Inactive' : 'Active'}
                            </span>
                          </div>
                          <div className="grid grid-cols-3 gap-2 text-center">
                            <div>
                              <p className="text-lg font-black text-slate-900">{linkedCode.usage_count}</p>
                              <p className="text-xs text-slate-400">Used</p>
                            </div>
                            <div>
                              <p className="text-lg font-black text-slate-900">
                                {linkedCode.remaining !== null && linkedCode.remaining !== undefined ? linkedCode.remaining : '∞'}
                              </p>
                              <p className="text-xs text-slate-400">Remaining</p>
                            </div>
                            <div>
                              <p className="text-lg font-black text-emerald-600">{linkedCode.activationRate ?? 0}%</p>
                              <p className="text-xs text-slate-400">Conversion</p>
                            </div>
                          </div>
                          {linkedCode.max_usage && (
                            <div className="mt-2">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-xs text-slate-400">{linkedCode.usage_count} / {linkedCode.max_usage} uses</span>
                              </div>
                              <div className="h-1.5 bg-slate-200 rounded-full">
                                <div
                                  className={`h-1.5 rounded-full transition-all ${linkedCode.isExhausted ? 'bg-red-500' : 'bg-emerald-500'}`}
                                  style={{ width: `${Math.min(100, (linkedCode.usage_count / linkedCode.max_usage) * 100)}%` }}
                                />
                              </div>
                            </div>
                          )}
                          {!linkedCode.isAvailable && (
                            <button
                              onClick={() => { setEditCode(linkedCode); setShowCodeModal(true); }}
                              className="mt-2 w-full text-xs py-1.5 bg-amber-100 text-amber-800 rounded-lg font-bold hover:bg-amber-200 transition text-center"
                            >
                              ⚠ Fix or Replace Code
                            </button>
                          )}
                        </div>
                      )}

                      <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
                        <div className="flex flex-wrap gap-1">
                          {(tpl.tags || []).slice(0, 3).map(tag => <span key={tag} className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">{tag}</span>)}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-400">{tpl.usageCount || 0} sends</span>
                          <button
                            onClick={() => { setCurTemplate(tpl); setShowTplPanel(true); setActiveTab('outreach'); }}
                            className="text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded-lg transition"
                          >
                            Use →
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════════ */}
        {/* OFFER CODES TAB                                                      */}
        {/* ════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'offerCodes' && (
          <div>
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-2xl font-black text-slate-900">Offer Code Management</h2>
                <p className="text-sm text-slate-500 mt-1">Create and track promotional codes — backed by your Neon database</p>
              </div>
              <button
                onClick={() => {
                  setEditCode({ id: `new-${Date.now()}`, code: '', description: '', discount: '', type: 'trial', usage_count: 0, max_usage: null, expires_at: null, active: true, created_at: new Date().toISOString() });
                  setShowCodeModal(true);
                }}
                className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-rose-500 to-rose-600 text-white rounded-xl text-sm font-bold hover:from-rose-600 hover:to-rose-700 transition shadow-lg shadow-rose-500/20"
              >
                <Plus className="w-4 h-4" />New Code
              </button>
            </div>

            {/* Summary KPIs */}
            <div className="grid grid-cols-4 gap-5 mb-8">
              {[
                { label: 'Total Codes',    value: offerCodes.length,                                icon: Tag,        gradient: 'from-slate-700 to-slate-800' },
                { label: 'Active Codes',   value: offerCodes.filter(c => c.active).length,         icon: ShieldCheck,gradient: 'from-emerald-500 to-emerald-600' },
                { label: 'Total Redeemed', value: offerCodes.reduce((a, c) => a + c.usage_count, 0),icon: BarChart3,  gradient: 'from-blue-500 to-blue-600' },
                { label: 'Unlimited Codes',value: offerCodes.filter(c => c.max_usage === null).length,icon: DollarSign,gradient: 'from-amber-500 to-amber-600' },
              ].map(s => (
                <div key={s.label} className={`bg-gradient-to-br ${s.gradient} rounded-2xl px-6 py-5 flex items-center gap-4 shadow-lg relative overflow-hidden`}>
                  <div className="absolute top-0 right-0 w-20 h-20 bg-white/5 rounded-full -translate-y-6 translate-x-6" />
                  <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur">
                    <s.icon className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white/70">{s.label}</p>
                    <p className="text-3xl font-black text-white tracking-tight">{s.value}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* ── TEST PANEL ── */}
            <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-5 mb-6">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-base font-black text-amber-800">🧪 Test an Offer Code</span>
                <span className="text-xs bg-amber-200 text-amber-800 font-bold px-2 py-0.5 rounded-full">Dev Tool</span>
              </div>
              <p className="text-sm text-amber-700 mb-4">Simulates a redemption call to <code className="bg-amber-100 px-1 rounded font-mono">/api/track/signup</code> — increments usage_count and moves the contractor to <strong>trial</strong> stage. Use this to verify tracking end-to-end before going live.</p>
              <div className="grid grid-cols-3 gap-3 mb-3">
                <div>
                  <label className="block text-xs font-bold text-amber-700 mb-1">Offer Code *</label>
                  <select id="test-code-select" className="w-full px-3 py-2 border-2 border-amber-300 rounded-xl text-sm font-semibold bg-white focus:outline-none">
                    {offerCodes.filter(c => c.active).map(c => <option key={c.id} value={c.code}>{c.code} — {c.description}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-amber-700 mb-1">Test Email (contractor email) *</label>
                  <input id="test-email-input" type="email" placeholder="test@company.com" className="w-full px-3 py-2 border-2 border-amber-300 rounded-xl text-sm bg-white focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-amber-700 mb-1">Trial Days</label>
                  <input id="test-days-input" type="number" defaultValue={14} min={1} max={90} className="w-full px-3 py-2 border-2 border-amber-300 rounded-xl text-sm bg-white focus:outline-none" />
                </div>
              </div>
              <button
                onClick={async () => {
                  const codeEl  = document.getElementById('test-code-select') as HTMLSelectElement;
                  const emailEl = document.getElementById('test-email-input') as HTMLInputElement;
                  const daysEl  = document.getElementById('test-days-input') as HTMLInputElement;
                  const code    = codeEl?.value;
                  const email   = emailEl?.value?.trim();
                  const days    = parseInt(daysEl?.value) || 14;
                  if (!code || !email) { notify('Code and email are required', 'error'); return; }
                  try {
                    const r = await fetch('/api/track/signup', {
                      method:  'POST',
                      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer test-local' },
                      body:    JSON.stringify({ email, offer_code: code, trial_days: days }),
                    });
                    const d = await r.json();
                    if (r.ok && d.success) {
                      notify(`✅ Code redeemed! Contractor → trial stage. Usage: ${d.usage_count ?? '+'}`);
                      fetchOfferCodes(); fetchPipeline(); fetchActivities();
                      if (emailEl) emailEl.value = '';
                    } else {
                      notify(d.error || 'Redemption failed — is the contractor email in the DB?', 'error');
                    }
                  } catch { notify('Request failed — check server console', 'error'); }
                }}
                className="px-5 py-2.5 bg-amber-600 text-white rounded-xl text-sm font-bold hover:bg-amber-700 transition flex items-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />Simulate Redemption
              </button>
            </div>

            {/* Code Table */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="px-6 py-4 border-b border-slate-100 bg-slate-50">
                <div className="grid grid-cols-9 gap-3 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  <span className="col-span-2">Code</span>
                  <span>Type</span>
                  <span>Offer</span>
                  <span>Used / Max</span>
                  <span>Remaining</span>
                  <span>Conversion</span>
                  <span>Expires</span>
                  <span>Status</span>
                </div>
              </div>
              <div className="divide-y divide-slate-100">
                {offerCodes.map(code => {
                  const isExpired   = code.isExpired   ?? (code.expires_at ? new Date(code.expires_at) < new Date() : false);
                  const isExhausted = code.isExhausted ?? (code.max_usage != null && code.usage_count >= code.max_usage);
                  const isAvailable = code.isAvailable ?? (code.active && !isExpired && !isExhausted);
                  const remaining   = code.remaining   !== undefined ? code.remaining   : (code.max_usage != null ? Math.max(0, code.max_usage - code.usage_count) : null);

                  return (
                    <div key={code.id} className={`px-6 py-4 grid grid-cols-9 gap-3 items-center hover:bg-slate-50/60 transition ${!code.active ? 'opacity-50' : ''}`}>
                      <div className="col-span-2">
                        <div className="flex items-center gap-2">
                          <span className="font-black font-mono text-slate-900 text-base">{code.code}</span>
                          <button onClick={() => clip(code.code)} className="p-1 rounded hover:bg-slate-100">
                            {copied === code.code ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
                          </button>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5 truncate max-w-[160px]">{code.description}</p>
                        {(code.templatesLinked ?? 0) > 0 && (
                          <p className="text-xs text-blue-600 font-semibold mt-0.5">{code.templatesLinked} template{code.templatesLinked !== 1 ? 's' : ''}</p>
                        )}
                      </div>
                      <span>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${code.type === 'trial' ? 'bg-blue-100 text-blue-800' : code.type === 'discount' ? 'bg-emerald-100 text-emerald-800' : 'bg-purple-100 text-purple-800'}`}>{code.type}</span>
                      </span>
                      <span className="text-sm font-bold text-slate-700">{code.discount}</span>
                      {/* Used / Max with progress */}
                      <div>
                        <div className="flex items-baseline gap-1">
                          <span className="text-sm font-black text-slate-900">{code.usage_count}</span>
                          {code.max_usage != null && <span className="text-xs text-slate-400">/ {code.max_usage}</span>}
                        </div>
                        {code.max_usage != null && (
                          <div className="mt-1 h-1.5 bg-slate-100 rounded-full w-20">
                            <div
                              className={`h-1.5 rounded-full ${isExhausted ? 'bg-red-500' : 'bg-blue-500'}`}
                              style={{ width: `${Math.min(100, (code.usage_count / code.max_usage) * 100)}%` }}
                            />
                          </div>
                        )}
                        {code.max_usage == null && <span className="text-xs text-slate-400">unlimited</span>}
                      </div>
                      {/* Remaining */}
                      <div>
                        {remaining !== null && remaining !== undefined ? (
                          <span className={`text-sm font-black ${remaining === 0 ? 'text-red-600' : remaining <= 10 ? 'text-amber-600' : 'text-emerald-600'}`}>
                            {remaining}
                          </span>
                        ) : (
                          <span className="text-sm font-black text-slate-400">∞</span>
                        )}
                      </div>
                      {/* Conversion rate */}
                      <div>
                        {(code.contractorsActivated ?? 0) > 0 ? (
                          <div>
                            <span className="text-sm font-black text-emerald-600">{code.activationRate ?? 0}%</span>
                            <p className="text-xs text-slate-400">{code.contractorsEnrolled ?? 0}/{code.contractorsActivated ?? 0}</p>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-300">—</span>
                        )}
                      </div>
                      <span className="text-xs text-slate-500">
                        {isExpired
                          ? <span className="text-red-600 font-bold">Expired</span>
                          : code.expires_at ? code.expires_at.slice(0, 10) : '—'}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${isAvailable ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'}`}>
                          {isExpired ? 'Expired' : isExhausted ? 'Exhausted' : code.active ? 'Active' : 'Off'}
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={async () => {
                              const r = await fetch('/api/crm/offer-codes', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: code.id, active: !code.active }) });
                              if (r.ok) fetchOfferCodes();
                            }}
                            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${code.active ? 'bg-emerald-500' : 'bg-slate-200'}`}
                          >
                            <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${code.active ? 'translate-x-4' : 'translate-x-0.5'}`} />
                          </button>
                          <button onClick={() => { setEditCode(code); setShowCodeModal(true); }} className="p-1.5 hover:bg-slate-100 rounded-lg"><Edit3 className="w-3.5 h-3.5 text-slate-400" /></button>
                          <button onClick={async () => { await fetch(`/api/crm/offer-codes?id=${code.id}`, { method: 'DELETE' }); fetchOfferCodes(); }} className="p-1.5 hover:bg-red-50 rounded-lg"><Trash2 className="w-3.5 h-3.5 text-slate-400 hover:text-red-500" /></button>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {offerCodes.length === 0 && (
                  <div className="px-6 py-12 text-center text-slate-400">
                    <Tag className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p className="font-semibold">No offer codes yet</p>
                    <p className="text-sm mt-1">Create your first offer code to start tracking activations</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════════ */}
        {/* SENT EMAILS TAB                                                      */}
        {/* ════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'sentEmails' && (
          <div className="space-y-6">
            {/* Header + stats row */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-black text-slate-900">Sent Email Tracker</h2>
                <p className="text-sm text-slate-500 mt-1">Full history of every outreach email sent — with company details and delivery status</p>
              </div>
              <button
                onClick={() => fetchEmailLogs(1)}
                className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-bold transition"
              >
                <RefreshCw className={`w-4 h-4 ${emailLogsLoading ? 'animate-spin' : ''}`} />Refresh
              </button>
            </div>

            {/* KPI summary row */}
            <div className="grid grid-cols-4 gap-4">
              {[
                { label: 'Total Sent',   value: emailLogsTotal,                                                            gradient: 'from-cyan-500 to-cyan-600',    icon: Mail },
                { label: 'Delivered',    value: emailLogs.filter(l => l.status === 'sent' || l.status === 'opened' || l.status === 'clicked').length, gradient: 'from-emerald-500 to-emerald-600', icon: CheckCircle2 },
                { label: 'Opened',       value: emailLogs.filter(l => l.status === 'opened' || l.status === 'clicked').length, gradient: 'from-blue-500 to-blue-600', icon: Eye },
                { label: 'Failed',       value: emailLogs.filter(l => l.status === 'failed').length,                       gradient: 'from-red-500 to-red-600',      icon: AlertCircle },
              ].map(s => (
                <div key={s.label} className={`bg-gradient-to-br ${s.gradient} rounded-2xl px-5 py-4 flex items-center gap-4 shadow-lg relative overflow-hidden`}>
                  <div className="absolute top-0 right-0 w-16 h-16 bg-white/5 rounded-full -translate-y-4 translate-x-4" />
                  <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                    <s.icon className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white/70 uppercase tracking-wide">{s.label}</p>
                    <p className="text-2xl font-black text-white">{s.value}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Search + filter bar */}
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={emailLogsSearch}
                  onChange={e => setEmailLogsSearch(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && fetchEmailLogs(1)}
                  placeholder="Search by company, email, subject, or offer code..."
                  className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400/30 focus:border-cyan-400"
                />
              </div>
              <div className="flex items-center gap-2">
                {(['all', 'sent', 'opened', 'failed'] as const).map(f => (
                  <button
                    key={f}
                    onClick={() => { setEmailLogsFilter(f); fetchEmailLogs(1); }}
                    className={`px-3 py-2 rounded-xl text-xs font-bold capitalize transition ${emailLogsFilter === f ? 'bg-cyan-600 text-white shadow-sm' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                  >
                    {f === 'all' ? 'All Status' : f}
                  </button>
                ))}
              </div>
              <button onClick={() => fetchEmailLogs(1)} className="px-4 py-2.5 bg-cyan-600 text-white rounded-xl text-sm font-bold hover:bg-cyan-700 transition">Search</button>
            </div>

            {/* Emails table */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              {/* Table header */}
              <div className="px-6 py-3 border-b border-slate-100 bg-slate-50">
                <div className="grid grid-cols-12 gap-3 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  <span className="col-span-3">Company</span>
                  <span className="col-span-2">Email</span>
                  <span className="col-span-3">Subject</span>
                  <span>Code</span>
                  <span>Campaign</span>
                  <span>Status</span>
                  <span>Sent At</span>
                </div>
              </div>

              {emailLogsLoading ? (
                <div className="flex items-center justify-center py-16 text-slate-400">
                  <Loader2 className="w-6 h-6 animate-spin mr-2" /><span className="font-semibold">Loading emails...</span>
                </div>
              ) : emailLogs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                  <Mail className="w-10 h-10 mb-3 opacity-20" />
                  <p className="font-bold text-lg">No emails sent yet</p>
                  <p className="text-sm mt-1">Emails will appear here after you run outreach campaigns</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-50">
                  {emailLogs.filter(log => !isTestEmailAddress(log.contractor_email)).map(log => {
                    const statusCfg: Record<string, { bg: string; text: string; label: string }> = {
                      sent:    { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Delivered' },
                      pending: { bg: 'bg-yellow-100',  text: 'text-yellow-700',  label: 'Pending' },
                      failed:  { bg: 'bg-red-100',     text: 'text-red-700',     label: 'Failed' },
                      opened:  { bg: 'bg-blue-100',    text: 'text-blue-700',    label: 'Opened' },
                      clicked: { bg: 'bg-violet-100',  text: 'text-violet-700',  label: 'Clicked' },
                      bounced: { bg: 'bg-slate-100',   text: 'text-slate-600',   label: 'Bounced' },
                    };
                    const sc = statusCfg[log.status] || statusCfg.pending;
                    const sentDate = new Date(log.sent_at);
                    const isToday  = sentDate.toDateString() === new Date().toDateString();
                    const dateStr  = isToday
                      ? `Today ${sentDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`
                      : sentDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' });

                    return (
                      <div key={log.id} className="px-6 py-3.5 grid grid-cols-12 gap-3 items-center hover:bg-slate-50/70 transition group">
                        {/* Company */}
                        <div className="col-span-3 min-w-0">
                          <p className="font-bold text-slate-900 text-sm truncate">{log.contractor_name || '—'}</p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            {log.contractor_state && (
                              <span className="text-xs text-slate-400 font-medium">{log.contractor_state}</span>
                            )}
                            {log.contractor_naics && (
                              <span className="text-xs bg-slate-100 text-slate-500 font-mono px-1.5 py-0.5 rounded">{log.contractor_naics}</span>
                            )}
                            {log.contractor_business_type && (
                              <span className="text-xs text-slate-400 truncate">{log.contractor_business_type}</span>
                            )}
                          </div>
                        </div>
                        {/* Email */}
                        <div className="col-span-2 min-w-0">
                          <p className="text-xs text-slate-600 truncate font-mono">{log.contractor_email || '—'}</p>
                        </div>
                        {/* Subject */}
                        <div className="col-span-3 min-w-0">
                          <p className="text-sm text-slate-700 truncate font-medium" title={log.subject}>{log.subject}</p>
                        </div>
                        {/* Offer code */}
                        <div>
                          {log.offer_code ? (
                            <span className="text-xs font-black font-mono bg-blue-50 text-blue-700 px-2 py-0.5 rounded-lg border border-blue-100">{log.offer_code}</span>
                          ) : (
                            <span className="text-xs text-slate-300">—</span>
                          )}
                        </div>
                        {/* Campaign type */}
                        <div>
                          <span className="text-xs font-semibold text-slate-500 capitalize">{log.campaign_type || '—'}</span>
                        </div>
                        {/* Status badge */}
                        <div>
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${sc.bg} ${sc.text}`}>{sc.label}</span>
                        </div>
                        {/* Date */}
                        <div>
                          <span className="text-xs text-slate-500 whitespace-nowrap">{dateStr}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Pagination footer */}
              {emailLogsTotal > 50 && (
                <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
                  <span className="text-sm text-slate-500">
                    Showing <strong>{((emailLogsPage - 1) * 50) + 1}–{Math.min(emailLogsPage * 50, emailLogsTotal)}</strong> of <strong>{emailLogsTotal}</strong> emails
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      disabled={emailLogsPage <= 1}
                      onClick={() => fetchEmailLogs(emailLogsPage - 1)}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition"
                    >← Prev</button>
                    <span className="text-sm font-bold text-slate-700">Page {emailLogsPage} of {Math.ceil(emailLogsTotal / 50)}</span>
                    <button
                      disabled={emailLogsPage >= Math.ceil(emailLogsTotal / 50)}
                      onClick={() => fetchEmailLogs(emailLogsPage + 1)}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition"
                    >Next →</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════════ */}
        {/* TEST DATA TAB                                                        */}
        {/* ════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'testData' && (
          <div>
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-black text-slate-900 flex items-center gap-3">
                  <AlertTriangle className="w-6 h-6 text-amber-500" />
                  Test Companies
                </h2>
                <p className="text-sm text-slate-500 mt-1">
                  Flagged <span className="font-bold text-amber-600">🧪 TEST</span> — automatically skipped during live email campaigns. Safe to delete anytime.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowAddTest(true)}
                  className="flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-sm font-bold transition shadow-lg shadow-amber-500/20"
                >
                  <Plus className="w-4 h-4" />Add Test Company
                </button>
                {testCompanies.length > 0 && (
                  <button
                    onClick={purgeTestContractors}
                    className="flex items-center gap-2 px-4 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-sm font-bold transition shadow-lg shadow-orange-500/20"
                  >
                    <Trash2 className="w-4 h-4" />Purge All ({testCompanies.length})
                  </button>
                )}
                <button
                  onClick={fetchTestCompanies}
                  className="p-2.5 border border-slate-200 rounded-xl bg-white hover:bg-slate-50 transition"
                >
                  <RefreshCw className={`w-4 h-4 text-slate-500 ${testCompaniesLoad ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            {/* Warning banner */}
            <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-4 mb-6 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-amber-800">Test records are excluded from live campaigns</p>
                <p className="text-xs text-amber-700 mt-0.5">
                  The send route checks <code className="bg-amber-100 px-1 rounded font-mono">is_test = true</code> and
                  skips those contractors. Use these records to safely test email templates, offer codes, and stage changes before going live.
                </p>
              </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <span className="font-black text-slate-900 text-sm">Test Contractors</span>
                  <span className="ml-2 text-xs text-slate-400 font-medium">{testCompanies.length} record{testCompanies.length !== 1 ? 's' : ''}</span>
                </div>
              </div>

              {testCompaniesLoad ? (
                <div className="flex items-center justify-center py-16 text-slate-400">
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />Loading test companies...
                </div>
              ) : testCompanies.length === 0 ? (
                <div className="py-16 text-center">
                  <div className="text-5xl mb-4">🧪</div>
                  <p className="text-slate-500 font-semibold">No test companies yet</p>
                  <p className="text-sm text-slate-400 mt-1">Click "Add Test Company" to create one</p>
                  <button
                    onClick={() => setShowAddTest(true)}
                    className="mt-4 px-4 py-2 bg-amber-500 text-white rounded-xl text-sm font-bold hover:bg-amber-600 transition"
                  >
                    <Plus className="w-4 h-4 inline mr-1" />Add Test Company
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100">
                        <th className="px-5 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Company</th>
                        <th className="px-5 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Email</th>
                        <th className="px-5 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Type</th>
                        <th className="px-5 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">NAICS</th>
                        <th className="px-5 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">State</th>
                        <th className="px-5 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Stage</th>
                        <th className="px-5 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Created</th>
                        <th className="px-5 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {testCompanies.map(c => {
                        const stageKey = (c.pipeline_stage || 'new') as keyof typeof STAGES;
                        const sc = STAGES[stageKey as PipelineStage] || STAGES['new'];
                        const SI = sc.icon;
                        return (
                          <tr key={c.id} className="hover:bg-amber-50/50 transition">
                            <td className="px-5 py-3.5">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-black bg-amber-100 text-amber-700 border border-amber-300 px-1.5 py-0.5 rounded">🧪</span>
                                <span className="font-semibold text-sm text-slate-900">{c.name}</span>
                              </div>
                            </td>
                            <td className="px-5 py-3.5 text-sm text-slate-500">{c.email}</td>
                            <td className="px-5 py-3.5">
                              {c.business_type
                                ? <span className={`text-xs px-2 py-0.5 rounded-md font-semibold ${bizBadge(c.business_type)}`}>{c.business_type}</span>
                                : <span className="text-slate-300">—</span>}
                            </td>
                            <td className="px-5 py-3.5 text-xs font-mono text-slate-500">{c.naics_code || '—'}</td>
                            <td className="px-5 py-3.5 text-xs font-bold text-slate-500">{c.state || '—'}</td>
                            <td className="px-5 py-3.5">
                              <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-lg ${sc.bg} ${sc.color}`}>
                                <SI className="w-3 h-3" />{sc.label}
                              </span>
                            </td>
                            <td className="px-5 py-3.5 text-xs text-slate-400">
                              {c.created_at ? new Date(c.created_at as string).toLocaleDateString() : '—'}
                            </td>
                            <td className="px-5 py-3.5">
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => openDrawer(c)}
                                  className="text-xs px-3 py-1.5 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-100 font-semibold transition"
                                >
                                  View
                                </button>
                                <button
                                  onClick={() => deleteTestContractor(c.id, c.name || 'this contractor')}
                                  className="text-xs px-3 py-1.5 border border-red-200 rounded-lg text-red-600 hover:bg-red-50 hover:border-red-400 font-semibold transition"
                                >
                                  Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

      </div>

      {/* ════════════════════════════════════════════════════════════════════════ */}
      {/* CONTRACTOR DETAIL DRAWER                                                */}
      {/* ════════════════════════════════════════════════════════════════════════ */}
      {showDrawer && detail && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/40" onClick={() => setShowDrawer(false)} />
          <div className="w-[460px] bg-white shadow-2xl flex flex-col overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100 flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="font-black text-lg text-slate-900">{detail.name}</h2>
                  {detail.score != null && (
                    <span className={`text-xs font-black px-2 py-0.5 rounded-lg ${scoreBg(detail.score)} ${scoreClr(detail.score)}`}>Score: {detail.score}</span>
                  )}
                </div>
                <p className="text-sm text-slate-500">{detail.email}</p>
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  {detail.business_type && <span className={`text-xs px-2 py-0.5 rounded-md font-semibold ${bizBadge(detail.business_type)}`}>{detail.business_type}</span>}
                  {detail.pipeline_stage && (() => { const sc = STAGES[detail.pipeline_stage as PipelineStage]; const SI = sc.icon; return <span className={`flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-lg ${sc.bg} ${sc.color}`}><SI className="w-3 h-3" />{sc.label}</span>; })()}
                </div>
              </div>
              <button onClick={() => setShowDrawer(false)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-400"><X className="w-5 h-5" /></button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
              {/* Quick info grid */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'State',        value: detail.state || '—' },
                  { label: 'NAICS',        value: detail.naics_code || '—' },
                  { label: 'Registered',   value: detail.registration_date?.slice(0, 10) || '—' },
                  { label: 'Attempts',     value: String(detail.contact_attempts || 0) },
                  { label: 'Offer Code',   value: detail.offer_code || '—' },
                  { label: 'Revenue',      value: detail.revenue ? fmtUSD(Number(detail.revenue)) : '—' },
                ].map(r => (
                  <div key={r.label} className="bg-slate-50 rounded-xl px-3 py-2.5">
                    <p className="text-xs text-slate-500 font-medium">{r.label}</p>
                    <p className="text-sm font-bold text-slate-900 mt-0.5">{r.value}</p>
                  </div>
                ))}
              </div>

              {/* Trial info */}
              {detail.pipeline_stage === 'trial' && detail.trial_end && (
                <div className="bg-orange-50 border-2 border-orange-200 rounded-xl p-4">
                  <p className="text-xs font-bold text-orange-800 mb-1 uppercase tracking-wide">Active Trial</p>
                  <p className="text-sm font-semibold text-orange-700">Started: {detail.trial_start?.slice(0, 10)} · Ends: {detail.trial_end.slice(0, 10)}</p>
                  <p className="text-xs text-orange-600 mt-1">{Math.ceil((new Date(detail.trial_end).getTime() - Date.now()) / 86400000)} days remaining</p>
                </div>
              )}

              {/* Stage mover */}
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Move Stage</p>
                <div className="grid grid-cols-3 gap-1.5">
                  {(Object.keys(STAGES) as PipelineStage[]).map(stage => {
                    const sc = STAGES[stage as PipelineStage]; const SI = sc.icon; const isCur = detail.pipeline_stage === stage;
                    return (
                      <button
                        key={stage}
                        onClick={async () => { await stageChange(detail.id, stage); setDetail({ ...detail, pipeline_stage: stage }); }}
                        className={`flex items-center gap-1.5 px-2 py-2 rounded-xl text-xs font-bold transition border ${isCur ? `${sc.bg} ${sc.color} ${sc.border} border-2` : 'bg-slate-50 text-slate-500 border-slate-100 hover:border-slate-200'}`}
                      >
                        <SI className="w-3 h-3 flex-shrink-0" />{sc.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Notes */}
              {detail.notes && (
                <div className="bg-slate-50 rounded-xl p-3">
                  <p className="text-xs font-bold text-slate-500 mb-1">Notes</p>
                  <p className="text-sm text-slate-700">{detail.notes}</p>
                </div>
              )}

              {/* Add note */}
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Add Note</p>
                {noteFor === detail.id ? (
                  <div className="space-y-2">
                    <textarea
                      value={noteText}
                      onChange={e => setNoteText(e.target.value)}
                      placeholder="Add a note about this contact..."
                      rows={3}
                      className="w-full px-3 py-2.5 border-2 border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:border-slate-400 resize-none"
                    />
                    <div className="flex gap-2">
                      <button onClick={() => { setNoteFor(null); setNoteText(''); }} className="flex-1 px-3 py-2 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600">Cancel</button>
                      <button onClick={() => addNote(detail.id)} className="flex-1 px-3 py-2 bg-slate-800 text-white rounded-xl text-sm font-bold hover:bg-slate-700">Save Note</button>
                    </div>
                  </div>
                ) : (
                  <button onClick={() => setNoteFor(detail.id)} className="w-full flex items-center gap-2 px-3 py-2.5 border-2 border-dashed border-slate-200 rounded-xl text-sm font-semibold text-slate-500 hover:border-slate-300 hover:bg-slate-50">
                    <Plus className="w-4 h-4" />Add a note...
                  </button>
                )}
              </div>

              {/* Tasks for this contractor */}
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Tasks</p>
                <div className="space-y-2 mb-2">
                  {detailTasks.map(task => (
                    <div key={task.id} className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${task.status === 'done' ? 'opacity-50 bg-slate-50 border-slate-100' : task.status === 'overdue' ? 'bg-red-50 border-red-200' : 'bg-white border-slate-200'}`}>
                      <button
                        onClick={() => task.status !== 'done' && completeTask(task.id)}
                        className={`w-4 h-4 rounded border-2 flex-shrink-0 flex items-center justify-center ${task.status === 'done' ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300'}`}
                      >
                        {task.status === 'done' && <Check className="w-2.5 h-2.5 text-white" />}
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs font-bold ${task.status === 'done' ? 'line-through text-slate-400' : 'text-slate-800'}`}>{task.title}</p>
                        <p className={`text-xs ${task.status === 'overdue' ? 'text-red-600 font-semibold' : 'text-slate-400'}`}>Due {task.due_date?.slice(0, 10)}</p>
                      </div>
                      <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${task.priority === 'high' ? 'bg-red-100 text-red-700' : task.priority === 'medium' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>{task.priority}</span>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => { setEditTask({ contractor_id: detail.id, contractor_name: detail.name, priority: 'medium', status: 'pending' }); setNewTaskModal(true); }}
                  className="w-full flex items-center gap-2 px-3 py-2.5 border-2 border-dashed border-slate-200 rounded-xl text-sm font-semibold text-slate-500 hover:border-slate-300 hover:bg-slate-50"
                >
                  <Plus className="w-4 h-4" />Create task...
                </button>
              </div>

              {/* Activity timeline */}
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">Activity Timeline</p>
                {detailActs.length === 0 && <p className="text-xs text-slate-400 text-center py-4">No activity yet</p>}
                <div className="space-y-3">
                  {detailActs.map((act, i) => {
                    const ac = ACT_CFG[act.type] || ACT_CFG['note_added']; const AI = ac.icon;
                    return (
                      <div key={act.id} className="flex gap-3">
                        <div className="flex flex-col items-center">
                          <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
                            <AI className={`w-3.5 h-3.5 ${ac.color}`} />
                          </div>
                          {i < detailActs.length - 1 && <div className="w-0.5 flex-1 bg-slate-100 mt-1" />}
                        </div>
                        <div className="flex-1 pb-3">
                          <div className="flex items-center justify-between">
                            <p className="text-xs font-bold text-slate-700">{ac.label}</p>
                            <span className="text-xs text-slate-400">{timeAgo(act.created_at)}</span>
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5">{act.description}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-100 flex gap-2">
              <button onClick={() => { setActiveTab('outreach'); setShowDrawer(false); }} className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700">
                <Mail className="w-4 h-4" />Send Email
              </button>
              <button
                onClick={async () => {
                  await fetch('/api/crm/activities', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contractor_id: detail.id, type: 'call_made', description: 'Manual call logged from CRM' }) });
                  notify('Call logged');
                  fetchActivities();
                }}
                className="flex items-center justify-center gap-2 px-4 py-2.5 border-2 border-slate-200 rounded-xl text-sm font-bold text-slate-700 hover:border-slate-300"
              >
                <Phone className="w-4 h-4" />Log Call
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════════ */}
      {/* SEND CONFIRMATION MODAL                                                 */}
      {/* ════════════════════════════════════════════════════════════════════════ */}
      {/* ── Send Confirmation Modal ─────────────────────────────────────────── */}
      {showSendModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden">
            {/* Header */}
            <div className={`px-8 pt-8 pb-6 ${isOutreachTestOnly ? 'bg-amber-50' : isOutreachMixedMode ? 'bg-slate-50' : 'bg-blue-50'}`}>
              <div className="flex items-center gap-4">
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${isOutreachTestOnly ? 'bg-amber-500' : isOutreachMixedMode ? 'bg-slate-700' : 'bg-blue-600'} shadow-lg`}>
                  <Send className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h3 className="font-black text-2xl text-slate-900">Send Campaign</h3>
                  <p className="text-sm text-slate-500 mt-0.5">
                    {isOutreachTestOnly
                      ? 'Test audience selected — sending to test contractors only'
                      : isOutreachMixedMode
                        ? 'Mixed audience selected — review before sending'
                        : `${selected.size} personalized email${selected.size !== 1 ? 's' : ''} via Resend`}
                  </p>
                </div>
              </div>
            </div>

            {/* Details */}
            <div className="px-8 py-6 space-y-3">
              {selectedAudienceTone && (
                <div className={`rounded-2xl border px-4 py-3 ${selectedAudienceTone.wrap}`}>
                  <p className={`text-sm font-black ${selectedAudienceTone.text}`}>{selectedAudienceTone.label}</p>
                  <p className={`text-xs mt-1 ${selectedAudienceTone.sub}`}>{selectedAudienceTone.detail}</p>
                </div>
              )}
              {[
                { label: 'Recipients',   value: `${selected.size} contractor${selected.size !== 1 ? 's' : ''}`, highlight: true },
                { label: 'Template',     value: curTemplate?.name || '—' },
                { label: 'Offer Code',   value: curTemplate?.offerCode || 'None' },
                { label: 'Personalized', value: 'Yes — company, NAICS, business type' },
                ...(selectedAudience.length > 0 ? [{ label: 'Audience Mix', value: `${selectedRealCount} real / ${selectedTestCount} test`, highlight: true }] : []),
                ...(isOutreachTestOnly ? [{ label: 'Mode', value: 'Test audience — emails WILL be sent (is_test is a label only)', highlight: true }] : []),
              ].map(row => (
                <div key={row.label} className={`flex items-center justify-between px-4 py-3 rounded-xl ${(row as any).highlight ? (isOutreachTestOnly ? 'bg-amber-100 border border-amber-200' : isOutreachMixedMode ? 'bg-slate-100 border border-slate-200' : 'bg-blue-100 border border-blue-200') : 'bg-slate-50'}`}>
                  <span className="text-sm font-semibold text-slate-600">{row.label}</span>
                  <span className={`text-sm font-bold ${(row as any).highlight ? (isOutreachTestOnly ? 'text-amber-800' : isOutreachMixedMode ? 'text-slate-800' : 'text-blue-800') : 'text-slate-900'}`}>{row.value}</span>
                </div>
              ))}
            </div>

            {/* Actions */}
            <div className="px-8 pb-8 flex gap-3">
              <button
                onClick={() => setShowSendModal(false)}
                className="flex-1 px-4 py-4 border-2 border-slate-200 rounded-2xl font-bold text-slate-700 hover:bg-slate-50 transition text-base"
              >
                Cancel
              </button>
              <button
                onClick={sendEmails}
                disabled={sending}
                className={`flex-1 px-4 py-4 rounded-2xl font-black text-white transition disabled:opacity-60 flex items-center justify-center gap-2 text-base shadow-lg ${
                  isOutreachTestOnly
                    ? 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/30'
                    : isOutreachMixedMode
                      ? 'bg-slate-700 hover:bg-slate-800 shadow-slate-700/30'
                      : 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/30'
                }`}
              >
                {sending
                  ? <><Loader2 className="w-5 h-5 animate-spin" />Sending...</>
                  : <><Send className="w-5 h-5" />Send {selected.size} Email{selected.size !== 1 ? 's' : ''}</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {showPipelineEditModal && pipelineEditForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden">
            <div className="px-8 py-6 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-black text-slate-900">Edit Enrichment</h3>
                <p className="text-sm text-slate-500 mt-1">{pipelineEditForm.legalBusinessName}</p>
              </div>
              <button onClick={() => { setShowPipelineEditModal(false); setPipelineEditForm(null); }} className="p-2 rounded-xl hover:bg-slate-100">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            <div className="px-8 py-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">Public Email</label>
                <input value={pipelineEditForm.publicEmail} onChange={e => setPipelineEditForm(prev => prev ? { ...prev, publicEmail: e.target.value } : prev)} className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:border-orange-400" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">Public Phone</label>
                <input value={pipelineEditForm.publicPhone} onChange={e => setPipelineEditForm(prev => prev ? { ...prev, publicPhone: e.target.value } : prev)} className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:border-orange-400" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">Website URL</label>
                <input value={pipelineEditForm.websiteUrl} onChange={e => setPipelineEditForm(prev => prev ? { ...prev, websiteUrl: e.target.value } : prev)} className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:border-orange-400" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">Website Domain</label>
                <input value={pipelineEditForm.websiteDomain} onChange={e => setPipelineEditForm(prev => prev ? { ...prev, websiteDomain: e.target.value } : prev)} className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:border-orange-400" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">Contact Page</label>
                <input value={pipelineEditForm.contactPageUrl} onChange={e => setPipelineEditForm(prev => prev ? { ...prev, contactPageUrl: e.target.value } : prev)} className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:border-orange-400" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">LinkedIn URL</label>
                <input value={pipelineEditForm.linkedinUrl} onChange={e => setPipelineEditForm(prev => prev ? { ...prev, linkedinUrl: e.target.value } : prev)} className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:border-orange-400" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">Facebook URL</label>
                <input value={pipelineEditForm.facebookUrl} onChange={e => setPipelineEditForm(prev => prev ? { ...prev, facebookUrl: e.target.value } : prev)} className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:border-orange-400" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">Confidence</label>
                <input value={pipelineEditForm.sourceConfidence} onChange={e => setPipelineEditForm(prev => prev ? { ...prev, sourceConfidence: e.target.value } : prev)} placeholder="0.90" className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:border-orange-400" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">Status</label>
                <select value={pipelineEditForm.enrichmentStatus} onChange={e => setPipelineEditForm(prev => prev ? { ...prev, enrichmentStatus: e.target.value } : prev)} className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl text-sm text-slate-900 bg-white focus:outline-none focus:border-orange-400">
                  <option value="pending">pending</option>
                  <option value="enriched">enriched</option>
                  <option value="manual_review">manual_review</option>
                  <option value="failed">failed</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">Notes</label>
                <textarea value={pipelineEditForm.enrichmentNotes} onChange={e => setPipelineEditForm(prev => prev ? { ...prev, enrichmentNotes: e.target.value } : prev)} rows={4} className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:border-orange-400" />
              </div>
            </div>
            <div className="px-8 pb-8 flex gap-3">
              <button onClick={() => { setShowPipelineEditModal(false); setPipelineEditForm(null); }} className="flex-1 px-4 py-3 border-2 border-slate-200 rounded-2xl font-bold text-slate-700 hover:bg-slate-50">
                Cancel
              </button>
              <button onClick={savePipelineEdit} disabled={pipelineLoading} className="flex-1 px-4 py-3 bg-orange-600 text-white rounded-2xl font-black hover:bg-orange-700 disabled:opacity-60">
                {pipelineLoading ? 'Saving...' : 'Save Enrichment'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Send Result Modal — static, user must close ──────────────────────── */}
      {sendResult && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden">
            {/* Success header */}
            <div className={`px-8 pt-8 pb-6 ${sendResult.testMode ? 'bg-amber-50' : sendResult.sentCount > 0 ? 'bg-emerald-50' : 'bg-red-50'}`}>
              <div className="flex items-center gap-4">
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg text-3xl ${
                  sendResult.testMode ? 'bg-amber-500' :
                  sendResult.sentCount > 0 ? 'bg-emerald-500' : 'bg-red-500'
                }`}>
                  {sendResult.sentCount > 0 ? '✅' : '⚠️'}
                </div>
                <div>
                  <h3 className="font-black text-2xl text-slate-900">
                    {sendResult.sentCount > 0 ? 'Campaign Sent!' : 'Nothing Sent'}
                  </h3>
                  <p className="text-sm text-slate-500 mt-0.5">{sendResult.message}</p>
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="px-8 py-6">
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-center">
                  <div className="text-3xl font-black text-emerald-700">{sendResult.sentCount}</div>
                  <div className="text-xs font-bold text-emerald-600 mt-1">Sent</div>
                </div>
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-center">
                  <div className="text-3xl font-black text-amber-700">{sendResult.skipped}</div>
                  <div className="text-xs font-bold text-amber-600 mt-1">Skipped</div>
                </div>
                <div className={`rounded-2xl p-4 text-center border ${sendResult.failed > 0 ? 'bg-red-50 border-red-200' : 'bg-slate-50 border-slate-200'}`}>
                  <div className={`text-3xl font-black ${sendResult.failed > 0 ? 'text-red-700' : 'text-slate-400'}`}>{sendResult.failed}</div>
                  <div className={`text-xs font-bold mt-1 ${sendResult.failed > 0 ? 'text-red-600' : 'text-slate-400'}`}>Failed</div>
                </div>
              </div>

              {sendResult.skipped > 0 && (
                <div className={`rounded-xl p-3 text-xs font-medium ${sendResult.testMode ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-slate-50 text-slate-500'}`}>
                  {sendResult.testMode
                    ? '🧪 Test mode — emails sent to all real email addresses. The is_test flag is a label only and does not block sending.'
                    : `${sendResult.skipped} recipient${sendResult.skipped !== 1 ? 's' : ''} were skipped (own domain, test records, or duplicates).`}
                </div>
              )}
            </div>

            {/* Close */}
            <div className="px-8 pb-8">
              <button
                onClick={() => setSendResult(null)}
                className="w-full px-4 py-4 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-black text-base transition"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════════ */}
      {/* TASK CREATE MODAL                                                        */}
      {/* ════════════════════════════════════════════════════════════════════════ */}
      {newTaskModal && editTask !== null && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-7 max-w-md w-full shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-black text-xl text-slate-900">New Task</h3>
              <button onClick={() => setNewTaskModal(false)} className="p-2 hover:bg-slate-100 rounded-lg"><X className="w-5 h-5 text-slate-500" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">Task Title *</label>
                <input type="text" value={editTask.title || ''} onChange={e => setEditTask({ ...editTask, title: e.target.value })} placeholder="e.g. Send follow-up email" className="w-full px-4 py-2.5 border-2 border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:border-slate-400" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">Contractor *</label>
                <input type="text" value={editTask.contractor_name || ''} onChange={e => setEditTask({ ...editTask, contractor_name: e.target.value })} placeholder="Contractor name" className="w-full px-4 py-2.5 border-2 border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:border-slate-400" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">Due Date *</label>
                  <input type="date" value={editTask.due_date || ''} onChange={e => setEditTask({ ...editTask, due_date: e.target.value })} className="w-full px-4 py-2.5 border-2 border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:border-slate-400" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">Priority</label>
                  <select value={editTask.priority || 'medium'} onChange={e => setEditTask({ ...editTask, priority: e.target.value as TaskPriority })} className="w-full px-4 py-2.5 border-2 border-slate-200 rounded-xl text-sm font-semibold text-slate-700 focus:outline-none bg-white">
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">Notes</label>
                <textarea value={editTask.notes || ''} onChange={e => setEditTask({ ...editTask, notes: e.target.value })} rows={2} placeholder="Optional context..." className="w-full px-4 py-2.5 border-2 border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:border-slate-400 resize-none" />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setNewTaskModal(false)} className="flex-1 px-4 py-3 border-2 border-slate-200 rounded-xl font-bold text-slate-700">Cancel</button>
              <button onClick={saveTask} className="flex-1 px-4 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-700 transition">Create Task</button>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════════ */}
      {/* TEMPLATE EDIT MODAL                                                      */}
      {/* ════════════════════════════════════════════════════════════════════════ */}
      {showTplModal && editTpl && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 max-w-2xl w-full shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-black text-xl text-slate-900">Edit Template</h3>
              <button onClick={() => setShowTplModal(false)} className="p-2 hover:bg-slate-100 rounded-lg"><X className="w-5 h-5 text-slate-500" /></button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">Name *</label>
                  <input type="text" value={editTpl.name} onChange={e => setEditTpl({ ...editTpl, name: e.target.value })} className="w-full px-4 py-2.5 border-2 border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:border-slate-400" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">Category</label>
                  <select value={editTpl.category || 'cold'} onChange={e => setEditTpl({ ...editTpl, category: e.target.value as any })} className="w-full px-4 py-2.5 border-2 border-slate-200 rounded-xl text-sm font-semibold text-slate-700 focus:outline-none bg-white">
                    <option value="cold">Cold Outreach</option>
                    <option value="followup">Follow-Up</option>
                    <option value="opportunity">Opportunity-Based</option>
                    <option value="onboarding">Onboarding</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">Subject Line *</label>
                <input type="text" value={editTpl.subject} onChange={e => setEditTpl({ ...editTpl, subject: e.target.value })} className="w-full px-4 py-2.5 border-2 border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:border-slate-400" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">Email Body *</label>
                <textarea value={editTpl.body} onChange={e => setEditTpl({ ...editTpl, body: e.target.value })} rows={12} className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl text-sm font-mono text-slate-900 focus:outline-none focus:border-slate-400" />
                <p className="text-xs text-slate-400 mt-1">Variables: [FIRST_NAME] [COMPANY_NAME] [BUSINESS_TYPE] [NAICS_CODE] [OFFER_CODE] [SIGNUP_URL] [OPPORTUNITY_TITLE] [AGENCY_NAME] [DEADLINE]</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">Offer Code (optional)</label>
                  <select value={editTpl.offerCode || ''} onChange={e => setEditTpl({ ...editTpl, offerCode: e.target.value })} className="w-full px-4 py-2.5 border-2 border-slate-200 rounded-xl text-sm font-semibold text-slate-700 focus:outline-none bg-white">
                    <option value="">No offer code</option>
                    {offerCodes.filter(c => c.active).map(c => <option key={c.id} value={c.code}>{c.code} — {c.discount}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">Tags (comma separated)</label>
                  <input type="text" value={(editTpl.tags || []).join(', ')} onChange={e => setEditTpl({ ...editTpl, tags: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })} className="w-full px-4 py-2.5 border-2 border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:border-slate-400" placeholder="e.g. cold, veteran, NAICS-541512" />
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowTplModal(false)} className="flex-1 px-4 py-3 border-2 border-slate-200 rounded-xl font-bold text-slate-700">Cancel</button>
              <button
                onClick={async () => {
                  if (!editTpl.name || !editTpl.subject || !editTpl.body) { notify('Fill required fields', 'error'); return; }
                  const isNew = editTpl.id.startsWith('tpl-');
                  const res = await fetch('/api/outreach/templates', {
                    method: isNew ? 'POST' : 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(isNew
                      ? { name: editTpl.name, subject: editTpl.subject, body: editTpl.body, category: editTpl.category || 'cold', offer_code: editTpl.offerCode, tags: editTpl.tags || [] }
                      : { id: editTpl.id, name: editTpl.name, subject: editTpl.subject, body: editTpl.body, category: editTpl.category, offer_code: editTpl.offerCode, tags: editTpl.tags }
                    ),
                  });
                  if (res.ok) { await fetchTemplates(); setShowTplModal(false); notify('Template saved'); }
                  else notify('Failed to save template', 'error');
                }}
                className="flex-1 px-4 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-700 transition"
              >Save Template</button>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════════ */}
      {/* ADD TEST OUTREACH CONTRACTOR MODAL                                       */}
      {/* ════════════════════════════════════════════════════════════════════════ */}
      {showAddTestOutreach && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="font-black text-xl text-slate-900">Add Test Contractor</h3>
                <p className="text-sm text-slate-500 mt-0.5">🧪 Flagged as TEST — skipped in real campaigns</p>
              </div>
              <button onClick={() => setShowAddTestOutreach(false)} className="p-2 hover:bg-slate-100 rounded-lg">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">Name *</label>
                  <input type="text" value={newTestOutreach.name} onChange={e => setNewTestOutreach({ ...newTestOutreach, name: e.target.value })} placeholder="e.g. Test User" className="w-full px-4 py-2.5 border-2 border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:border-amber-400" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">Email *</label>
                  <input type="email" value={newTestOutreach.email} onChange={e => setNewTestOutreach({ ...newTestOutreach, email: e.target.value })} placeholder="test@yourdomain.com" className="w-full px-4 py-2.5 border-2 border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:border-amber-400" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">Company</label>
                <input type="text" value={newTestOutreach.company} onChange={e => setNewTestOutreach({ ...newTestOutreach, company: e.target.value })} placeholder="e.g. Precise Analytics LLC" className="w-full px-4 py-2.5 border-2 border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:border-amber-400" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">NAICS</label>
                  <input type="text" value={newTestOutreach.naics_code} onChange={e => setNewTestOutreach({ ...newTestOutreach, naics_code: e.target.value })} placeholder="541512" className="w-full px-3 py-2.5 border-2 border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:border-amber-400" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">State</label>
                  <input type="text" value={newTestOutreach.state} onChange={e => setNewTestOutreach({ ...newTestOutreach, state: e.target.value.toUpperCase().slice(0, 2) })} placeholder="VA" maxLength={2} className="w-full px-3 py-2.5 border-2 border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:border-amber-400" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">Type</label>
                  <select value={newTestOutreach.business_type} onChange={e => setNewTestOutreach({ ...newTestOutreach, business_type: e.target.value })} className="w-full px-3 py-2.5 border-2 border-slate-200 rounded-xl text-sm font-semibold text-slate-700 bg-white focus:outline-none">
                    <option>Small Business</option>
                    <option>SDVOSB</option>
                    <option>WOSB</option>
                    <option>8(a) Certified</option>
                    <option>HUBZone</option>
                    <option>Minority-Owned</option>
                    <option>Veteran-Owned</option>
                  </select>
                </div>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-700 font-medium">
                ⚠️ This contractor will be flagged <strong>🧪 TEST</strong> and automatically skipped during real email campaigns. Purge all test records before going live.
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowAddTestOutreach(false)} className="flex-1 px-4 py-3 border-2 border-slate-200 rounded-xl font-bold text-slate-700 hover:bg-slate-50 transition">Cancel</button>
              <button onClick={saveTestOutreachContractor} className="flex-1 px-4 py-3 bg-amber-500 text-white rounded-xl font-bold hover:bg-amber-600 transition shadow-lg shadow-amber-500/20">
                Create Test Contractor
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════════ */}
      {/* OFFER CODE MODAL                                                         */}
      {/* ════════════════════════════════════════════════════════════════════════ */}
      {showCodeModal && editCode && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-black text-xl text-slate-900">{offerCodes.find(c => c.id === editCode.id) ? 'Edit' : 'New'} Offer Code</h3>
              <button onClick={() => setShowCodeModal(false)} className="p-2 hover:bg-slate-100 rounded-lg"><X className="w-5 h-5 text-slate-500" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">Code *</label>
                <input type="text" value={editCode.code} onChange={e => setEditCode({ ...editCode, code: e.target.value.toUpperCase().replace(/\s/g, '-') })} className="w-full px-4 py-2.5 border-2 border-slate-200 rounded-xl font-mono text-lg font-black text-slate-900 focus:outline-none focus:border-slate-400 uppercase" placeholder="e.g. PRECISE14" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">Description *</label>
                <input type="text" value={editCode.description} onChange={e => setEditCode({ ...editCode, description: e.target.value })} className="w-full px-4 py-2.5 border-2 border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:border-slate-400" placeholder="e.g. 14-day free trial for new contractors" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">Type</label>
                  <select value={editCode.type} onChange={e => setEditCode({ ...editCode, type: e.target.value as any })} className="w-full px-4 py-2.5 border-2 border-slate-200 rounded-xl text-sm font-semibold text-slate-700 focus:outline-none bg-white">
                    <option value="trial">Trial</option>
                    <option value="discount">Discount</option>
                    <option value="feature">Feature Unlock</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">Discount/Offer</label>
                  <input type="text" value={editCode.discount} onChange={e => setEditCode({ ...editCode, discount: e.target.value })} className="w-full px-4 py-2.5 border-2 border-slate-200 rounded-xl text-sm font-semibold text-slate-700 focus:outline-none" placeholder="e.g. 14 days free" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">Max Uses (blank = ∞)</label>
                  <input type="number" value={editCode.max_usage ?? ''} onChange={e => setEditCode({ ...editCode, max_usage: e.target.value ? parseInt(e.target.value) : null })} className="w-full px-4 py-2.5 border-2 border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none" placeholder="Unlimited" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">Expiry Date</label>
                  <input type="date" value={editCode.expires_at?.slice(0, 10) ?? ''} onChange={e => setEditCode({ ...editCode, expires_at: e.target.value || null })} className="w-full px-4 py-2.5 border-2 border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none" />
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                <span className="text-sm font-semibold text-slate-700 flex-1">Active</span>
                <button onClick={() => setEditCode({ ...editCode, active: !editCode.active })} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${editCode.active ? 'bg-emerald-500' : 'bg-slate-200'}`}>
                  <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${editCode.active ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowCodeModal(false)} className="flex-1 px-4 py-3 border-2 border-slate-200 rounded-xl font-bold text-slate-700">Cancel</button>
              <button onClick={saveOfferCode} className="flex-1 px-4 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-700 transition">Save Code</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
//app/dshboard/outreach/page.tsx

'use client';

import { useEffect, useState, useCallback } from 'react';
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

type PipelineStage =
  | 'new' | 'contacted' | 'opened' | 'responded'
  | 'demo' | 'trial' | 'converted' | 'churned' | 'unsubscribed';

type ActivityType =
  | 'email_sent' | 'email_opened' | 'email_replied'
  | 'call_made' | 'call_missed' | 'note_added' | 'stage_changed'
  | 'code_redeemed' | 'signed_up' | 'unsubscribed'
  | 'task_completed' | 'follow_up_scheduled';

type TaskPriority = 'high' | 'medium' | 'low';
type ActiveTab    = 'crm' | 'outreach' | 'opportunities' | 'templates' | 'offerCodes';
type FilterView   = 'total' | 'contacted' | 'enrolled' | 'inProgress' | 'success';

interface Contractor {
  id: string;
  name: string;
  email: string;
  business_type?: string;
  registration_date?: string;
  sam_gov_id?: string;
  naics_code?: string;
  state?: string;
  contacted?: boolean;
  enrolled?: boolean;
  contact_attempts?: number;
  offer_code?: string;
  notes?: string;
  priority?: string;
  score?: number;
  pipeline_stage?: PipelineStage;
  trial_start?: string;
  trial_end?: string;
  revenue?: number;
  created_at?: string;
  // computed
  inProgress?: boolean;
}

interface CrmActivity {
  id: string;
  contractor_id: string;
  contractor_name?: string;
  type: ActivityType;
  description: string;
  created_at: string;
  created_by?: string;
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

// ──────────────────────────────────────────────────────────────────────────────
// CONFIG
// ──────────────────────────────────────────────────────────────────────────────

const STAGES: Record<PipelineStage, { label: string; color: string; bg: string; border: string; icon: any }> = {
  new:          { label: 'New',        color: 'text-slate-700',   bg: 'bg-slate-100',   border: 'border-slate-300',   icon: UserPlus },
  contacted:    { label: 'Contacted',  color: 'text-blue-700',    bg: 'bg-blue-100',    border: 'border-blue-300',    icon: Mail },
  opened:       { label: 'Opened',     color: 'text-indigo-700',  bg: 'bg-indigo-100',  border: 'border-indigo-300',  icon: Eye },
  responded:    { label: 'Responded',  color: 'text-violet-700',  bg: 'bg-violet-100',  border: 'border-violet-300',  icon: Reply },
  demo:         { label: 'Demo',       color: 'text-amber-700',   bg: 'bg-amber-100',   border: 'border-amber-300',   icon: PhoneCall },
  trial:        { label: 'Trial',      color: 'text-orange-700',  bg: 'bg-orange-100',  border: 'border-orange-300',  icon: Timer },
  converted:    { label: 'Converted',  color: 'text-emerald-700', bg: 'bg-emerald-100', border: 'border-emerald-300', icon: CheckCircle2 },
  churned:      { label: 'Churned',    color: 'text-red-700',     bg: 'bg-red-100',     border: 'border-red-300',     icon: UserX },
  unsubscribed: { label: "Unsub'd",    color: 'text-gray-600',    bg: 'bg-gray-100',    border: 'border-gray-300',    icon: XCircle },
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

const US_STATES = ['AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY','DC'];
const BIZ_TYPES  = ['Small Business','Woman-Owned','Veteran-Owned','HUBZone','8(a) Certified','Minority-Owned','Service-Disabled Veteran-Owned'];
const NAICS_OPTS = [
  { code: '541511', label: 'Custom Computer Programming' },
  { code: '541512', label: 'Computer Systems Design' },
  { code: '541519', label: 'Other Computer Related' },
  { code: '541611', label: 'Admin Management Consulting' },
  { code: '518210', label: 'Data Processing, Hosting' },
  { code: '561210', label: 'Facilities Support Services' },
];

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
  'Woman-Owned': 'bg-pink-100 text-pink-800 border border-pink-200',
  'Veteran-Owned': 'bg-blue-100 text-blue-800 border border-blue-200',
  'HUBZone': 'bg-emerald-100 text-emerald-800 border border-emerald-200',
  '8(a) Certified': 'bg-purple-100 text-purple-800 border border-purple-200',
  'Small Business': 'bg-slate-100 text-slate-700 border border-slate-200',
  'Minority-Owned': 'bg-orange-100 text-orange-800 border border-orange-200',
  'Service-Disabled Veteran-Owned': 'bg-indigo-100 text-indigo-800 border border-indigo-200',
}[t || 'Small Business'] || 'bg-slate-100 text-slate-700 border border-slate-200');

const saBadge = (t?: string) => ({
  'SDVOSB': 'bg-indigo-100 text-indigo-800',
  '8(a)': 'bg-purple-100 text-purple-800',
  'WOSB': 'bg-pink-100 text-pink-800',
  'HUBZone': 'bg-emerald-100 text-emerald-800',
  'Small Business': 'bg-slate-100 text-slate-700',
  'Minority-Owned SB': 'bg-orange-100 text-orange-800',
}[t || ''] || 'bg-slate-100 text-slate-700');

const scoreBg  = (s: number) => s >= 80 ? 'bg-emerald-100' : s >= 60 ? 'bg-amber-100' : 'bg-red-100';
const scoreClr = (s: number) => s >= 80 ? 'text-emerald-700' : s >= 60 ? 'text-amber-700' : 'text-red-600';
const timeAgo  = (ts: string) => {
  const m = Math.floor((Date.now() - new Date(ts).getTime()) / 60000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
};
const fmtUSD = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(n);

// ──────────────────────────────────────────────────────────────────────────────
// COMPONENT
// ──────────────────────────────────────────────────────────────────────────────

export default function OutreachPage() {

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
  const [funnel,        setFunnel]        = useState<Record<string, number>>({});
  const [totalRevenue,  setTotalRevenue]  = useState(0);
  const [trialsEndSoon, setTrialsEndSoon] = useState(0);

  // ── Loading ──────────────────────────────────────────────────────────────────
  const [loading,       setLoading]       = useState(true);
  const [crmLoading,    setCrmLoading]    = useState(true);
  const [syncSt,        setSyncSt]        = useState<'idle' | 'syncing' | 'ok'>('idle');
  const [sending,       setSending]       = useState(false);
  const [aiGen,         setAiGen]         = useState(false);

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

  // ── Outreach UI state ────────────────────────────────────────────────────────
  const [selected,      setSelected]      = useState<Set<string>>(new Set());
  const [searchTerm,    setSearchTerm]    = useState('');
  const [showFilters,   setShowFilters]   = useState(false);
  const [showTplPanel,  setShowTplPanel]  = useState(false);
  const [curTemplate,   setCurTemplate]   = useState<EmailTemplate | null>(null);
  const [showSendModal, setShowSendModal] = useState(false);
  const [selOpp,        setSelOpp]        = useState<Opportunity | null>(null);
  const [oppSearch,     setOppSearch]     = useState('');
  const [filters,       setFilters]       = useState<ContractorFilters>({ registrationDateFrom: '', registrationDateTo: '', naicsCodes: [], states: [], businessTypes: [], naicsInput: '' });

  // ── Template / code modal state ──────────────────────────────────────────────
  const [editTpl,          setEditTpl]          = useState<EmailTemplate | null>(null);
  const [showTplModal,     setShowTplModal]     = useState(false);
  const [editCode,         setEditCode]         = useState<OfferCode | null>(null);
  const [showCodeModal,    setShowCodeModal]    = useState(false);
  const [copied,           setCopied]           = useState<string | null>(null);

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
      const r = await fetch(`/api/crm/pipeline?search=${encodeURIComponent(crmSearch)}&limit=500`);
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
  }, [crmSearch]);

  // ── Fetch outreach contractors ───────────────────────────────────────────────
  const fetchContractors = useCallback(async () => {
    try {
      setLoading(true);
      const filterParam =
        filterView === 'contacted'  ? 'contacted'  :
        filterView === 'enrolled'   ? 'enrolled'   :
        filterView === 'inProgress' ? 'contacted'  : 'all';

      const body: any = { filter: filterParam, search: searchTerm, page: 1, limit: 500 };
      if (filters.registrationDateFrom) body.registrationDateFrom = filters.registrationDateFrom;
      if (filters.registrationDateTo)   body.registrationDateTo   = filters.registrationDateTo;
      if (filters.naicsCodes.length)    body.naicsCodes            = filters.naicsCodes;
      if (filters.states.length)        body.states                = filters.states;
      if (filters.businessTypes.length) body.businessTypes         = filters.businessTypes;

      const r = await fetch('/api/sam/contractors', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
      });
      const d = await r.json();

      const mapped = (d.contractors || []).map((c: any) => ({
        id:                c.id,
        name:              c.name || 'Unknown',
        email:             c.email || '',
        sam_gov_id:        c.sam_gov_id || '',
        naics_code:        c.naics_code || '',
        state:             c.state || '',
        business_type:     c.business_type || 'Small Business',
        registration_date: c.registration_date ? new Date(c.registration_date).toISOString().split('T')[0] : '',
        contacted:         c.contacted || false,
        enrolled:          c.enrolled  || false,
        inProgress:        c.contacted && !c.enrolled,
        contact_attempts:  c.contact_attempts || 0,
        offer_code:        c.offer_code || '',
        score:             c.score || 0,
        pipeline_stage:    c.pipeline_stage || 'new',
      }));
      setContractors(mapped);
    } catch (e: any) {
      console.error('[fetchContractors]', e);
    } finally {
      setLoading(false);
    }
  }, [filterView, searchTerm, filters]);

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
      const r = await fetch('/api/crm/offer-codes');
      if (r.ok) {
        const d = await r.json();
        setOfferCodes(d.codes || []);
      }
    } catch (e) {}
  }, []);
  const fetchTemplates = useCallback(async () => {
    try {
      const res = await fetch('/api/outreach/templates');
      if (res.ok) {
        const data = await res.json();
        setTemplates(data.templates || []);
      }
    } catch (err) { console.error('Failed to fetch templates:', err); }
  }, []);
  useEffect(() => { fetchPipeline(); fetchActivities(); fetchTasks(); fetchStats(); fetchOfferCodes(); fetchTemplates(); }, []);
  useEffect(() => { if (activeTab === 'outreach') fetchContractors(); }, [activeTab, fetchContractors]);

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
        body:    JSON.stringify({ contractor_id: id, type: 'stage_changed', description: `Stage: ${STAGES[oldStage].label} → ${STAGES[stage].label}` }),
      });
      notify(`${c.name} → ${STAGES[stage].label}`);
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
      const activeCode = offerCodes.find(c => c.active)?.code || 'PRECISE14';
      if (opp) {
        setCurTemplate({
          id: `ai-${Date.now()}`,
          name: `AI: ${opp.title.slice(0, 40)}...`,
          subject: `New ${opp.setAside || ''} Opportunity: ${opp.title.slice(0, 50)} — ${opp.agency}`,
          body: `Dear [COMPANY_NAME],\n\nA new ${opp.setAside ? opp.setAside + ' set-aside ' : ''}solicitation matching NAICS ${opp.naicsCode}:\n\n📋 ${opp.title}\n🏛️ ${opp.agency}\n💰 ${opp.value}\n📅 Deadline: ${opp.responseDeadline}\n🔢 ${opp.solicitationNumber}\n\nPrecise Analytics can help support your bid. Use code ${activeCode} for 14-day free access.\n\nPrecise Analytics — Federal Business Development\nVirginia | VOSB | Minority-Owned`,
          offerCode:   activeCode,
          aiGenerated: true,
          category:    'opportunity',
        });
      } else {
        setCurTemplate({
          id: `ai-${Date.now()}`,
          name: `AI Campaign — ${new Date().toLocaleDateString()} (${selected.size} contractors)`,
          subject: `Federal Contracting Opportunities for [COMPANY_NAME] — Use Code ${activeCode}`,
          body: `Dear [COMPANY_NAME],\n\nCongratulations on your recent SAM.gov registration!\n\nAt Precise Analytics, we specialize in helping [BUSINESS_TYPE] firms identify and win federal contracts through our AI-powered opportunity matching platform.\n\nUse code ${activeCode} to access our platform free for 14 days — no credit card required.\n\nBest regards,\nPrecise Analytics — Federal Business Development\nVirginia | VOSB | Minority-Owned`,
          offerCode:   activeCode,
          aiGenerated: true,
          category:    'cold',
        });
      }
    } finally {
      setAiGen(false);
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
        body:    JSON.stringify({ contractors: toSend, template: curTemplate, personalizeEmails: true }),
      });
      const d = await r.json();
      if (d.success || d.sentCount > 0) {
        notify(`✅ Sent to ${d.sentCount || d.sent} contractors`);
        setSelected(new Set());
        setCurTemplate(null);
        setShowTplPanel(false);
        setShowSendModal(false);
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

  // ── Derived UI values ────────────────────────────────────────────────────────
  const cfg     = PILL_CONFIG[filterView];
  const visible = contractors.filter(c => {
    if (filterView === 'contacted')  return c.contacted;
    if (filterView === 'enrolled')   return c.enrolled;
    if (filterView === 'inProgress') return c.inProgress;
    if (filterView === 'success')    return c.enrolled;
    return true;
  });
  const activeFC = [
    filters.registrationDateFrom || filters.registrationDateTo,
    filters.naicsCodes.length > 0,
    filters.states.length > 0,
    filters.businessTypes.length > 0,
  ].filter(Boolean).length;

  const pipeByStage = (Object.keys(STAGES) as PipelineStage[]).reduce((acc, s) => {
    acc[s] = pipeline.filter(c =>
      (c.pipeline_stage || 'new') === s &&
      (!crmSearch || c.name.toLowerCase().includes(crmSearch.toLowerCase()))
    );
    return acc;
  }, {} as Record<PipelineStage, Contractor[]>);

  const filteredOpps = MOCK_OPPS.filter(o =>
    !oppSearch ||
    o.title.toLowerCase().includes(oppSearch.toLowerCase()) ||
    o.agency.toLowerCase().includes(oppSearch.toLowerCase()) ||
    o.naicsCode.includes(oppSearch)
  );

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
                <button onClick={() => setActiveTab('crm')} className="flex items-center gap-2 px-4 py-2.5 bg-red-500/20 border border-red-500/40 rounded-xl text-sm font-bold text-red-300 hover:bg-red-500/30 transition">
                  <AlertTriangle className="w-4 h-4" />{overdueCount} Overdue
                </button>
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
                    await fetch(`/api/sam/contractors?days=7&maxRecords=100`);
                    setSyncSt('ok');
                    notify('Synced from SAM.gov');
                    fetchPipeline();
                    fetchStats();
                  } catch { setSyncSt('idle'); notify('Sync failed', 'error'); }
                  setTimeout(() => setSyncSt('idle'), 3000);
                }}
                disabled={syncSt === 'syncing'}
                className="flex items-center gap-2 px-5 py-2.5 bg-white/10 border border-white/20 rounded-xl hover:bg-white/20 transition font-bold text-white text-sm backdrop-blur"
              >
                <RefreshCw className={`w-4 h-4 ${syncSt === 'syncing' ? 'animate-spin' : ''}`} />
                {syncSt === 'syncing' ? 'Syncing...' : syncSt === 'ok' ? '✓ Synced' : 'Sync SAM.gov'}
              </button>
            </div>
          </div>

          {/* ── Tabs ───────────────────────────────────────────────────────────── */}
          <div className="flex gap-2 mt-6">
            {([
              { id: 'crm',          label: 'CRM & Pipeline', icon: GitBranch, color: 'from-blue-500 to-blue-600' },
              { id: 'outreach',     label: 'Outreach',       icon: Mail,      color: 'from-emerald-500 to-emerald-600' },
              { id: 'opportunities',label: 'Opportunities',  icon: Target,    color: 'from-violet-500 to-violet-600' },
              { id: 'templates',    label: 'Templates',      icon: FileText,  color: 'from-amber-500 to-amber-600' },
              { id: 'offerCodes',   label: 'Offer Codes',    icon: Tag,       color: 'from-rose-500 to-rose-600' },
            ] as { id: ActiveTab; label: string; icon: any; color: string }[]).map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${
                  activeTab === tab.id
                    ? `bg-gradient-to-r ${tab.color} text-white shadow-lg`
                    : 'text-slate-400 hover:text-white hover:bg-white/10'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
                {tab.id === 'crm' && overdueCount > 0 && (
                  <span className="w-5 h-5 bg-red-500 text-white text-xs font-black rounded-full flex items-center justify-center ml-1">{overdueCount}</span>
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
              const sortedPipeline = [...pipeline]
                .filter(c => !crmSearch || c.name.toLowerCase().includes(crmSearch.toLowerCase()) || (c.naics_code || '').includes(crmSearch) || (c.state || '').toLowerCase().includes(crmSearch.toLowerCase()))
                .filter(c => stageFilter === 'all' || (c.pipeline_stage || 'new') === stageFilter)
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

              const allSelected = crmSelected.size === sortedPipeline.length && sortedPipeline.length > 0;
              const toggleAll   = () => setCrmSelected(allSelected ? new Set() : new Set(sortedPipeline.map(c => c.id)));

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
                      <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                        <input value={crmSearch} onChange={e => setCrmSearch(e.target.value)} placeholder="Search name, state, NAICS..." className="pl-8 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none w-44" />
                      </div>
                      {/* Stage filter pills */}
                      <div className="flex gap-1 flex-wrap items-center">
                        <button onClick={() => setStageFilter('all')} className={`text-xs px-2.5 py-1 rounded-lg font-bold transition ${stageFilter === 'all' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>All</button>
                        {(Object.keys(STAGES) as PipelineStage[]).map(s => {
                          const sc = STAGES[s]; const SI = sc.icon; const cnt = funnel[s] || 0; if (!cnt && stageFilter !== s) return null;
                          return (
                            <button key={s} onClick={() => setStageFilter(stageFilter === s ? 'all' : s)} className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg font-bold transition ${stageFilter === s ? `${sc.bg} ${sc.color} border ${sc.border}` : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
                              <SI className="w-3 h-3" />{sc.label} <span className="opacity-60">{cnt}</span>
                            </button>
                          );
                        })}
                      </div>
                      <div className="ml-auto flex items-center gap-2">
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
                              <Th k="state"             label="State"       cls="w-16 bg-slate-50" />
                              <Th k="naics_code"        label="NAICS"       cls="w-24 bg-slate-50" />
                              <th className="px-3 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider w-36 bg-slate-50">Set-Aside</th>
                              <Th k="registration_date" label="Reg. Date"   cls="w-28 bg-slate-50" />
                              <Th k="pipeline_stage"    label="Stage"       cls="w-32 bg-slate-50" />
                              <Th k="trial_end"         label="Trial"       cls="w-52 bg-slate-50" />
                              <Th k="score"             label="Score"       cls="w-16 bg-slate-50" />
                              <th className="px-3 py-3 w-10 bg-slate-50"></th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50">
                            {sortedPipeline.map(c => {
                              const sc  = STAGES[c.pipeline_stage || 'new'];
                              const SI  = sc.icon;
                              const sel = crmSelected.has(c.id);
                              const te  = trialEdits[c.id];
                              const isTrial = (c.pipeline_stage || 'new') === 'trial';
                              const trialDaysLeft = c.trial_end ? Math.ceil((new Date(c.trial_end).getTime() - Date.now()) / 86400000) : null;
                              return (
                                <tr key={c.id} className={`group hover:bg-slate-50/80 transition ${sel ? 'bg-blue-50/40' : ''}`}>
                                  <td className="px-3 py-2.5" onClick={e => e.stopPropagation()}>
                                    <input type="checkbox" checked={sel} onChange={() => {
                                      const s = new Set<string>(crmSelected);
                                      sel ? s.delete(c.id) : s.add(c.id);
                                      setCrmSelected(s);
                                    }} className="w-3.5 h-3.5 rounded border-slate-300 cursor-pointer" />
                                  </td>
                                  <td className="px-3 py-2.5 cursor-pointer" onClick={() => openDrawer(c)}>
                                    <p className="font-bold text-xs text-slate-900 leading-tight truncate max-w-[200px]">{c.name}</p>
                                    <p className="text-xs text-slate-400 truncate max-w-[200px]">{c.email}</p>
                                    {c.business_type && c.business_type !== 'Small Business' && (
                                      <span className={`text-xs px-1.5 py-0.5 rounded font-semibold mt-0.5 inline-block ${bizBadge(c.business_type)}`}>{c.business_type}</span>
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
                                          <option key={s} value={s}>{STAGES[s].label}</option>
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
                                          <button onClick={() => saveTrialDates(c.id)} className="text-xs px-2 py-0.5 bg-orange-500 text-white rounded font-bold hover:bg-orange-600">Save</button>
                                          <button onClick={() => setTrialEdits(p => { const n = { ...p }; delete n[c.id]; return n; })} className="text-xs px-2 py-0.5 border border-slate-200 text-slate-500 rounded hover:bg-slate-50">×</button>
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
                                      }} className="text-xs text-slate-400 hover:text-orange-600 hover:bg-orange-50 px-2 py-1 rounded-lg transition flex items-center gap-1 opacity-0 group-hover:opacity-100">
                                        <Plus className="w-3 h-3" />Set Trial
                                      </button>
                                    )}
                                  </td>
                                  <td className="px-3 py-2.5">
                                    {c.score != null && (
                                      <span className={`text-xs font-black px-2 py-0.5 rounded-lg ${scoreBg(c.score)} ${scoreClr(c.score)}`}>{c.score}</span>
                                    )}
                                  </td>
                                  <td className="px-3 py-2.5" onClick={e => e.stopPropagation()}>
                                    <button onClick={() => openDrawer(c)} className="p-1.5 hover:bg-slate-100 rounded-lg opacity-0 group-hover:opacity-100 transition">
                                      <Eye className="w-3.5 h-3.5 text-slate-500" />
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                            {sortedPipeline.length === 0 && (
                              <tr><td colSpan={10} className="py-16 text-center text-sm text-slate-400">No leads match current filters</td></tr>
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
                            <span key={s} className={`font-bold ${STAGES[s].color}`}>{STAGES[s].label}: {funnel[s]}</span>
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
                          const sc = STAGES[stage]; const count = funnel[stage] || 0;
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

        {/* ════════════════════════════════════════════════════════════════════ */}
        {/* OUTREACH TAB                                                         */}
        {/* ════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'outreach' && (
          <>
            {/* Stat Pills */}
            <div className="grid grid-cols-5 gap-5 mb-8">
              {(['total', 'contacted', 'enrolled', 'inProgress', 'success'] as FilterView[]).map(view => {
                const c = PILL_CONFIG[view]; const Icon = c.icon; const isActive = filterView === view;
                let count = 0;
                if (view === 'total')      count = stats.totalContractors;
                else if (view === 'contacted')  count = stats.contacted;
                else if (view === 'enrolled')   count = stats.enrolled;
                else if (view === 'inProgress') count = stats.inProgress;
                else count = Math.round(stats.successRate);
                return (
                  <button
                    key={view}
                    onClick={() => setFilterView(view)}
                    className={`px-5 py-4 rounded-2xl border-2 transition-all shadow-sm text-left ${
                      isActive
                        ? `${c.activeBg} ${c.activeText} ${c.activeBorder} shadow-lg`
                        : `bg-white border-slate-200 ${c.inactiveHover} text-slate-700`
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isActive ? c.activeIconBg : 'bg-slate-100'}`}>
                        <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                      </div>
                      <div>
                        <p className={`text-xs font-semibold ${isActive ? 'text-white/80' : 'text-slate-500'}`}>{c.sublabel}</p>
                        <p className={`text-2xl font-black tracking-tight mt-0.5 ${isActive ? 'text-white' : 'text-slate-900'}`}>
                          {view === 'success' ? `${count}%` : count.toLocaleString()}
                        </p>
                      </div>
                    </div>
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
                    <p className="text-xs text-slate-400 mt-1.5">Variables: [COMPANY_NAME] [BUSINESS_TYPE] [NAICS_CODE] [OFFER_CODE]</p>
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
                          {offerCodes.filter(c => c.active).map(c => <option key={c.id} value={c.code}>{c.code} — {c.discount}</option>)}
                        </select>
                        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Contractor Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className={`px-6 py-4 border-b-2 ${cfg.sectionBorder} ${cfg.sectionBg}`}>
                <div className="flex gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search by name, email, state, NAICS, SAM ID..."
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
                        {NAICS_OPTS.map(n => (
                          <button
                            key={n.code}
                            onClick={() => setFilters({ ...filters, naicsCodes: filters.naicsCodes.includes(n.code) ? filters.naicsCodes.filter(x => x !== n.code) : [...filters.naicsCodes, n.code] })}
                            className={`text-xs px-2 py-1 rounded-lg font-medium transition ${filters.naicsCodes.includes(n.code) ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                          >{n.code}</button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wide">States</label>
                      <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto">
                        {US_STATES.map(s => (
                          <button
                            key={s}
                            onClick={() => setFilters({ ...filters, states: filters.states.includes(s) ? filters.states.filter(x => x !== s) : [...filters.states, s] })}
                            className={`text-xs px-2 py-1 rounded-lg font-mono font-bold transition ${filters.states.includes(s) ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                          >{s}</button>
                        ))}
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
                <div className="px-6 py-3 bg-slate-50 border-b border-slate-100 flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={selected.size === visible.length && visible.length > 0}
                    onChange={() => setSelected(selected.size === visible.length ? new Set() : new Set(visible.map(c => c.id)))}
                    className="w-4 h-4 rounded border-slate-300 cursor-pointer"
                  />
                  <span className="text-xs font-semibold text-slate-600">{selected.size === visible.length ? 'Deselect All' : 'Select All'}</span>
                  {selected.size > 0 && <span className="ml-auto text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-1 rounded-lg">{selected.size} selected</span>}
                </div>
              )}

              {loading ? (
                <div className="flex items-center justify-center py-16 text-slate-400">
                  <Loader2 className="w-6 h-6 animate-spin mr-2" />Loading contractors...
                </div>
              ) : visible.length === 0 ? (
                <div className="px-6 py-16 text-center">
                  <AlertCircle className="w-10 h-10 mx-auto mb-3 text-slate-200" />
                  <p className="text-slate-500 font-semibold">No contractors in this view</p>
                  <p className="text-sm text-slate-400 mt-1">Try a different filter or sync SAM.gov</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {visible.map(contractor => (
                    <div
                      key={contractor.id}
                      className={`px-6 py-4 flex items-center gap-4 transition cursor-pointer hover:bg-slate-50 ${selected.has(contractor.id) ? cfg.sectionBg : ''}`}
                      onClick={() => { const s = new Set(selected); s.has(contractor.id) ? s.delete(contractor.id) : s.add(contractor.id); setSelected(s); }}
                    >
                      <input type="checkbox" checked={selected.has(contractor.id)} onChange={() => {}} onClick={e => e.stopPropagation()} className="w-4 h-4 rounded border-slate-300 cursor-pointer flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-sm text-slate-900">{contractor.name}</span>
                          {contractor.business_type && (
                            <span className={`text-xs px-2 py-0.5 rounded-md font-semibold ${bizBadge(contractor.business_type)}`}>{contractor.business_type}</span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">{contractor.email}</p>
                        <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                          {contractor.sam_gov_id && <span className="font-mono flex items-center gap-1 text-xs text-slate-400"><Hash className="w-3 h-3" />{contractor.sam_gov_id}</span>}
                          {contractor.naics_code && <span className="font-mono flex items-center gap-1 text-xs text-slate-400"><Building2 className="w-3 h-3" />NAICS {contractor.naics_code}</span>}
                          {contractor.registration_date && <span className="flex items-center gap-1 text-xs text-slate-400"><Calendar className="w-3 h-3" />Reg. {contractor.registration_date}</span>}
                          {contractor.state && <span className="flex items-center gap-1 text-xs font-semibold text-slate-500"><MapPin className="w-3 h-3" />{contractor.state}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <div className="flex flex-col items-end gap-1">
                          {contractor.enrolled && <span className="flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full"><CheckCircle2 className="w-3 h-3" />Enrolled</span>}
                          {contractor.inProgress && !contractor.enrolled && <span className="flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full"><Clock className="w-3 h-3" />In Progress</span>}
                          {contractor.contacted && !contractor.inProgress && !contractor.enrolled && <span className="flex items-center gap-1 text-xs font-semibold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full"><Mail className="w-3 h-3" />Contacted</span>}
                          <span className="text-xs text-slate-400">{contractor.contact_attempts || 0} attempt{contractor.contact_attempts !== 1 ? 's' : ''}</span>
                        </div>
                        <ExternalLink className="w-3.5 h-3.5 text-slate-300 hover:text-slate-500 transition" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {visible.length > 0 && (
                <div className={`px-6 py-3 border-t ${cfg.sectionBorder} ${cfg.sectionBg} flex items-center justify-between`}>
                  <span className="text-xs text-slate-500">Showing {visible.length.toLocaleString()} contractors</span>
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
                <h2 className="text-2xl font-black text-slate-900">Live Federal Opportunities</h2>
                <p className="text-sm text-slate-500 mt-1">SAM.gov solicitations matching your contractor base — updated daily</p>
              </div>
              <button onClick={() => notify('Opportunities refreshed', 'info')} className="flex items-center gap-2 px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-bold text-slate-600 bg-white hover:border-slate-300 transition">
                <RefreshCw className="w-4 h-4" />Refresh
              </button>
            </div>
            <div className="relative mb-5">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input type="text" placeholder="Search opportunities by title, agency, NAICS..." value={oppSearch} onChange={e => setOppSearch(e.target.value)} className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-slate-300 bg-white" />
            </div>
            <div className="space-y-4">
              {filteredOpps.map(opp => {
                const isSel = selOpp?.id === opp.id;
                const days  = Math.ceil((new Date(opp.responseDeadline).getTime() - Date.now()) / 86400000);
                return (
                  <div key={opp.id} className={`bg-white rounded-2xl border transition-all ${isSel ? 'border-emerald-400 shadow-lg' : 'border-slate-200 hover:border-slate-300 hover:shadow-md'}`}>
                    <div className="p-5 cursor-pointer" onClick={() => setSelOpp(isSel ? null : opp)}>
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${saBadge(opp.setAside)}`}>{opp.setAside || 'Open'}</span>
                            <span className="text-xs font-semibold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{opp.type}</span>
                            <span className="font-mono text-xs font-semibold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">NAICS {opp.naicsCode}</span>
                            {days <= 7 && <span className="text-xs font-bold bg-red-100 text-red-700 px-2 py-0.5 rounded-full">⚡ {days}d left</span>}
                          </div>
                          <h3 className="font-black text-slate-900 text-base">{opp.title}</h3>
                          <p className="text-sm text-slate-500 mt-0.5 font-medium">{opp.agency}</p>
                          <div className="flex items-center gap-4 mt-2">
                            <span className="flex items-center gap-1 text-xs text-slate-400"><DollarSign className="w-3 h-3" />{opp.value}</span>
                            <span className="flex items-center gap-1 text-xs text-slate-400"><Calendar className="w-3 h-3" />Deadline: {opp.responseDeadline}</span>
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
        {/* TEMPLATES TAB                                                        */}
        {/* ════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'templates' && (
          <div>
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-2xl font-black text-slate-900">Email Templates</h2>
                <p className="text-sm text-slate-500 mt-1">Manage outreach templates by category</p>
              </div>
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
            <div className="grid grid-cols-2 gap-5">
              {templates.map(tpl => {
                const catKey  = tpl.category || 'cold';
                const catCfg  = { cold: { label: 'Cold Outreach', color: 'bg-blue-100 text-blue-800', icon: Mail }, followup: { label: 'Follow-Up', color: 'bg-amber-100 text-amber-800', icon: RefreshCcw }, opportunity: { label: 'Opportunity-Based', color: 'bg-emerald-100 text-emerald-800', icon: Target }, onboarding: { label: 'Onboarding', color: 'bg-purple-100 text-purple-800', icon: Award } }[catKey] || { label: catKey, color: 'bg-slate-100 text-slate-700', icon: FileText };
                const CI = catCfg.icon;
                return (
                  <div key={tpl.id} className="bg-white rounded-2xl border border-slate-200 p-6 hover:border-slate-300 hover:shadow-md transition">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${catCfg.color}`}><CI className="w-3 h-3" />{catCfg.label}</span>
                        {tpl.aiGenerated && <span className="text-xs font-bold bg-violet-100 text-violet-800 px-2 py-0.5 rounded-full">AI</span>}
                      </div>
                      <div className="flex items-center gap-1">
                        <button onClick={() => { setEditTpl({ ...tpl }); setShowTplModal(true); }} className="p-1.5 rounded-lg hover:bg-slate-100"><Edit3 className="w-4 h-4 text-slate-400" /></button>
                        <button onClick={() => { setCurTemplate(tpl); setShowTplPanel(true); setActiveTab('outreach'); }} className="p-1.5 rounded-lg hover:bg-slate-100"><Eye className="w-4 h-4 text-slate-400" /></button>
                        <button onClick={async () => {
                          const res = await fetch(`/api/outreach/templates?id=${tpl.id}`, { method: 'DELETE' });
                          if (res.ok) fetchTemplates();
                          else notify('Failed to delete template', 'error');
                        }} className="p-1.5 rounded-lg hover:bg-red-50"><Trash2 className="w-4 h-4 text-slate-400 hover:text-red-500" />
                        </button>
                      </div>
                    </div>
                    <h3 className="font-black text-slate-900 text-sm mb-1">{tpl.name}</h3>
                    <p className="text-xs text-slate-500 font-medium mb-2 line-clamp-1">{tpl.subject}</p>
                    <p className="text-xs text-slate-400 line-clamp-2">{tpl.body.slice(0, 120)}...</p>
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
                      <div className="flex flex-wrap gap-1">
                        {(tpl.tags || []).slice(0, 3).map(tag => <span key={tag} className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">{tag}</span>)}
                      </div>
                      <span className="text-xs text-slate-400">{tpl.usageCount || 0} uses</span>
                    </div>
                  </div>
                );
              })}
            </div>
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

            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="px-6 py-4 border-b border-slate-100 bg-slate-50">
                <div className="grid grid-cols-7 gap-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  <span className="col-span-2">Code</span><span>Type</span><span>Offer</span><span>Usage</span><span>Expires</span><span>Status</span>
                </div>
              </div>
              <div className="divide-y divide-slate-100">
                {offerCodes.map(code => (
                  <div key={code.id} className={`px-6 py-4 grid grid-cols-7 gap-4 items-center ${!code.active ? 'opacity-50' : ''}`}>
                    <div className="col-span-2">
                      <div className="flex items-center gap-2">
                        <span className="font-black font-mono text-slate-900 text-base">{code.code}</span>
                        <button onClick={() => clip(code.code)} className="p-1 rounded hover:bg-slate-100">
                          {copied === code.code ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
                        </button>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">{code.description}</p>
                    </div>
                    <span>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${code.type === 'trial' ? 'bg-blue-100 text-blue-800' : code.type === 'discount' ? 'bg-emerald-100 text-emerald-800' : 'bg-purple-100 text-purple-800'}`}>{code.type}</span>
                    </span>
                    <span className="text-sm font-bold text-slate-700">{code.discount}</span>
                    <div>
                      <span className="text-sm font-bold text-slate-900">{code.usage_count}</span>
                      {code.max_usage && <span className="text-xs text-slate-400"> / {code.max_usage}</span>}
                      {code.max_usage && (
                        <div className="mt-1 h-1.5 bg-slate-100 rounded-full w-20">
                          <div className="h-1.5 bg-blue-500 rounded-full" style={{ width: `${Math.min(100, (code.usage_count / code.max_usage) * 100)}%` }} />
                        </div>
                      )}
                    </div>
                    <span className="text-xs text-slate-500">{code.expires_at ? code.expires_at.slice(0, 10) : '—'}</span>
                    <div className="flex items-center gap-2">
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
                ))}
                {offerCodes.length === 0 && (
                  <div className="px-6 py-12 text-center text-slate-400">
                    <Tag className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p className="font-semibold">No offer codes yet</p>
                    <p className="text-sm mt-1">Run the SQL migration to seed default codes</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Solid Footer ──────────────────────────────────────────────────────── */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border-t-4 border-orange-500 mt-auto">
        <div className="px-8 py-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center">
              <GitBranch className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-white">PreciseGovCon CRM</p>
              <p className="text-xs text-slate-400">Precise Analytics LLC — SDVOSB · Minority-Owned · Richmond, VA</p>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <span className="text-xs text-slate-500">{pipeline.length} leads in pipeline</span>
            <span className="text-xs text-slate-500">{offerCodes.filter(c => c.active).length} active offer codes</span>
            <span className="text-xs text-slate-500">{tasks.filter(t => t.status !== 'done').length} open tasks</span>
          </div>
        </div>
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
                  {detail.pipeline_stage && (() => { const sc = STAGES[detail.pipeline_stage]; const SI = sc.icon; return <span className={`flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-lg ${sc.bg} ${sc.color}`}><SI className="w-3 h-3" />{sc.label}</span>; })()}
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
                    const sc = STAGES[stage]; const SI = sc.icon; const isCur = detail.pipeline_stage === stage;
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
      {showSendModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-14 h-14 rounded-xl bg-blue-100 flex items-center justify-center"><Send className="w-7 h-7 text-blue-600" /></div>
              <div>
                <h3 className="font-black text-xl text-slate-900">Send Campaign?</h3>
                <p className="text-sm text-slate-500">Sending {selected.size} personalized emails via Resend</p>
              </div>
            </div>
            <div className="space-y-3 mb-6">
              {[
                { label: 'Recipients', value: `${selected.size} contractors` },
                { label: 'Template',   value: curTemplate?.name || '—' },
                { label: 'Offer Code', value: curTemplate?.offerCode || 'None' },
                { label: 'Personalized', value: 'Yes — company name, NAICS, business type' },
              ].map(row => (
                <div key={row.label} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                  <span className="text-sm font-medium text-slate-600">{row.label}</span>
                  <span className="text-sm font-bold text-slate-900">{row.value}</span>
                </div>
              ))}
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowSendModal(false)} className="flex-1 px-4 py-3 border-2 border-slate-200 rounded-xl font-bold text-slate-700">Cancel</button>
              <button onClick={sendEmails} disabled={sending} className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition disabled:opacity-50 flex items-center justify-center gap-2">
                {sending ? <><Loader2 className="w-4 h-4 animate-spin" />Sending...</> : <><Send className="w-4 h-4" />Send Now</>}
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
                <p className="text-xs text-slate-400 mt-1">Variables: [COMPANY_NAME] [BUSINESS_TYPE] [NAICS_CODE] [OFFER_CODE] [OPPORTUNITY_TITLE] [AGENCY_NAME] [DEADLINE]</p>
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
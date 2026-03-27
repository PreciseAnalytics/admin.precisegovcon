// components/CampaignTemplateSelector.tsx
// Grid of the 9 named campaign templates from lib/email/templates.ts.
// On select: fetches rendered preview from /api/outreach/campaigns,
// auto-fills vars from the provided contractor (if any), and opens EmailPreviewModal.

'use client';

import { useState, useCallback } from 'react';
import {
  Mail, BookOpen, Gift, Tag, Clock, AlertTriangle,
  TrendingUp, UserX, Building2, Sparkles, ChevronRight,
  Users, Check,
} from 'lucide-react';
import EmailPreviewModal, { PreviewData, VarFields } from './EmailPreviewModal';
import type { Contractor } from '../types/contractor';

// ── Template metadata (mirrors GET /api/outreach/campaigns) ──────────────────

interface TemplateMeta {
  key:         string;
  label:       string;
  description: string;
  category:    'cold' | 'nurture' | 'trial' | 'lifecycle' | 'enterprise';
  varsNeeded:  string[];
}

const TEMPLATE_META: TemplateMeta[] = [
  { key: 'cold_sam_registrant',  label: 'Cold SAM Registrant',   description: 'First touch for newly SAM-registered businesses. Introduces PreciseGovCon and its value.',         category: 'cold',       varsNeeded: ['first_name', 'company_name'] },
  { key: 'value_education',      label: 'Value / Education',      description: 'Teaches the 4-step federal contracting process. Great nurture email for early-stage leads.',         category: 'nurture',    varsNeeded: ['first_name'] },
  { key: 'trial_invite',         label: 'Trial Invitation',       description: 'Personal invite for a named free trial. Works well as a follow-up to cold outreach.',               category: 'trial',      varsNeeded: ['first_name', 'company_name', 'trial_days'] },
  { key: 'trial_code_offer',     label: 'Trial Code Offer',       description: 'Sends a unique promo code for self-serve activation. Use with an active offer code.',               category: 'trial',      varsNeeded: ['first_name', 'company_name', 'trial_code', 'trial_days'] },
  { key: 'trial_expiring_48h',   label: 'Trial Expiring (48h)',   description: 'Upgrade nudge sent 48 hours before trial ends. Reminds them what they\'ll lose.',                  category: 'lifecycle',  varsNeeded: ['first_name', 'expiry_date'] },
  { key: 'trial_expiring_24h',   label: 'Trial Expiring (24h)',   description: 'Final upgrade nudge — last chance message with a 10% discount code.',                              category: 'lifecycle',  varsNeeded: ['first_name'] },
  { key: 'upgrade_prompt',       label: 'Upgrade Prompt',         description: 'Post-trial win-back that highlights all three plan tiers. Good for churned trial users.',           category: 'lifecycle',  varsNeeded: ['first_name'] },
  { key: 'abandoned_signup',     label: 'Abandoned Signup',       description: 'Re-engages users who started signup but never finished. Sent automatically by cron.',               category: 'cold',       varsNeeded: ['first_name'] },
  { key: 'enterprise_demo',      label: 'Enterprise Demo',        description: 'High-touch demo invite for larger contractors. Links to Calendly for a 30-min walkthrough.',        category: 'enterprise', varsNeeded: ['first_name', 'company_name'] },
];

const CATEGORY_CONFIG = {
  cold:       { label: 'Cold Outreach', bg: 'bg-blue-50',    border: 'border-blue-200',    text: 'text-blue-700',    icon: Mail,          dot: 'bg-blue-500' },
  nurture:    { label: 'Nurture',       bg: 'bg-violet-50',  border: 'border-violet-200',  text: 'text-violet-700',  icon: BookOpen,      dot: 'bg-violet-500' },
  trial:      { label: 'Trial',         bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', icon: Gift,          dot: 'bg-emerald-500' },
  lifecycle:  { label: 'Lifecycle',     bg: 'bg-amber-50',   border: 'border-amber-200',   text: 'text-amber-700',   icon: Clock,         dot: 'bg-amber-500' },
  enterprise: { label: 'Enterprise',    bg: 'bg-slate-50',   border: 'border-slate-200',   text: 'text-slate-700',   icon: Building2,     dot: 'bg-slate-500' },
};

const TEMPLATE_ICONS: Record<string, any> = {
  cold_sam_registrant: Mail,
  value_education:     BookOpen,
  trial_invite:        Gift,
  trial_code_offer:    Tag,
  trial_expiring_48h:  Clock,
  trial_expiring_24h:  AlertTriangle,
  upgrade_prompt:      TrendingUp,
  abandoned_signup:    UserX,
  enterprise_demo:     Building2,
};

// ── Props ────────────────────────────────────────────────────────────────────

interface Props {
  // Pre-selected contractors to send to (from outreach tab selection)
  selectedContractors: Contractor[];
  // Active offer codes for auto-suggest
  activeOfferCode?: string;
  // Called after a successful send
  onSendComplete: (result: { sentCount: number; failed: number }) => void;
}

// ── Component ────────────────────────────────────────────────────────────────

export default function CampaignTemplateSelector({ selectedContractors, activeOfferCode, onSendComplete }: Props) {
  const [selectedKey,   setSelectedKey]   = useState<string | null>(null);
  const [preview,       setPreview]       = useState<PreviewData | null>(null);
  const [previewOpen,   setPreviewOpen]   = useState(false);
  const [previewLoad,   setPreviewLoad]   = useState(false);
  const [sending,       setSending]       = useState(false);
  const [categoryFilter,setCategoryFilter]= useState<string>('all');
  const [sentKeys,      setSentKeys]      = useState<Set<string>>(new Set());

  // Vars — seeded from the first selected contractor when one is available
  const seedVars = useCallback((): VarFields => {
    const first = selectedContractors[0];
    return {
      first_name:   first?.name?.split(' ')[0] || '',
      company_name: (first as any)?.company_name || first?.name || '',
      trial_code:   activeOfferCode || 'PRECISE14',
      trial_days:   '14',
      expiry_date:  '',
    };
  }, [selectedContractors, activeOfferCode]);

  const [vars, setVars] = useState<VarFields>(seedVars);

  // ── Fetch rendered preview ────────────────────────────────────────────────

  const fetchPreview = useCallback(async (key: string, overrideVars?: VarFields) => {
    setPreviewLoad(true);
    try {
      const res = await fetch('/api/outreach/campaigns', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          templateKey: key,
          vars: {
            ...(overrideVars || vars),
            trial_days: parseInt((overrideVars || vars).trial_days) || 14,
          },
        }),
      });
      if (!res.ok) throw new Error('Render failed');
      const data = await res.json();
      setPreview({ subject: data.subject, html: data.html, text: data.text });
    } catch (e) {
      console.error('[fetchPreview]', e);
    } finally {
      setPreviewLoad(false);
    }
  }, [vars]);

  // ── Open preview modal for a template ────────────────────────────────────

  const openPreview = async (key: string) => {
    const seeded = seedVars();
    setVars(seeded);
    setSelectedKey(key);
    setPreviewOpen(true);
    await fetchPreview(key, seeded);
  };

  // ── Re-render when vars change ────────────────────────────────────────────

  const handleRerender = () => {
    if (selectedKey) fetchPreview(selectedKey);
  };

  // ── Send campaign ─────────────────────────────────────────────────────────

  const sendCampaign = async () => {
    if (!selectedKey || selectedContractors.length === 0 || !preview) return;
    setSending(true);
    try {
      // Build personalised template objects for each contractor and call existing send route
      const res = await fetch('/api/outreach/send', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          contractors:       selectedContractors,
          campaignTemplateKey: selectedKey,    // server will personalise per contractor
          template: {
            id:      `campaign-${selectedKey}`,
            name:    TEMPLATE_META.find(t => t.key === selectedKey)?.label || selectedKey,
            subject: preview.subject,
            body:    preview.html,
            category: TEMPLATE_META.find(t => t.key === selectedKey)?.category || 'cold',
          },
          personalizeEmails:   true,
          useCampaignTemplate: true,
          defaultVars: {
            ...vars,
            trial_days:     parseInt(vars.trial_days) || 14,
            trial_code:     vars.trial_code || activeOfferCode || 'PRECISE14',
          },
        }),
      });
      const data = await res.json();
      if (data.success !== false) {
        setSentKeys(prev => new Set([...prev, selectedKey]));
        setPreviewOpen(false);
        onSendComplete({ sentCount: data.sentCount ?? 0, failed: data.failedCount ?? 0 });
      }
    } catch (e) {
      console.error('[sendCampaign]', e);
    } finally {
      setSending(false);
    }
  };

  // ── Filtered templates ────────────────────────────────────────────────────

  const filtered = categoryFilter === 'all'
    ? TEMPLATE_META
    : TEMPLATE_META.filter(t => t.category === categoryFilter);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">

      {/* ── Header banner ── */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-slate-900">Campaign Templates</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            {selectedContractors.length > 0
              ? <><span className="font-bold text-slate-700">{selectedContractors.length.toLocaleString()}</span> contractor{selectedContractors.length !== 1 ? 's' : ''} selected from Outreach tab</>
              : 'Select contractors in the Outreach tab, then pick a template to send'
            }
          </p>
        </div>
        {selectedContractors.length > 0 && (
          <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2">
            <Users className="w-4 h-4 text-emerald-600" />
            <span className="text-sm font-bold text-emerald-700">{selectedContractors.length} ready</span>
          </div>
        )}
      </div>

      {/* ── No contractors warning ── */}
      {selectedContractors.length === 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex items-start gap-4">
          <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-amber-800 text-sm">No contractors selected</p>
            <p className="text-amber-700 text-sm mt-0.5">
              Go to the <strong>Outreach</strong> tab, check the contractors you want to email, then come back here to choose a campaign template.
            </p>
          </div>
        </div>
      )}

      {/* ── Category filter pills ── */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={() => setCategoryFilter('all')}
          className={`px-3 py-1.5 rounded-full text-xs font-bold border transition ${
            categoryFilter === 'all'
              ? 'bg-slate-900 text-white border-slate-900'
              : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
          }`}
        >
          All ({TEMPLATE_META.length})
        </button>
        {Object.entries(CATEGORY_CONFIG).map(([key, cfg]) => {
          const count = TEMPLATE_META.filter(t => t.category === key).length;
          const Icon  = cfg.icon;
          return (
            <button
              key={key}
              onClick={() => setCategoryFilter(key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition ${
                categoryFilter === key
                  ? `${cfg.bg} ${cfg.text} ${cfg.border}`
                  : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
              }`}
            >
              <Icon className="w-3 h-3" />
              {cfg.label} ({count})
            </button>
          );
        })}
      </div>

      {/* ── Template grid ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map(tpl => {
          const catCfg  = CATEGORY_CONFIG[tpl.category];
          const Icon    = TEMPLATE_ICONS[tpl.key] || Mail;
          const wasSent = sentKeys.has(tpl.key);

          return (
            <div
              key={tpl.key}
              className={`relative bg-white rounded-2xl border-2 p-5 flex flex-col gap-4 transition-all cursor-pointer group hover:shadow-lg hover:-translate-y-0.5 ${
                selectedKey === tpl.key && previewOpen
                  ? 'border-slate-900 shadow-lg'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
              onClick={() => openPreview(tpl.key)}
            >
              {/* Sent badge */}
              {wasSent && (
                <div className="absolute top-3 right-3 flex items-center gap-1 bg-emerald-100 text-emerald-700 text-xs font-bold px-2 py-0.5 rounded-full">
                  <Check className="w-3 h-3" /> Sent
                </div>
              )}

              {/* Icon + category */}
              <div className="flex items-center justify-between">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${catCfg.bg} ${catCfg.border} border`}>
                  <Icon className={`w-5 h-5 ${catCfg.text}`} />
                </div>
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${catCfg.bg} ${catCfg.text} ${catCfg.border} border`}>
                  {catCfg.label}
                </span>
              </div>

              {/* Label + description */}
              <div className="flex-1">
                <h3 className="font-black text-slate-900 text-sm">{tpl.label}</h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">{tpl.description}</p>
              </div>

              {/* Vars needed */}
              <div className="flex flex-wrap gap-1">
                {tpl.varsNeeded.map(v => (
                  <span key={v} className="text-xs font-mono bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md">
                    {v}
                  </span>
                ))}
              </div>

              {/* CTA */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                <span className="text-xs text-slate-400 font-medium">Click to preview & send</span>
                <div className="flex items-center gap-1 text-xs font-bold text-slate-700 group-hover:text-slate-900 transition">
                  <Sparkles className="w-3.5 h-3.5" />
                  Preview
                  <ChevronRight className="w-3.5 h-3.5" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Preview modal ── */}
      <EmailPreviewModal
        open={previewOpen}
        onClose={() => { setPreviewOpen(false); setSelectedKey(null); }}
        preview={preview}
        loading={previewLoad}
        recipientCount={selectedContractors.length}
        onSend={sendCampaign}
        sending={sending}
        vars={vars}
        onVarsChange={setVars}
        onRerender={handleRerender}
      />
    </div>
  );
}

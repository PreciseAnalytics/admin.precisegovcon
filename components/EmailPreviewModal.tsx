// components/EmailPreviewModal.tsx
// Renders a full email HTML preview in an iframe.
// Shows subject, mobile/desktop toggle, and a collapsible var-override panel.
// Used by the Campaigns tab before sending.

'use client';

import { useState, useRef, useEffect } from 'react';
import {
  X, Monitor, Smartphone, Copy, Check, ChevronDown, ChevronUp,
  Send, Loader2, Eye,
} from 'lucide-react';

export interface PreviewData {
  subject: string;
  html:    string;
  text:    string;
}

interface Props {
  open:         boolean;
  onClose:      () => void;
  preview:      PreviewData | null;
  loading:      boolean;
  recipientCount: number;
  onSend:       () => void;
  sending:      boolean;
  // Var override panel
  vars:         VarFields;
  onVarsChange: (v: VarFields) => void;
  onRerender:   () => void;
}

export interface VarFields {
  first_name:    string;
  company_name:  string;
  trial_code:    string;
  trial_days:    string;
  expiry_date:   string;
}

const EMPTY_VARS: VarFields = {
  first_name:   '',
  company_name: '',
  trial_code:   '',
  trial_days:   '14',
  expiry_date:  '',
};

export default function EmailPreviewModal({
  open, onClose, preview, loading,
  recipientCount, onSend, sending,
  vars, onVarsChange, onRerender,
}: Props) {
  const [viewport,      setViewport]      = useState<'desktop' | 'mobile'>('desktop');
  const [showVars,      setShowVars]      = useState(false);
  const [showText,      setShowText]      = useState(false);
  const [copiedSubject, setCopiedSubject] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Write HTML into the iframe each time preview changes
  useEffect(() => {
    if (!iframeRef.current || !preview?.html) return;
    const doc = iframeRef.current.contentDocument;
    if (!doc) return;
    doc.open();
    doc.write(preview.html);
    doc.close();
  }, [preview?.html]);

  const copySubject = () => {
    if (!preview) return;
    navigator.clipboard.writeText(preview.subject);
    setCopiedSubject(true);
    setTimeout(() => setCopiedSubject(false), 2000);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl flex flex-col w-full max-w-4xl max-h-[94vh] overflow-hidden">

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center">
              <Eye className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="font-black text-slate-900 text-base">Email Preview</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                {recipientCount > 0 ? `Sending to ${recipientCount.toLocaleString()} contractor${recipientCount !== 1 ? 's' : ''}` : 'No recipients selected'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg transition">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* ── Subject bar ── */}
        {preview && (
          <div className="flex items-center gap-3 px-6 py-3 bg-slate-50 border-b border-slate-100 flex-shrink-0">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wide w-14">Subject</span>
            <span className="flex-1 text-sm font-semibold text-slate-800 truncate">{preview.subject}</span>
            <button
              onClick={copySubject}
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-200 rounded-lg transition"
            >
              {copiedSubject ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              {copiedSubject ? 'Copied' : 'Copy'}
            </button>
          </div>
        )}

        {/* ── Toolbar ── */}
        <div className="flex items-center justify-between px-6 py-2.5 border-b border-slate-100 flex-shrink-0">
          {/* Viewport toggle */}
          <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
            <button
              onClick={() => setViewport('desktop')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition ${
                viewport === 'desktop' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Monitor className="w-3.5 h-3.5" /> Desktop
            </button>
            <button
              onClick={() => setViewport('mobile')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition ${
                viewport === 'mobile' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" /> Mobile
            </button>
          </div>

          <div className="flex items-center gap-2">
            {/* Plain text toggle */}
            <button
              onClick={() => setShowText(s => !s)}
              className="text-xs font-semibold text-slate-500 hover:text-slate-800 px-2.5 py-1.5 hover:bg-slate-100 rounded-lg transition"
            >
              {showText ? 'Show HTML' : 'Show Plain Text'}
            </button>
            {/* Var override toggle */}
            <button
              onClick={() => setShowVars(s => !s)}
              className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 px-2.5 py-1.5 hover:bg-slate-100 rounded-lg transition"
            >
              Edit Variables
              {showVars ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* ── Variable override panel ── */}
        {showVars && (
          <div className="px-6 py-4 bg-amber-50 border-b border-amber-100 flex-shrink-0">
            <p className="text-xs font-bold text-amber-700 uppercase tracking-wide mb-3">
              Override Preview Variables
              <span className="ml-2 font-normal normal-case text-amber-600">Auto-filled from contractor when sending to a list</span>
            </p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {[
                { key: 'first_name',   label: 'First Name',   placeholder: 'e.g. Jane' },
                { key: 'company_name', label: 'Company',      placeholder: 'e.g. Acme Corp' },
                { key: 'trial_code',   label: 'Trial Code',   placeholder: 'e.g. PRECISE14' },
                { key: 'trial_days',   label: 'Trial Days',   placeholder: '14' },
                { key: 'expiry_date',  label: 'Expiry Date',  placeholder: 'e.g. March 31, 2025' },
              ].map(f => (
                <div key={f.key}>
                  <label className="block text-xs font-bold text-amber-700 mb-1">{f.label}</label>
                  <input
                    type="text"
                    value={vars[f.key as keyof VarFields]}
                    onChange={e => onVarsChange({ ...vars, [f.key]: e.target.value })}
                    placeholder={f.placeholder}
                    className="w-full px-3 py-2 border border-amber-200 rounded-lg text-sm text-slate-800 bg-white focus:outline-none focus:border-amber-400 placeholder:text-slate-300"
                  />
                </div>
              ))}
            </div>
            <button
              onClick={onRerender}
              disabled={loading}
              className="mt-3 flex items-center gap-2 px-4 py-2 bg-amber-500 text-white text-xs font-bold rounded-lg hover:bg-amber-600 transition disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
              Re-render Preview
            </button>
          </div>
        )}

        {/* ── Preview area ── */}
        <div className="flex-1 overflow-auto bg-slate-100 flex items-start justify-center p-6 min-h-0">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-64 gap-3">
              <Loader2 className="w-8 h-8 text-slate-400 animate-spin" />
              <p className="text-sm text-slate-400 font-medium">Rendering template…</p>
            </div>
          ) : !preview ? (
            <div className="flex flex-col items-center justify-center h-64 gap-2">
              <p className="text-sm text-slate-400">Select a template to preview</p>
            </div>
          ) : showText ? (
            <div
              className="w-full max-w-2xl bg-white rounded-xl border border-slate-200 p-6"
              style={{ fontFamily: 'ui-monospace, monospace', fontSize: 13, whiteSpace: 'pre-wrap', color: '#334155', lineHeight: 1.7 }}
            >
              {preview.text}
            </div>
          ) : (
            <div
              className="bg-white rounded-xl overflow-hidden shadow-lg transition-all duration-300"
              style={{ width: viewport === 'mobile' ? 390 : '100%', maxWidth: viewport === 'desktop' ? 680 : 390 }}
            >
              <iframe
                ref={iframeRef}
                title="Email Preview"
                className="w-full border-0 block"
                style={{ height: 600, minHeight: 400 }}
                sandbox="allow-same-origin"
              />
            </div>
          )}
        </div>

        {/* ── Footer / send bar ── */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50 flex-shrink-0">
          <p className="text-sm text-slate-500">
            {recipientCount > 0
              ? <><span className="font-bold text-slate-800">{recipientCount.toLocaleString()}</span> recipient{recipientCount !== 1 ? 's' : ''} selected</>
              : <span className="text-amber-600 font-semibold">No recipients — select contractors in the Outreach tab first</span>
            }
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2.5 border-2 border-slate-200 rounded-xl text-sm font-bold text-slate-700 hover:bg-slate-100 transition"
            >
              Close
            </button>
            <button
              onClick={onSend}
              disabled={sending || recipientCount === 0 || !preview}
              className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-black hover:bg-slate-700 transition disabled:opacity-40 disabled:cursor-not-allowed shadow-lg"
            >
              {sending
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending…</>
                : <><Send className="w-4 h-4" /> Send Campaign</>
              }
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

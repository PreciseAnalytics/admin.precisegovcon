'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Mail,
  Download,
  Send,
  Sparkles,
  Users,
  TrendingUp,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Filter,
  ArrowRight,
} from 'lucide-react';
import { toast } from 'sonner';

interface Contractor {
  id: string;
  name: string;
  email: string;
  dba?: string;
  address?: string;
  businessType?: string;
  registrationDate?: string;
  samgovId?: string;
  contacted?: boolean;
  enrolled?: boolean;
  contactAttempts?: number;
}

interface OutreachStats {
  totalContractors: number;
  contacted: number;
  enrolled: number;
  inProgress: number;
  successRate: number;
}

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  aiGenerated?: boolean;
}

export default function OutreachPage() {
  const router = useRouter();
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [stats, setStats] = useState<OutreachStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [generatingTemplate, setGeneratingTemplate] = useState(false);
  const [selectedContractors, setSelectedContractors] = useState<Set<string>>(
    new Set()
  );
  const [searchTerm, setSearchTerm] = useState('');
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [sendingEmails, setSendingEmails] = useState(false);

  useEffect(() => {
    fetchContractors();
    fetchStats();
    loadTemplates();
  }, [searchTerm]);

  const fetchContractors = async () => {
    try {
      const params = new URLSearchParams({
        limit: '50',
        ...(searchTerm && { search: searchTerm }),
      });

      const res = await fetch(`/api/outreach/contractors?${params}`);
      if (res.ok) {
        const data = await res.json();
        setContractors(data.contractors || []);
      }
    } catch (error) {
      console.error('Failed to fetch contractors:', error);
      toast.error('Failed to load contractors');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/outreach/stats');
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const loadTemplates = async () => {
    try {
      const res = await fetch('/api/outreach/templates');
      if (res.ok) {
        const data = await res.json();
        setTemplates(data.templates || []);
      }
    } catch (error) {
      console.error('Failed to load templates:', error);
    }
  };

  const generateEmailTemplate = async () => {
    setGeneratingTemplate(true);
    try {
      const res = await fetch('/api/outreach/generate-template', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetAudience: 'Government contractors from SAM.gov',
          offerType: 'Free trial',
          messageLength: 'short',
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const newTemplate: EmailTemplate = {
          id: `template-${Date.now()}`,
          name: 'AI Generated Template',
          subject: data.subject,
          body: data.body,
          aiGenerated: true,
        };

        setTemplates([newTemplate, ...templates]);
        setSelectedTemplate(newTemplate.id);
        toast.success('Email template generated with AI!');
      } else {
        toast.error('Failed to generate template');
      }
    } catch (error) {
      console.error('Failed to generate template:', error);
      toast.error('Failed to generate template');
    } finally {
      setGeneratingTemplate(false);
    }
  };

  const handleSelectContractor = (id: string) => {
    const updated = new Set(selectedContractors);
    if (updated.has(id)) {
      updated.delete(id);
    } else {
      updated.add(id);
    }
    setSelectedContractors(updated);
  };

  const handleSelectAll = () => {
    if (selectedContractors.size === contractors.length) {
      setSelectedContractors(new Set());
    } else {
      setSelectedContractors(new Set(contractors.map((c) => c.id)));
    }
  };

  const sendOutreachEmails = async () => {
    if (selectedContractors.size === 0) {
      toast.error('Please select at least one contractor');
      return;
    }

    if (!selectedTemplate) {
      toast.error('Please select an email template');
      return;
    }

    const template = templates.find((t) => t.id === selectedTemplate);
    if (!template) {
      toast.error('Template not found');
      return;
    }

    setSendingEmails(true);
    try {
      const contractorsList = contractors.filter((c) =>
        selectedContractors.has(c.id)
      );

      const res = await fetch('/api/outreach/send-emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contractors: contractorsList,
          template,
          personalizeEmails: true,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        toast.success(
          `Successfully sent ${data.sentCount} emails! ${data.failedCount > 0 ? `${data.failedCount} failed.` : ''}`
        );
        setSelectedContractors(new Set());
        fetchStats();
        fetchContractors();
      } else {
        toast.error('Failed to send emails');
      }
    } catch (error) {
      console.error('Failed to send emails:', error);
      toast.error('Failed to send emails');
    } finally {
      setSendingEmails(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-6">
          <div className="h-12 bg-slate-200 rounded w-48" />
          <div className="grid grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-slate-200 rounded" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">
          Contractor Outreach
        </h1>
        <p className="text-slate-600">
          Find and enroll SAM.gov government contractors with free trials
        </p>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <div className="bg-white rounded-lg border border-slate-200 p-4 hover:shadow-md transition">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-slate-600">Total</span>
              <Users className="w-4 h-4 text-slate-400" />
            </div>
            <p className="text-2xl font-bold text-slate-900">
              {stats.totalContractors}
            </p>
            <p className="text-xs text-slate-500 mt-1">Contractors found</p>
          </div>

          <div className="bg-white rounded-lg border border-slate-200 p-4 hover:shadow-md transition">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-slate-600">Contacted</span>
              <Mail className="w-4 h-4 text-blue-600" />
            </div>
            <p className="text-2xl font-bold text-slate-900">{stats.contacted}</p>
            <p className="text-xs text-slate-500 mt-1">Outreach sent</p>
          </div>

          <div className="bg-white rounded-lg border border-slate-200 p-4 hover:shadow-md transition">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-slate-600">Enrolled</span>
              <CheckCircle2 className="w-4 h-4 text-green-600" />
            </div>
            <p className="text-2xl font-bold text-slate-900">{stats.enrolled}</p>
            <p className="text-xs text-slate-500 mt-1">Sign-ups</p>
          </div>

          <div className="bg-white rounded-lg border border-slate-200 p-4 hover:shadow-md transition">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-slate-600">In Progress</span>
              <Loader2 className="w-4 h-4 text-orange-600" />
            </div>
            <p className="text-2xl font-bold text-slate-900">{stats.inProgress}</p>
            <p className="text-xs text-slate-500 mt-1">Awaiting response</p>
          </div>

          <div className="bg-white rounded-lg border border-slate-200 p-4 hover:shadow-md transition">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-slate-600">Success</span>
              <TrendingUp className="w-4 h-4 text-green-600" />
            </div>
            <p className="text-2xl font-bold text-slate-900">
              {stats.successRate.toFixed(1)}%
            </p>
            <p className="text-xs text-slate-500 mt-1">Conversion rate</p>
          </div>
        </div>
      )}

      {/* Email Template Section */}
      <div className="bg-white rounded-lg border border-slate-200 p-6 mb-8">
        <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <Mail className="w-5 h-5 text-orange-600" />
          Email Template
        </h2>

        <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center">
          <div className="flex-1">
            <select
              value={selectedTemplate}
              onChange={(e) => setSelectedTemplate(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="">Select a template...</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}{t.aiGenerated ? ' (AI)' : ''}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={generateEmailTemplate}
            disabled={generatingTemplate}
            className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg font-medium transition"
          >
            {generatingTemplate ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Generate with AI
              </>
            )}
          </button>
        </div>

        {selectedTemplate && templates.find((t) => t.id === selectedTemplate) && (
          <div className="mt-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
            <div className="mb-3">
              <p className="text-sm font-medium text-slate-700 mb-1">Subject:</p>
              <p className="text-sm text-slate-900">
                {templates.find((t) => t.id === selectedTemplate)?.subject}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-700 mb-1">Preview:</p>
              <p className="text-sm text-slate-700 whitespace-pre-wrap">
                {templates
                  .find((t) => t.id === selectedTemplate)
                  ?.body.substring(0, 200)}
                ...
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Contractors List */}
      <div className="bg-white rounded-lg border border-slate-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex-1">
            <h3 className="font-semibold text-slate-900">
              Contractors ({selectedContractors.size} selected)
            </h3>
          </div>

          {selectedContractors.size > 0 && (
            <button
              onClick={sendOutreachEmails}
              disabled={sendingEmails || !selectedTemplate}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white rounded-lg font-medium transition"
            >
              {sendingEmails ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Send Emails
                </>
              )}
            </button>
          )}
        </div>

        {/* Search */}
        <div className="px-6 py-4 border-b border-slate-200">
          <input
            type="text"
            placeholder="Search contractors by name, email, company..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>

        {/* List */}
        {contractors.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <AlertCircle className="w-12 h-12 mx-auto mb-3 text-slate-300" />
            <p className="text-slate-500">No contractors found</p>
            <p className="text-sm text-slate-400 mt-1">
              Expand your search or check back later for new registrations
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-200">
            {/* Select All */}
            <div className="px-6 py-3 bg-slate-50 flex items-center gap-3">
              <input
                type="checkbox"
                checked={selectedContractors.size === contractors.length}
                onChange={handleSelectAll}
                className="w-4 h-4 rounded border-slate-300 text-orange-600"
              />
              <span className="text-sm font-medium text-slate-700">
                {selectedContractors.size === contractors.length
                  ? 'Deselect All'
                  : 'Select All'}
              </span>
            </div>

            {/* Contractors */}
            {contractors.map((contractor) => (
              <div
                key={contractor.id}
                className="px-6 py-4 flex items-center gap-4 hover:bg-slate-50 transition"
              >
                <input
                  type="checkbox"
                  checked={selectedContractors.has(contractor.id)}
                  onChange={() => handleSelectContractor(contractor.id)}
                  className="w-4 h-4 rounded border-slate-300 text-orange-600"
                />

                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-slate-900">{contractor.name}</h4>
                  <p className="text-sm text-slate-600">{contractor.email}</p>
                  {contractor.dba && (
                    <p className="text-xs text-slate-500 mt-1">
                      {contractor.dba}
                    </p>
                  )}
                </div>

                <div className="text-right">
                  <div className="flex items-center gap-2 mb-1">
                    {contractor.enrolled && (
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                    )}
                    {contractor.contacted && !contractor.enrolled && (
                      <Mail className="w-4 h-4 text-blue-600" />
                    )}
                  </div>
                  <p className="text-xs text-slate-500">
                    {contractor.contactAttempts || 0} attempts
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

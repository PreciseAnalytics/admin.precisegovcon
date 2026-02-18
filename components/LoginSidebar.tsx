//components/LoginSide.tsx

'use client';

import DateTimeClock from '@/components/DateTimeClock';
import { ExternalLink, HelpCircle, Mail, Globe } from 'lucide-react';

const LINKS = [
  { icon: Globe,     label: 'Main Website',        href: 'https://precisegovcon.com',        description: 'Visit our main site',  external: true,  bg: '#1e3a8a', hover: '#1e40af' },
  { icon: Mail,      label: 'Contact Support',      href: 'mailto:support@precisegovcon.com', description: 'Email us for help',    external: false, bg: '#92400e', hover: '#b45309' },
  { icon: HelpCircle,label: 'Help & Documentation', href: '/help',                            description: 'View help articles',   external: false, bg: '#14532d', hover: '#166534' },
];

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div style={{ height:3, width:24, borderRadius:9, background:'#f97316' }}/>
      <p className="text-sm font-black text-slate-800 uppercase tracking-widest whitespace-nowrap">{children}</p>
      <div style={{ height:3, flex:1, borderRadius:9, background:'#fed7aa' }}/>
    </div>
  );
}

export default function LoginSidebar() {
  return (
    <div className="flex flex-col gap-6">

      {/* Welcome */}
      <div>
        <h2 className="text-4xl font-black bg-gradient-to-r from-orange-600 to-orange-400 bg-clip-text text-transparent mb-2">
          Welcome Back!
        </h2>
        <div style={{ height:5, width:56, borderRadius:9, background:'linear-gradient(90deg,#ea580c,#fb923c)', marginBottom:12 }}/>
        <p className="text-lg font-black text-slate-900 leading-relaxed">
          Your centralized hub for managing subscriptions, users, and analytics.
        </p>
      </div>

      {/* Clock + 7-day weather */}
      <div>
        <SectionLabel>Current Time &amp; Weather</SectionLabel>
        <DateTimeClock />
      </div>

      {/* Helpful links — all solid colored, high-contrast */}
      <div>
        <SectionLabel>Helpful Links</SectionLabel>
        <div className="flex flex-col gap-3">
          {LINKS.map((link) => {
            const Icon = link.icon;
            return (
              <a key={link.label} href={link.href}
                target={link.external ? '_blank' : undefined}
                rel={link.external ? 'noopener noreferrer' : undefined}
                className="flex items-center gap-4 px-5 py-4 rounded-xl transition-all active:scale-[0.98] shadow-md hover:shadow-xl hover:brightness-110"
                style={{ background: link.bg, textDecoration:'none' }}>
                <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background:'rgba(0,0,0,0.25)' }}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <span className="block text-lg font-black text-white leading-tight">{link.label}</span>
                  <span className="block text-sm font-bold text-white/90 leading-tight mt-0.5">{link.description}</span>
                </div>
                {link.external && <ExternalLink className="w-5 h-5 text-white/80 flex-shrink-0"/>}
              </a>
            );
          })}
        </div>
      </div>

      {/* Footer */}
      <div style={{ paddingTop:12, borderTop:'2px solid #d1d5db' }}>
        <p className="text-sm font-black text-slate-700 text-center">
          &copy; {new Date().getFullYear()} Precise Govcon &mdash; Government Contracting Platform
        </p>
      </div>
    </div>
  );
}
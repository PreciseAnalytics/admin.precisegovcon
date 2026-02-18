'use client';

import DateTimeClock from '@/components/DateTimeClock';
import QuoteOfDay from '@/components/QuoteOfDay';
import { ExternalLink, HelpCircle, Mail, Globe } from 'lucide-react';

export default function LoginSidebar() {
  const links = [
    {
      icon: Globe,
      label: 'Main Website',
      href: 'https://precisegovcon.com',
      description: 'Visit our main site'
    },
    {
      icon: Mail,
      label: 'Contact Support',
      href: 'mailto:support@precisegovcon.com',
      description: 'Email us for help'
    },
    {
      icon: HelpCircle,
      label: 'Help & Documentation',
      href: '/help',
      description: 'View help articles'
    }
  ];

  return (
    <div className="flex flex-col justify-between h-full py-8 px-6">
      {/* Top section - Welcome and Date/Time */}
      <div className="space-y-6">
        {/* Welcome Message */}
        <div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-orange-600 to-orange-400 bg-clip-text text-transparent mb-2">
            Welcome Back!
          </h2>
          <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
            Welcome to the Precise Govcon Admin Portal. Your centralized hub for managing subscriptions, users, and analytics.
          </p>
        </div>

        {/* Date/Time Clock */}
        <div>
          <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-3">
            Current Time
          </h3>
          <DateTimeClock />
        </div>

        {/* Quote of the Day */}
        <div>
          <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-3">
            Daily Inspiration
          </h3>
          <QuoteOfDay />
        </div>
      </div>

      {/* Bottom section - Helpful Links */}
      <div className="space-y-3">
        <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
          Helpful Links
        </h3>
        <div className="space-y-2">
          {links.map((link) => {
            const Icon = link.icon;
            return (
              <a
                key={link.label}
                href={link.href}
                target={link.href.startsWith('http') ? '_blank' : undefined}
                rel={link.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors group"
              >
                <Icon className="w-4 h-4 text-orange-600 dark:text-orange-400 group-hover:scale-110 transition-transform flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300 group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">
                    {link.label}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {link.description}
                  </p>
                </div>
                <ExternalLink className="w-3 h-3 text-slate-400 dark:text-slate-500 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
              </a>
            );
          })}
        </div>
      </div>

      {/* Footer */}
      <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
        <p className="text-xs text-slate-500 dark:text-slate-400 text-center">
          © 2025 Precise Govcon<br/>
          <span className="text-slate-400 dark:text-slate-500">Government Contracting Platform</span>
        </p>
      </div>
    </div>
  );
}

'use client';

import { X, TrendingUp, Users, Ban, CreditCard, Filter } from 'lucide-react';

interface StatItem {
  label: string;
  value: number;
  color?: string;
  icon?: React.ReactNode;
}

interface StatDrillDownModalProps {
  isOpen: boolean;
  title: string;
  subtitle?: string;
  items: StatItem[];
  onFilterClick?: (filter: string) => void;
  onClose: () => void;
}

export default function StatDrillDownModal({
  isOpen,
  title,
  subtitle,
  items,
  onFilterClick,
  onClose,
}: StatDrillDownModalProps) {
  if (!isOpen) return null;

  const totalValue = items.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-96 overflow-y-auto">
        {/* Modal Header */}
        <div className="sticky top-0 bg-gradient-to-r from-orange-600 to-red-500 px-6 py-4 flex items-center justify-between border-b border-orange-600">
          <div>
            <h2 className="text-lg font-bold text-white">{title}</h2>
            {subtitle && <p className="text-xs text-orange-100 mt-1">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-orange-700 rounded-lg transition text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-3">
          {items.map((item, index) => {
            const percentage = totalValue > 0 ? (item.value / totalValue) * 100 : 0;

            return (
              <button
                key={index}
                onClick={() => onFilterClick?.(item.label)}
                className={`w-full p-4 rounded-lg border-2 transition-all hover:shadow-md ${
                  item.color || 'border-slate-200 bg-slate-50 hover:bg-slate-100'
                } text-left group`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    {item.icon && (
                      <div className="flex-shrink-0">
                        {item.icon}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-slate-900 group-hover:text-orange-600 transition truncate">
                        {item.label}
                      </p>
                    </div>
                  </div>
                  <div className="flex-shrink-0 ml-2">
                    {onFilterClick && (
                      <Filter className="w-4 h-4 text-slate-400 group-hover:text-orange-600 opacity-0 group-hover:opacity-100 transition" />
                    )}
                  </div>
                </div>

                <div className="flex items-end justify-between gap-2">
                  <div>
                    <p className="text-2xl font-bold text-slate-900">{item.value}</p>
                    <p className="text-xs text-slate-500 mt-1">{percentage.toFixed(1)}% of total</p>
                  </div>
                  {totalValue > 0 && (
                    <div className="flex-1 max-w-xs">
                      <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-orange-500 to-red-500 h-full rounded-full transition-all duration-300"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Modal Footer */}
        <div className="sticky bottom-0 bg-slate-50 border-t border-slate-200 px-6 py-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase">Total</p>
            <p className="text-2xl font-bold text-slate-900">{totalValue}</p>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-medium rounded-lg transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

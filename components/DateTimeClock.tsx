'use client';

import { useEffect, useState } from 'react';
import { Calendar, Clock } from 'lucide-react';

export default function DateTimeClock() {
  const [time, setTime] = useState<string>('');
  const [date, setDate] = useState<string>('');

  useEffect(() => {
    // Set initial time and date
    const updateDateTime = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      }));
      setDate(now.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      }));
    };

    updateDateTime();
    const interval = setInterval(updateDateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-4">
      {/* Date */}
      <div className="flex items-center gap-3">
        <Calendar className="w-5 h-5 text-orange-500 flex-shrink-0" />
        <span className="text-sm text-slate-600 dark:text-slate-400">
          {date || 'Loading...'}
        </span>
      </div>

      {/* Time */}
      <div className="flex items-center gap-3">
        <Clock className="w-5 h-5 text-orange-500 flex-shrink-0" />
        <span className="text-lg font-mono text-slate-700 dark:text-slate-300 font-semibold">
          {time || '--:--:-- --'}
        </span>
      </div>
    </div>
  );
}

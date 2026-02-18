'use client';

import { useEffect, useState } from 'react';
import { Lightbulb } from 'lucide-react';

interface Quote {
  text: string;
  author: string;
}

const QUOTES: Quote[] = [
  {
    text: "The best time to plant a tree was 20 years ago. The second best time is now.",
    author: "Chinese Proverb"
  },
  {
    text: "Success is not final, failure is not fatal: it is the courage to continue that counts.",
    author: "Winston Churchill"
  },
  {
    text: "The only way to do great work is to love what you do.",
    author: "Steve Jobs"
  },
  {
    text: "Don't watch the clock; do what it does. Keep going.",
    author: "Sam Levenson"
  },
  {
    text: "The future belongs to those who believe in the beauty of their dreams.",
    author: "Eleanor Roosevelt"
  },
  {
    text: "It is during our darkest moments that we must focus to see the light.",
    author: "Aristotle"
  },
  {
    text: "The only impossible journey is the one you never begin.",
    author: "Tony Robbins"
  },
  {
    text: "Success is not how high you have climbed, but how you make a positive difference to the world.",
    author: "Roy T. Bennett"
  },
  {
    text: "Believe you can and you're halfway there.",
    author: "Theodore Roosevelt"
  },
  {
    text: "The best revenge is massive success.",
    author: "Frank Sinatra"
  }
];

export default function QuoteOfDay() {
  const [mounted, setMounted] = useState(false);
  const [quote, setQuote] = useState<Quote>(QUOTES[0]);

  useEffect(() => {
    setMounted(true);

    // Get quote based on day of year (same quote for entire day)
    const today = new Date();
    const start = new Date(today.getFullYear(), 0, 0);
    const diff = today.getTime() - start.getTime();
    const oneDay = 1000 * 60 * 60 * 24;
    const dayOfYear = Math.floor(diff / oneDay);

    const index = dayOfYear % QUOTES.length;
    setQuote(QUOTES[index]);
  }, []);

  // Always render - use default quote until mounted with actual day's quote
  if (!mounted) {
    return (
      <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 rounded-lg p-4 border border-orange-200 dark:border-orange-800">
        <div className="flex gap-3">
          <Lightbulb className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm text-slate-700 dark:text-slate-300 italic">
              "{QUOTES[0].text}"
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
              — {QUOTES[0].author}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 rounded-lg p-4 border border-orange-200 dark:border-orange-800">
      <div className="flex gap-3">
        <Lightbulb className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="text-sm text-slate-700 dark:text-slate-300 italic">
            "{quote.text}"
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
            — {quote.author}
          </p>
        </div>
      </div>
    </div>
  );
}

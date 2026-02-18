//Components/Quoteofday.tsx

'use client';

import { useEffect, useState } from 'react';
import { Lightbulb } from 'lucide-react';

interface Quote { text: string; author: string; }

const QUOTES: Quote[] = [
  { text: "The best time to plant a tree was 20 years ago. The second best time is now.", author: "Chinese Proverb" },
  { text: "Success is not final, failure is not fatal: it is the courage to continue that counts.", author: "Winston Churchill" },
  { text: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
  { text: "Don't watch the clock; do what it does. Keep going.", author: "Sam Levenson" },
  { text: "The future belongs to those who believe in the beauty of their dreams.", author: "Eleanor Roosevelt" },
  { text: "It is during our darkest moments that we must focus to see the light.", author: "Aristotle" },
  { text: "The only impossible journey is the one you never begin.", author: "Tony Robbins" },
  { text: "Success is not how high you have climbed, but how you make a positive difference.", author: "Roy T. Bennett" },
  { text: "Believe you can and you're halfway there.", author: "Theodore Roosevelt" },
  { text: "The best revenge is massive success.", author: "Frank Sinatra" },
];

function getQuoteForToday(): Quote {
  const today = new Date();
  const start = new Date(today.getFullYear(), 0, 0);
  const dayOfYear = Math.floor((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  return QUOTES[dayOfYear % QUOTES.length];
}

export default function QuoteOfDay() {
  const [quote, setQuote] = useState<Quote>(QUOTES[0]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setQuote(getQuoteForToday()); setMounted(true); }, []);

  const displayQuote = mounted ? quote : QUOTES[0];

  return (
    <div className="rounded-xl p-5 border-2 border-amber-400" style={{ background: '#fef3c7' }}>
      <div className="flex gap-4">
        <div className="w-11 h-11 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: '#f59e0b' }}>
          <Lightbulb className="w-6 h-6 text-white" />
        </div>
        <div className="flex-1">
          <p className="text-lg font-black text-slate-900 italic leading-relaxed">
            &ldquo;{displayQuote.text}&rdquo;
          </p>
          <p className="text-base font-black text-orange-700 mt-3">
            &mdash; {displayQuote.author}
          </p>
        </div>
      </div>
    </div>
  );
}
'use client';

import { useEffect, useState } from 'react';

// ─── 7-Segment SVG Digit ──────────────────────────────────────────────────────
const SEGMENTS: Record<string, boolean[]> = {
  '0': [true,  true,  true,  true,  true,  true,  false],
  '1': [false, true,  true,  false, false, false, false],
  '2': [true,  true,  false, true,  true,  false, true],
  '3': [true,  true,  true,  true,  false, false, true],
  '4': [false, true,  true,  false, false, true,  true],
  '5': [true,  false, true,  true,  false, true,  true],
  '6': [true,  false, true,  true,  true,  true,  true],
  '7': [true,  true,  true,  false, false, false, false],
  '8': [true,  true,  true,  true,  true,  true,  true],
  '9': [true,  true,  true,  true,  false, true,  true],
};

function SegmentDigit({ char, size = 56 }: { char: string; size?: number }) {
  const segs = SEGMENTS[char] ?? Array(7).fill(false);
  const w = size * 0.58;
  const h = size;
  const t = size * 0.09;
  const g = size * 0.035;
  const on = '#ccffcc';
  const off = '#163016';

  return (
    <svg width={w + t} height={h + t} viewBox={`0 0 ${w + t} ${h + t}`} style={{ filter: segs.some(Boolean) ? 'drop-shadow(0 0 3px #e8f8ff66)' : 'none' }}>
      {/* Top */}
      <polygon points={`${t},${t/2} ${w},${t/2} ${w-t},${t+g} ${t*2},${t+g}`} fill={segs[0] ? on : off} />
      {/* Top-right */}
      <polygon points={`${w+t/2},${t} ${w+t/2},${h/2-g} ${w-g},${h/2-t} ${w-g},${t*2}`} fill={segs[1] ? on : off} />
      {/* Bot-right */}
      <polygon points={`${w+t/2},${h/2+g} ${w+t/2},${h} ${w-g},${h-t*2} ${w-g},${h/2+t}`} fill={segs[2] ? on : off} />
      {/* Bottom */}
      <polygon points={`${t*2},${h-g} ${w-t},${h-g} ${w},${h+t/2} ${t},${h+t/2}`} fill={segs[3] ? on : off} />
      {/* Bot-left */}
      <polygon points={`${t/2},${h/2+g} ${g+t},${h/2+t} ${g+t},${h-t*2} ${t/2},${h}`} fill={segs[4] ? on : off} />
      {/* Top-left */}
      <polygon points={`${t/2},${t} ${g+t},${t*2} ${g+t},${h/2-t} ${t/2},${h/2-g}`} fill={segs[5] ? on : off} />
      {/* Middle */}
      <polygon points={`${t*2},${h/2} ${w-t},${h/2} ${w-g},${h/2+t/2} ${w-t},${h/2+t} ${t*2},${h/2+t} ${t+g},${h/2+t/2}`} fill={segs[6] ? on : off} />
    </svg>
  );
}

function Colon({ blink }: { blink: boolean }) {
  const color = blink ? '#ccffcc' : '#163016';
  const glow = blink ? '0 0 8px #aaffaacc' : 'none';
  return (
    <div className="flex flex-col justify-center gap-3 px-0.5 pb-2" style={{ height: 60 }}>
      <div className="w-2 h-2 rounded-full transition-all duration-200" style={{ background: color, boxShadow: glow }} />
      <div className="w-2 h-2 rounded-full transition-all duration-200" style={{ background: color, boxShadow: glow }} />
    </div>
  );
}

// ─── Weather ──────────────────────────────────────────────────────────────────
interface Weather { temp: number; feelsLike: number; condition: string; icon: string; humidity: number; wind: number; }

function getCondition(code: number) {
  if (code === 0)  return { label: 'CLEAR SKY',     icon: '☀️' };
  if (code <= 2)   return { label: 'PARTLY CLOUDY', icon: '⛅' };
  if (code <= 3)   return { label: 'OVERCAST',      icon: '☁️' };
  if (code <= 49)  return { label: 'FOGGY',         icon: '🌫️' };
  if (code <= 59)  return { label: 'DRIZZLE',       icon: '🌦️' };
  if (code <= 69)  return { label: 'RAIN',          icon: '🌧️' };
  if (code <= 79)  return { label: 'SNOW',          icon: '❄️' };
  if (code <= 82)  return { label: 'SHOWERS',       icon: '🌧️' };
  return                  { label: 'THUNDERSTORM',  icon: '⛈️' };
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function DateTimeClock() {
  const [mounted, setMounted]   = useState(false);
  const [blink,   setBlink]     = useState(true);
  const [time,    setTime]      = useState({ h: '12', m: '00', s: '00', ampm: 'AM' });
  const [dateStr, setDateStr]   = useState({ weekday: 'MONDAY', month: 'JAN', day: '01' });
  const [weather, setWeather]   = useState<Weather | null>(null);
  const [wxLoad,  setWxLoad]    = useState(true);

  useEffect(() => {
    setMounted(true);
    function tick() {
      const n = new Date();
      let h = n.getHours();
      const ampm = h >= 12 ? 'PM' : 'AM';
      h = h % 12 || 12;
      setTime({ h: String(h).padStart(2,'0'), m: String(n.getMinutes()).padStart(2,'0'), s: String(n.getSeconds()).padStart(2,'0'), ampm });
      setDateStr({
        weekday: n.toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase(),
        month:   n.toLocaleDateString('en-US', { month: 'short' }).toUpperCase(),
        day:     String(n.getDate()).padStart(2,'0'),
      });
      setBlink(p => !p);
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    async function fetchWx() {
      try {
        const r = await fetch(
          'https://api.open-meteo.com/v1/forecast?latitude=37.5407&longitude=-77.4360&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code&temperature_unit=fahrenheit&wind_speed_unit=mph&timezone=America%2FNew_York'
        );
        const d = await r.json();
        const c = d.current;
        const { label, icon } = getCondition(c.weather_code);
        setWeather({ temp: Math.round(c.temperature_2m), feelsLike: Math.round(c.apparent_temperature), condition: label, icon, humidity: c.relative_humidity_2m, wind: Math.round(c.wind_speed_10m) });
      } catch { setWeather(null); }
      finally  { setWxLoad(false); }
    }
    fetchWx();
    const id = setInterval(fetchWx, 5 * 60 * 1000);
    return () => clearInterval(id);
  }, []);

  if (!mounted) return null;

  const lcdText = (text: string, color = '#4dff91', size = '10px', glow = true) => (
    <span style={{ color, fontSize: size, fontFamily: '"Courier New", monospace', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', textShadow: glow ? `0 0 8px ${color}99` : 'none' }}>
      {text}
    </span>
  );

  return (
    <div className="w-full rounded-2xl overflow-hidden" style={{
      background: 'linear-gradient(160deg, #0d2010 0%, #122818 50%, #0d2018 100%)',
      border: '3px solid #2a5a2a',
      boxShadow: '0 0 60px rgba(0,220,80,0.12), 0 12px 40px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.06)',
    }}>
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-2" style={{ borderBottom: '1px solid #0f200f' }}>
        {lcdText('⚡ atomic clock', '#4af', '9px')}
        {lcdText('richmond, va', '#4af', '9px')}
      </div>

      {/* Main time */}
      <div className="px-4 pt-3 pb-1">
        <div className="flex items-center gap-1">
          {/* AM / PM indicator */}
          <div className="flex flex-col gap-1 mr-2 self-center pb-3">
            {['AM','PM'].map(p => (
              <span key={p} style={{
                fontSize: 9, fontFamily: 'monospace', fontWeight: 800, letterSpacing: 2,
                color: time.ampm === p ? '#ccffcc' : '#163016',
                textShadow: time.ampm === p ? '0 0 10px #aaffaacc' : 'none',
              }}>{p}</span>
            ))}
          </div>

          {/* HH : MM */}
          <SegmentDigit char={time.h[0]} size={60} />
          <SegmentDigit char={time.h[1]} size={60} />
          <Colon blink={blink} />
          <SegmentDigit char={time.m[0]} size={60} />
          <SegmentDigit char={time.m[1]} size={60} />

          {/* Seconds smaller, right-aligned */}
          <div className="ml-2 flex flex-col items-center self-end pb-1">
            <div className="flex gap-0.5">
              <SegmentDigit char={time.s[0]} size={28} />
              <SegmentDigit char={time.s[1]} size={28} />
            </div>
            <span style={{ fontSize: 7, color: '#2a6a2a', fontFamily: 'monospace', letterSpacing: 2 }}>SEC</span>
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="mx-4 h-px my-1" style={{ background: 'linear-gradient(90deg, transparent, #2a6a2a 30%, #2a6a2a 70%, transparent)' }} />

      {/* Bottom row: date + weather */}
      <div className="flex items-center justify-between px-4 py-3 gap-2 flex-wrap">
        {/* Date section */}
        <div className="flex items-center gap-2">
          <div className="px-2 py-1 rounded" style={{ background: '#0a1f0a', border: '1px solid #2a5a2a' }}>
            {lcdText(`${dateStr.month} ${dateStr.day}`, '#4dff91', '11px')}
          </div>
          {lcdText(dateStr.weekday, '#4dff91', '12px')}
        </div>

        {/* Weather section */}
        <div className="flex items-center gap-2">
          {wxLoad ? (
            lcdText('loading wx…', '#f97316', '9px')
          ) : weather ? (
            <div className="flex items-center gap-2">
              <span style={{ fontSize: 20 }}>{weather.icon}</span>
              <div className="flex flex-col">
                {lcdText(`${weather.temp}°F`, '#f97316', '18px')}
                <div className="flex gap-2 mt-0.5">
                  {lcdText(`feels ${weather.feelsLike}°`, '#f9731699', '8px', false)}
                  {lcdText(`💧${weather.humidity}%`, '#4af99', '8px', false)}
                  {lcdText(`💨${weather.wind}mph`, '#4af99', '8px', false)}
                </div>
              </div>
              <div className="px-2 py-1 rounded" style={{ background: '#150800', border: '1px solid #2a1500' }}>
                {lcdText(weather.condition, '#f97316', '8px')}
              </div>
            </div>
          ) : (
            lcdText('wx unavailable', '#f97316', '9px')
          )}
        </div>
      </div>
    </div>
  );
}
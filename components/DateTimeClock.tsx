'use client';

import { useEffect, useState } from 'react';

// ─── 7-Segment display ────────────────────────────────────────────────────────
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

function SegmentDigit({ char, size = 60 }: { char: string; size?: number }) {
  const segs = SEGMENTS[char] ?? Array(7).fill(false);
  const w = size * 0.58, h = size, t = size * 0.09, g = size * 0.035;
  const on = '#ccffcc', off = '#163016';
  return (
    <svg width={w + t} height={h + t} viewBox={`0 0 ${w + t} ${h + t}`}>
      <polygon points={`${t},${t/2} ${w},${t/2} ${w-t},${t+g} ${t*2},${t+g}`}                           fill={segs[0]?on:off}/>
      <polygon points={`${w+t/2},${t} ${w+t/2},${h/2-g} ${w-g},${h/2-t} ${w-g},${t*2}`}               fill={segs[1]?on:off}/>
      <polygon points={`${w+t/2},${h/2+g} ${w+t/2},${h} ${w-g},${h-t*2} ${w-g},${h/2+t}`}             fill={segs[2]?on:off}/>
      <polygon points={`${t*2},${h-g} ${w-t},${h-g} ${w},${h+t/2} ${t},${h+t/2}`}                     fill={segs[3]?on:off}/>
      <polygon points={`${t/2},${h/2+g} ${g+t},${h/2+t} ${g+t},${h-t*2} ${t/2},${h}`}                fill={segs[4]?on:off}/>
      <polygon points={`${t/2},${t} ${g+t},${t*2} ${g+t},${h/2-t} ${t/2},${h/2-g}`}                  fill={segs[5]?on:off}/>
      <polygon points={`${t*2},${h/2} ${w-t},${h/2} ${w-g},${h/2+t/2} ${w-t},${h/2+t} ${t*2},${h/2+t} ${t+g},${h/2+t/2}`} fill={segs[6]?on:off}/>
    </svg>
  );
}

function Colon({ blink }: { blink: boolean }) {
  const color = blink ? '#ccffcc' : '#163016';
  const glow  = blink ? '0 0 8px #aaffaacc' : 'none';
  return (
    <div className="flex flex-col justify-center gap-3 px-0.5 pb-2" style={{ height: 64 }}>
      <div className="w-2 h-2 rounded-full transition-all duration-300" style={{ background: color, boxShadow: glow }}/>
      <div className="w-2 h-2 rounded-full transition-all duration-300" style={{ background: color, boxShadow: glow }}/>
    </div>
  );
}

// ─── Weather helpers ──────────────────────────────────────────────────────────
function getCondition(code: number, hour?: number) {
  const h   = hour ?? new Date().getHours();
  const tod = h < 6 ? 'Night' : h < 12 ? 'Morning' : h < 17 ? 'Afternoon' : h < 20 ? 'Evening' : 'Night';
  if (code === 0)  return { label:'CLEAR',    icon: h>=6&&h<20?'☀️':'🌙', description:`Clear ${tod}`,          detail:'Excellent visibility with no precipitation expected. Great conditions for outdoor activities all day.' };
  if (code <= 2)   return { label:'P.CLOUDY', icon:'⛅',                   description:`Partly Cloudy ${tod}`,  detail:'A pleasant mix of sun and clouds. Comfortable temperatures with filtered sunlight throughout the day.' };
  if (code <= 3)   return { label:'OVERCAST', icon:'☁️',                   description:`Overcast ${tod}`,       detail:'Heavy cloud cover blocking direct sunlight. Conditions remain dry but gray. No precipitation expected.' };
  if (code <= 49)  return { label:'FOGGY',    icon:'🌫️',                  description:`Foggy ${tod}`,          detail:'Reduced visibility due to dense fog. Drive with caution and use low-beam headlights.' };
  if (code <= 59)  return { label:'DRIZZLE',  icon:'🌦️',                  description:`Drizzle This ${tod}`,   detail:'Light intermittent drizzle. Carry an umbrella. Roads may be slick — allow extra stopping distance.' };
  if (code <= 69)  return { label:'RAIN',     icon:'🌧️',                  description:`Rainy ${tod}`,          detail:'Steady rainfall throughout the period. Bring rain gear. Watch for pooling on low-lying roads.' };
  if (code <= 79)  return { label:'SNOW',     icon:'❄️',                   description:`Snowy ${tod}`,          detail:'Snowfall expected with possible accumulation. Allow extra travel time. Roads may become slippery.' };
  if (code <= 82)  return { label:'SHOWERS',  icon:'🌧️',                  description:`Showers This ${tod}`,   detail:'Scattered showers with dry breaks in between. An umbrella is recommended just in case.' };
  return                  { label:'TSTORM',   icon:'⛈️',                   description:`Thunderstorms ${tod}`,  detail:'Active lightning risk. Avoid open areas and tall objects. Seek sturdy shelter immediately.' };
}

interface DayForecast {
  date: string; dayShort: string; high: number; low: number;
  icon: string; label: string; description: string; detail: string;
}
interface CurrentWeather {
  temp: number; feelsLike: number; icon: string;
  humidity: number; wind: number; description: string; detail: string;
}

// ─── LCD text helper ──────────────────────────────────────────────────────────
function LCD({ children, color = '#4dff91', size = 11, glow = true }: {
  children: React.ReactNode; color?: string; size?: number; glow?: boolean;
}) {
  return (
    <span style={{
      color, fontSize: size, fontFamily: '"Courier New", monospace',
      fontWeight: 900, letterSpacing: '0.1em',
      textShadow: glow ? `0 0 8px ${color}66` : 'none',
      lineHeight: 1.3,
    }}>
      {children}
    </span>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function DateTimeClock() {
  const [mounted,   setMounted]   = useState(false);
  const [blink,     setBlink]     = useState(true);
  const [time,      setTime]      = useState({ h:'12', m:'00', s:'00', ampm:'AM' });
  const [dateStr,   setDateStr]   = useState({ weekday:'MONDAY', month:'JAN', day:'01', year:'2025' });
  const [current,   setCurrent]   = useState<CurrentWeather | null>(null);
  const [forecast,  setForecast]  = useState<DayForecast[]>([]);
  const [wxLoad,    setWxLoad]    = useState(true);
  // Which day tile is selected — null = show today's current weather
  const [selected,  setSelected]  = useState<DayForecast | null>(null);

  useEffect(() => {
    setMounted(true);
    function tick() {
      const n = new Date();
      let h = n.getHours();
      const ampm = h >= 12 ? 'PM' : 'AM';
      h = h % 12 || 12;
      setTime({
        h: String(h).padStart(2,'0'), m: String(n.getMinutes()).padStart(2,'0'),
        s: String(n.getSeconds()).padStart(2,'0'), ampm,
      });
      setDateStr({
        weekday: n.toLocaleDateString('en-US',{weekday:'long'}).toUpperCase(),
        month:   n.toLocaleDateString('en-US',{month:'short'}).toUpperCase(),
        day:     String(n.getDate()).padStart(2,'0'),
        year:    String(n.getFullYear()),
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
          'https://api.open-meteo.com/v1/forecast' +
          '?latitude=37.5407&longitude=-77.4360' +
          '&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code' +
          '&daily=temperature_2m_max,temperature_2m_min,weather_code' +
          '&temperature_unit=fahrenheit&wind_speed_unit=mph&timezone=America%2FNew_York'
        );
        const d = await r.json();
        const c = d.current;
        const wx = getCondition(c.weather_code, new Date().getHours());
        setCurrent({
          temp: Math.round(c.temperature_2m), feelsLike: Math.round(c.apparent_temperature),
          icon: wx.icon, humidity: c.relative_humidity_2m,
          wind: Math.round(c.wind_speed_10m), description: wx.description, detail: wx.detail,
        });
        if (d.daily) {
          setForecast(d.daily.time.slice(0,7).map((ds: string, i: number) => {
            const dt  = new Date(ds + 'T12:00:00');
            const dw  = getCondition(d.daily.weather_code[i], 12);
            return {
              date: ds,
              dayShort: i===0 ? 'TODAY' : dt.toLocaleDateString('en-US',{weekday:'short'}).toUpperCase(),
              high: Math.round(d.daily.temperature_2m_max[i]),
              low:  Math.round(d.daily.temperature_2m_min[i]),
              icon: dw.icon, label: dw.label, description: dw.description, detail: dw.detail,
            };
          }));
        }
      } catch { setCurrent(null); }
      finally  { setWxLoad(false); }
    }
    fetchWx();
    const id = setInterval(fetchWx, 5*60*1000);
    return () => clearInterval(id);
  }, []);

  if (!mounted) return null;

  // What to show in the detail panel — selected forecast day OR today's live weather
  const panel = selected
    ? {
        icon:        selected.icon,
        title:       selected.dayShort === 'TODAY' ? 'TODAY' : `${selected.dayShort} · ${selected.date}`,
        tempLine:    `${selected.high}°F / ${selected.low}°F`,
        description: selected.description,
        detail:      selected.detail,
        extraRows:   null,
        isLive:      false,
      }
    : current
    ? {
        icon:        current.icon,
        title:       'NOW',
        tempLine:    `${current.temp}°F`,
        description: current.description,
        detail:      current.detail,
        extraRows:   { feelsLike: current.feelsLike, humidity: current.humidity, wind: current.wind },
        isLive:      true,
      }
    : null;

  return (
    <div className="w-full rounded-2xl overflow-hidden" style={{
      background: '#0a1e0a',
      border: '3px solid #2a5a2a',
      boxShadow: '0 0 40px rgba(0,180,60,0.15), 0 8px 32px rgba(0,0,0,0.6)',
    }}>

      {/* ── Top bar ── */}
      <div className="flex items-center justify-between px-4 py-2" style={{ background:'#061006', borderBottom:'2px solid #1a3a1a' }}>
        <LCD color="#44bbff" size={10}>⚡ ATOMIC CLOCK</LCD>
        <LCD color="#44bbff" size={10}>RICHMOND, VA · EST</LCD>
      </div>

      {/* ── Clock digits + live weather panel ── */}
      <div className="flex items-center gap-0 px-4 pt-4 pb-2">

        {/* Digits */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <div className="flex flex-col gap-1.5 mr-2 self-center">
            {['AM','PM'].map(p => (
              <span key={p} style={{
                fontSize:10, fontFamily:'monospace', fontWeight:900, letterSpacing:2,
                color: time.ampm===p ? '#ccffcc' : '#1a3a1a',
                textShadow: time.ampm===p ? '0 0 10px #aaffaacc' : 'none',
              }}>{p}</span>
            ))}
          </div>
          <SegmentDigit char={time.h[0]} size={62}/>
          <SegmentDigit char={time.h[1]} size={62}/>
          <Colon blink={blink}/>
          <SegmentDigit char={time.m[0]} size={62}/>
          <SegmentDigit char={time.m[1]} size={62}/>
          <div className="ml-3 flex flex-col items-center self-end pb-1">
            <div className="flex gap-0.5">
              <SegmentDigit char={time.s[0]} size={26}/>
              <SegmentDigit char={time.s[1]} size={26}/>
            </div>
            <span style={{ fontSize:7, color:'#2a5a2a', fontFamily:'monospace', fontWeight:900, letterSpacing:2 }}>SEC</span>
          </div>
        </div>

        {/* Divider */}
        <div style={{ width:2, alignSelf:'stretch', margin:'0 18px', background:'linear-gradient(to bottom,transparent,#3a7a3a 20%,#3a7a3a 80%,transparent)' }}/>

        {/* ── Weather / day detail panel ── */}
        <div className="flex-1 flex flex-col gap-2">
          {wxLoad ? (
            <LCD color="#f97316" size={13}>LOADING WEATHER…</LCD>
          ) : panel ? (
            <>
              {/* Icon + temperature */}
              <div className="flex items-center gap-3">
                <span style={{ fontSize:40 }}>{panel.icon}</span>
                <div>
                  <div style={{ color:'#ff8c22', fontSize:64, fontFamily:'"Courier New",monospace', fontWeight:900, lineHeight:1, textShadow:'0 0 24px #f9731688' }}>
                    {panel.tempLine}
                  </div>
                  {/* LIVE badge or day label */}
                  <div style={{ marginTop:4 }}>
                    {panel.isLive
                      ? <span style={{ background:'#14532d', border:'2px solid #22c55e', borderRadius:6, padding:'2px 8px', color:'#4ade80', fontSize:11, fontFamily:'"Courier New",monospace', fontWeight:900, letterSpacing:'0.1em' }}>● LIVE</span>
                      : <LCD color="#4dff91" size={12}>{panel.title}</LCD>
                    }
                  </div>
                </div>
              </div>

              {/* Description — solid dark box, bright text, always visible */}
              <div style={{ background:'#1a3800', border:'2px solid #4a8a00', borderRadius:8, padding:'6px 12px' }}>
                <div style={{ color:'#aaff44', fontSize:15, fontFamily:'"Courier New",monospace', fontWeight:900, letterSpacing:'0.07em' }}>
                  {panel.description}
                </div>
              </div>

              {/* Detail sentence */}
              <div style={{ color:'#6abf6a', fontSize:12, fontFamily:'"Courier New",monospace', fontWeight:700, lineHeight:1.5 }}>
                {panel.detail}
              </div>

              {/* Extra rows — only for live "now" view */}
              {panel.extraRows && (
                <div className="flex gap-4 flex-wrap">
                  <LCD color="#ffaa55" size={12}>Feels {panel.extraRows.feelsLike}°F</LCD>
                  <LCD color="#66ccff" size={12}>💧 {panel.extraRows.humidity}%</LCD>
                  <LCD color="#66ccff" size={12}>💨 {panel.extraRows.wind} mph</LCD>
                </div>
              )}

              {/* For forecast day: show high/low is already in tempLine, add back button */}
              {selected && (
                <button
                  onClick={() => setSelected(null)}
                  style={{ background:'#0a2010', border:'2px solid #2a5a2a', borderRadius:8, padding:'5px 14px', color:'#4dff91', fontSize:11, fontFamily:'"Courier New",monospace', fontWeight:900, letterSpacing:'0.1em', cursor:'pointer', alignSelf:'flex-start' }}
                >
                  ← BACK TO NOW
                </button>
              )}
            </>
          ) : (
            <LCD color="#f97316" size={13}>WEATHER UNAVAILABLE</LCD>
          )}
        </div>
      </div>

      {/* ── Date row ── */}
      <div className="mx-4 flex items-center gap-4 py-2" style={{ borderTop:'1px solid #1a3a1a', borderBottom:'1px solid #1a3a1a' }}>
        <div style={{ background:'#061006', border:'2px solid #2a5a2a', borderRadius:6, padding:'4px 10px' }}>
          <LCD color="#4dff91" size={14}>{dateStr.month} {dateStr.day} {dateStr.year}</LCD>
        </div>
        <LCD color="#4dff91" size={16}>{dateStr.weekday}</LCD>
        <div className="ml-auto" style={{ background:'#0a2010', border:'1px solid #1a3a1a', borderRadius:6, padding:'3px 8px' }}>
          <LCD color="#3a8a3a" size={9} glow={false}>TAP DAY BELOW FOR FORECAST ▼</LCD>
        </div>
      </div>

      {/* ── 7-day tiles — clicking updates the panel above inline ── */}
      <div className="grid grid-cols-7 gap-1 px-3 py-3">
        {forecast.map((d, i) => {
          const isActive = selected ? selected.date === d.date : i === 0;
          return (
            <button
              key={i}
              onClick={() => setSelected(d.dayShort === 'TODAY' && !selected ? null : d)}
              className="flex flex-col items-center gap-1 py-3 rounded-lg transition-all hover:scale-105"
              style={{
                background: isActive ? '#0f3a18' : '#0a2010',
                border: isActive ? '2px solid #4dff91' : '1px solid #1a4a1a',
                cursor: 'pointer',
              }}
            >
              <span style={{ color: isActive ? '#4dff91' : '#5aaa5a', fontSize:11, fontFamily:'"Courier New",monospace', fontWeight:900 }}>{d.dayShort}</span>
              <span style={{ fontSize:22 }}>{d.icon}</span>
              <span style={{ color:'#ff8c22', fontSize:15, fontFamily:'"Courier New",monospace', fontWeight:900 }}>{d.high}°</span>
              <span style={{ color:'#66ccff', fontSize:13, fontFamily:'"Courier New",monospace', fontWeight:900 }}>{d.low}°</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
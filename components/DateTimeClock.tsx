'use client';

import { useEffect, useState } from 'react';
import { MapPin, X } from 'lucide-react';

// ─── 7-Segment display ────────────────────────────────────────────────────────
const SEGMENTS: Record<string, boolean[]> = {
  '0': [true, true, true, true, true, true, false],
  '1': [false, true, true, false, false, false, false],
  '2': [true, true, false, true, true, false, true],
  '3': [true, true, true, true, false, false, true],
  '4': [false, true, true, false, false, true, true],
  '5': [true, false, true, true, false, true, true],
  '6': [true, false, true, true, true, true, true],
  '7': [true, true, true, false, false, false, false],
  '8': [true, true, true, true, true, true, true],
  '9': [true, true, true, true, false, true, true],
};

function SegmentDigit({ char, size = 60 }: { char: string; size?: number }) {
  const segs = SEGMENTS[char] ?? Array(7).fill(false);
  const w = size * 0.58, h = size, t = size * 0.09, g = size * 0.035;
  const on = '#ccffcc', off = '#163016';
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ display: 'inline-block' }}>
      <path d={`M${w*0.15},0 L${w*0.85},0 L${w*0.75},${t} L${w*0.25},${t}Z`} fill={segs[0]?on:off} />
      <path d={`M${w*0.85},${t} L${w},${t+g} L${w},${h/2-g} L${w*0.85},${h/2-t}Z`} fill={segs[1]?on:off} />
      <path d={`M${w*0.85},${h/2+t} L${w},${h/2+g} L${w},${h-t-g} L${w*0.85},${h-t}Z`} fill={segs[2]?on:off} />
      <path d={`M${w*0.15},${h} L${w*0.85},${h} L${w*0.75},${h-t} L${w*0.25},${h-t}Z`} fill={segs[3]?on:off} />
      <path d={`M0,${h/2+g} L${w*0.15},${h/2+t} L${w*0.15},${h-t} L0,${h-t-g}Z`} fill={segs[4]?on:off} />
      <path d={`M0,${t+g} L${w*0.15},${t} L${w*0.15},${h/2-t} L0,${h/2-g}Z`} fill={segs[5]?on:off} />
      <path d={`M${w*0.2},${h/2} L${w*0.8},${h/2} L${w*0.7},${h/2-t/2} L${w*0.3},${h/2-t/2}Z M${w*0.3},${h/2+t/2} L${w*0.7},${h/2+t/2} L${w*0.8},${h/2} L${w*0.2},${h/2}Z`} fill={segs[6]?on:off} />
    </svg>
  );
}

function Colon({ blink }: { blink: boolean }) {
  const color = blink ? '#ccffcc' : '#163016';
  const glow = blink ? '0 0 8px #aaffaacc' : 'none';
  return (
    <div style={{ display:'inline-flex', flexDirection:'column', gap:6, margin:'0 4px', alignItems:'center', justifyContent:'center' }}>
      <div style={{ width:8, height:8, borderRadius:'50%', background:color, boxShadow:glow }} />
      <div style={{ width:8, height:8, borderRadius:'50%', background:color, boxShadow:glow }} />
    </div>
  );
}

// ─── Weather helpers ──────────────────────────────────────────────────────────
function getCondition(code: number, hour?: number) {
  const h = hour ?? new Date().getHours();
  const tod = h < 6 ? 'Night' : h < 12 ? 'Morning' : h < 17 ? 'Afternoon' : h < 20 ? 'Evening' : 'Night';
  if (code === 0) return { label:'CLEAR', icon: h>=6&&h<20?'☀️':'🌙', description:`Clear ${tod}`, detail:'Excellent visibility with no precipitation expected. Great conditions for outdoor activities all day.' };
  if (code <= 2) return { label:'P.CLOUDY', icon:'⛅', description:`Partly Cloudy ${tod}`, detail:'A pleasant mix of sun and clouds. Comfortable temperatures with filtered sunlight throughout the day.' };
  if (code <= 3) return { label:'OVERCAST', icon:'☁️', description:`Overcast ${tod}`, detail:'Heavy cloud cover blocking direct sunlight. Conditions remain dry but gray. No precipitation expected.' };
  if (code <= 49) return { label:'FOGGY', icon:'🌫️', description:`Foggy ${tod}`, detail:'Reduced visibility due to dense fog. Drive with caution and use low-beam headlights.' };
  if (code <= 59) return { label:'DRIZZLE', icon:'🌦️', description:`Drizzle This ${tod}`, detail:'Light intermittent drizzle. Carry an umbrella. Roads may be slick — allow extra stopping distance.' };
  if (code <= 69) return { label:'RAIN', icon:'🌧️', description:`Rainy ${tod}`, detail:'Steady rainfall throughout the period. Bring rain gear. Watch for pooling on low-lying roads.' };
  if (code <= 79) return { label:'SNOW', icon:'❄️', description:`Snowy ${tod}`, detail:'Snowfall expected with possible accumulation. Allow extra travel time. Roads may become slippery.' };
  if (code <= 82) return { label:'SHOWERS', icon:'🌧️', description:`Showers This ${tod}`, detail:'Scattered showers with dry breaks in between. An umbrella is recommended just in case.' };
  return { label:'TSTORM', icon:'⛈️', description:`Thunderstorms ${tod}`, detail:'Active lightning risk. Avoid open areas and tall objects. Seek sturdy shelter immediately.' };
}

interface DayForecast {
  date: string; dayShort: string; high: number; low: number;
  icon: string; label: string; description: string; detail: string;
}

interface CurrentWeather {
  temp: number; feelsLike: number; icon: string;
  humidity: number; wind: number; description: string; detail: string;
}

interface LocationData {
  city: string;
  state: string;
  lat: number;
  lon: number;
  tz: string;
}

interface LocationResult {
  name: string;
  admin1: string;
  country: string;
  latitude: number;
  longitude: number;
  timezone: string;
  display: string;
}

// ─── LCD text helper ──────────────────────────────────────────────────────────
function LCD({ children, color = '#4dff91', size = 11, glow = true }: {
  children: React.ReactNode; color?: string; size?: number; glow?: boolean;
}) {
  return (
    <span style={{ color, fontSize:size, fontFamily:'"Courier New",monospace', fontWeight:900, letterSpacing:'0.08em', textShadow: glow ? `0 0 6px ${color}88` : 'none' }}>
      {children}
    </span>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function DateTimeClock() {
  const [mounted, setMounted] = useState(false);
  const [blink, setBlink] = useState(true);
  const [time, setTime] = useState({ h:'12', m:'00', s:'00', ampm:'AM' });
  const [dateStr, setDateStr] = useState({ weekday:'MONDAY', month:'JAN', day:'01', year:'2026' });
  const [current, setCurrent] = useState<CurrentWeather | null>(null);
  const [forecast, setForecast] = useState<DayForecast[]>([]);
  const [wxLoad, setWxLoad] = useState(true);
  const [selected, setSelected] = useState<DayForecast | null>(null);
  
  // Location management
  const [location, setLocation] = useState<LocationData>({
    city: 'Richmond',
    state: 'VA',
    lat: 37.5407,
    lon: -77.4360,
    tz: 'America/New_York'
  });
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [locationInput, setLocationInput] = useState('');
  const [locationError, setLocationError] = useState('');
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationResults, setLocationResults] = useState<LocationResult[]>([]);
  const [showResults, setShowResults] = useState(false);

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
        month: n.toLocaleDateString('en-US',{month:'short'}).toUpperCase(),
        day: String(n.getDate()).padStart(2,'0'),
        year: String(n.getFullYear()),
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
          `?latitude=${location.lat}&longitude=${location.lon}` +
          '&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code' +
          '&daily=temperature_2m_max,temperature_2m_min,weather_code' +
          `&temperature_unit=fahrenheit&wind_speed_unit=mph&timezone=${encodeURIComponent(location.tz)}`
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
            const dt = new Date(ds + 'T12:00:00');
            const dw = getCondition(d.daily.weather_code[i], 12);
            return {
              date: ds,
              dayShort: i===0 ? 'TODAY' : dt.toLocaleDateString('en-US',{weekday:'short'}).toUpperCase(),
              high: Math.round(d.daily.temperature_2m_max[i]),
              low: Math.round(d.daily.temperature_2m_min[i]),
              icon: dw.icon, label: dw.label, description: dw.description, detail: dw.detail,
            };
          }));
        }
      } catch { setCurrent(null); }
      finally { setWxLoad(false); }
    }
    fetchWx();
    const id = setInterval(fetchWx, 5*60*1000);
    return () => clearInterval(id);
  }, [location]);

  const handleLocationSearch = async () => {
    if (!locationInput.trim()) {
      setLocationError('Please enter a location');
      return;
    }
    
    setLocationLoading(true);
    setLocationError('');
    setShowResults(false);
    
    try {
      const geoRes = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(locationInput)}&count=10&language=en&format=json`
      );
      const geoData = await geoRes.json();
      
      if (!geoData.results || geoData.results.length === 0) {
        setLocationError('Location not found. Try: "New York", "23005", or "London, UK"');
        return;
      }
      
      const formatted = geoData.results.map((result: any) => ({
        name: result.name,
        admin1: result.admin1 || '',
        country: result.country,
        latitude: result.latitude,
        longitude: result.longitude,
        timezone: result.timezone,
        display: result.admin1 
          ? `${result.name}, ${result.admin1}, ${result.country}`
          : `${result.name}, ${result.country}`
      }));
      
      setLocationResults(formatted);
      
      if (formatted.length === 1) {
        selectLocation(formatted[0]);
      } else {
        setShowResults(true);
      }
      
    } catch (err) {
      setLocationError('Failed to fetch location. Please try again.');
    } finally {
      setLocationLoading(false);
    }
  };

  const selectLocation = (result: LocationResult) => {
    setLocation({
      city: result.name,
      state: result.admin1 || result.country,
      lat: result.latitude,
      lon: result.longitude,
      tz: result.timezone
    });
    
    setShowLocationModal(false);
    setLocationInput('');
    setLocationResults([]);
    setShowResults(false);
    setWxLoad(true);
  };

  if (!mounted) return null;

  const panel = selected
    ? {
        icon: selected.icon,
        title: selected.dayShort === 'TODAY' ? 'TODAY' : `${selected.dayShort} · ${selected.date}`,
        tempLine: `${selected.high}°F / ${selected.low}°F`,
        description: selected.description,
        detail: selected.detail,
        extraRows: null,
        isLive: false,
      }
    : current
    ? {
        icon: current.icon,
        title: 'NOW',
        tempLine: `${current.temp}°F`,
        description: current.description,
        detail: current.detail,
        extraRows: { feelsLike: current.feelsLike, humidity: current.humidity, wind: current.wind },
        isLive: true,
      }
    : null;

  return (
    <div style={{ background:'#0a1a0a', borderRadius:16, padding:16, border:'3px solid #1a3a1a', boxShadow:'0 0 32px rgba(0,255,100,0.15)', fontFamily:'system-ui,-apple-system,sans-serif', position:'relative' }}>
      {/* ── Top bar ── */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12, padding:'0 8px' }}>
        <LCD size={13}>⚡ ATOMIC CLOCK</LCD>
        <button
          onClick={() => setShowLocationModal(true)}
          className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          style={{ background:'transparent', border:'2px solid #2a5a2a', borderRadius:8, padding:'6px 12px', cursor:'pointer' }}
        >
          <MapPin className="w-4 h-4" style={{ color:'#4dff91' }} />
          <LCD size={18}>{location.city.toUpperCase()}, {location.state} · EST</LCD>
        </button>
      </div>

      {/* Location Modal */}
      {showLocationModal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.8)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000 }}>
          <div style={{ background:'#0a1a0a', border:'3px solid #2a5a2a', borderRadius:16, padding:24, maxWidth:500, width:'90%', maxHeight:'80vh', overflow:'auto' }}>
            <div className="flex justify-between items-center mb-4">
              <LCD size={16} color="#4dff91">UPDATE LOCATION</LCD>
              <button 
                onClick={() => {
                  setShowLocationModal(false);
                  setLocationResults([]);
                  setShowResults(false);
                  setLocationInput('');
                  setLocationError('');
                }} 
                style={{ background:'transparent', border:'none', cursor:'pointer', color:'#4dff91' }}
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div style={{ marginBottom: 12 }}>
              <input
                type="text"
                value={locationInput}
                onChange={e => setLocationInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleLocationSearch()}
                placeholder="City, State, ZIP or Postal Code"
                style={{ 
                  width:'100%', 
                  padding:12, 
                  borderRadius:8, 
                  border:'2px solid #2a5a2a', 
                  background:'#0f2a0f', 
                  color:'#4dff91', 
                  fontSize:16, 
                  fontFamily:'"Courier New",monospace', 
                  fontWeight:700 
                }}
              />
            </div>
            
            {locationError && (
              <div style={{ color:'#ff6b6b', fontSize:12, marginBottom:12, fontFamily:'"Courier New",monospace' }}>
                {locationError}
              </div>
            )}
            
            {/* Search Results Dropdown */}
            {showResults && locationResults.length > 0 && (
              <div style={{ 
                marginBottom: 16,
                background: '#0f2a0f',
                border: '2px solid #2a5a2a',
                borderRadius: 8,
                maxHeight: 300,
                overflowY: 'auto'
              }}>
                <div style={{ padding: 8, borderBottom: '1px solid #2a5a2a' }}>
                  <LCD size={11} color="#888">
                    FOUND {locationResults.length} LOCATION{locationResults.length > 1 ? 'S' : ''} - SELECT ONE:
                  </LCD>
                </div>
                {locationResults.map((result, idx) => (
                  <button
                    key={idx}
                    onClick={() => selectLocation(result)}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      padding: 12,
                      background: 'transparent',
                      border: 'none',
                      borderBottom: idx < locationResults.length - 1 ? '1px solid #1a4a1a' : 'none',
                      cursor: 'pointer',
                      transition: 'background 0.2s'
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = '#1a3a1a'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <div style={{ 
                      color: '#4dff91', 
                      fontFamily: '"Courier New",monospace', 
                      fontSize: 14,
                      fontWeight: 700,
                      marginBottom: 4
                    }}>
                      {result.display}
                    </div>
                    <div style={{ 
                      color: '#888', 
                      fontFamily: '"Courier New",monospace', 
                      fontSize: 11 
                    }}>
                      {result.timezone} • Lat: {result.latitude.toFixed(2)}, Lon: {result.longitude.toFixed(2)}
                    </div>
                  </button>
                ))}
              </div>
            )}
            
            <div className="flex gap-3">
              <button
                onClick={handleLocationSearch}
                disabled={locationLoading}
                style={{ 
                  flex:1, 
                  background:'linear-gradient(to right, #2a5a2a, #1a4a1a)', 
                  color:'#4dff91', 
                  padding:12, 
                  borderRadius:8, 
                  border:'2px solid #4dff91', 
                  cursor:'pointer', 
                  fontFamily:'"Courier New",monospace', 
                  fontWeight:900, 
                  fontSize:14, 
                  opacity:locationLoading?0.6:1 
                }}
              >
                {locationLoading ? 'SEARCHING...' : 'SEARCH'}
              </button>
              <button
                onClick={() => {
                  setShowLocationModal(false);
                  setLocationResults([]);
                  setShowResults(false);
                  setLocationInput('');
                  setLocationError('');
                }}
                style={{ 
                  flex:1, 
                  background:'#1a1a1a', 
                  color:'#666', 
                  padding:12, 
                  borderRadius:8, 
                  border:'2px solid #333', 
                  cursor:'pointer', 
                  fontFamily:'"Courier New",monospace', 
                  fontWeight:900, 
                  fontSize:14 
                }}
              >
                CANCEL
              </button>
            </div>
            
            <div style={{ marginTop: 16, padding: 12, background: '#0f2a0f', borderRadius: 8, border: '1px solid #2a5a2a' }}>
              <LCD size={10} color="#888">
                💡 TIP: Try "Ashland, VA" or "23005 USA" for US ZIP codes
              </LCD>
            </div>
          </div>
        </div>
      )}

      {/* ── Clock digits + live weather panel ── */}
      <div style={{ display:'grid', gridTemplateColumns:'auto 2px auto', gap:24, marginBottom:12 }}>
        {/* Digits */}
        <div style={{ display:'flex', alignItems:'center', gap:4 }}>
          <div style={{ display:'flex', gap:2 }}>
            {time.h.split('').map((d,i)=><SegmentDigit key={i} char={d} size={70} />)}
            <Colon blink={blink} />
            {time.m.split('').map((d,i)=><SegmentDigit key={i} char={d} size={70} />)}
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:3, marginLeft:8 }}>
            {(['AM','PM'] as const).map(p => (
              <div key={p} style={{ padding:'2px 6px', borderRadius:4, background:time.ampm===p?'#2a5a2a':'#0f2a0f', border:`1px solid ${time.ampm===p?'#4dff91':'#1a4a1a'}` }}>
                <LCD size={10} color={time.ampm===p?'#ccffcc':'#2a5a2a'}>{p}</LCD>
              </div>
            ))}
          </div>
          <div style={{ marginLeft:6, padding:'2px 6px', borderRadius:4, background:'#0f2a0f', border:'1px solid #1a4a1a' }}>
            <LCD size={10} color="#4dff91">SEC</LCD>
            <div style={{ fontSize:18, color:'#4dff91', fontFamily:'"Courier New",monospace', fontWeight:900, lineHeight:1, marginTop:2 }}>{time.s}</div>
          </div>
        </div>

        {/* Divider */}
        <div style={{ width:2, background:'linear-gradient(to bottom, #1a4a1a, #2a5a2a, #1a4a1a)' }} />

        {/* ── Weather / day detail panel ── */}
        <div style={{ display:'flex', flexDirection:'column', gap:8, padding:12, background:'#0f2a0f', borderRadius:12, border:'2px solid #1a4a1a', minWidth:280 }}>
          {wxLoad ? (
            <LCD size={13} color="#666">LOADING WEATHER…</LCD>
          ) : panel ? (
            <>
              {/* Icon + temperature */}
              <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                <span style={{ fontSize:48, lineHeight:1 }}>{panel.icon}</span>
                <div style={{ fontSize:48, color:'#ffaa00', fontFamily:'"Courier New",monospace', fontWeight:900, lineHeight:1 }}>{panel.tempLine}</div>
              </div>

              {/* LIVE badge or day label */}
              {panel.isLive
                ? <div style={{ display:'inline-flex', alignItems:'center', gap:6, alignSelf:'flex-start', background:'#2a1a1a', border:'2px solid #aa2222', borderRadius:8, padding:'4px 10px' }}>
                    <span style={{ width:8, height:8, borderRadius:'50%', background:'#ff3333', boxShadow:'0 0 8px #ff333388' }} />
                    <LCD size={11} color="#ff6666">● LIVE</LCD>
                  </div>
                : <div style={{ display:'inline-block', background:'#1a3a2a', border:'2px solid #2a5a2a', borderRadius:8, padding:'4px 10px', alignSelf:'flex-start' }}>
                    <LCD size={11}>{panel.title}</LCD>
                  </div>
              }

              {/* Description */}
              <div style={{ background:'#0a1a0a', border:'2px solid #2a5a2a', borderRadius:8, padding:10 }}>
                <LCD size={14} color="#ccffcc">{panel.description}</LCD>
              </div>

              {/* Detail sentence */}
              <div style={{ fontSize:12, color:'#4dff91', fontFamily:'"Courier New",monospace', lineHeight:1.5 }}>
                {panel.detail}
              </div>

              {/* Extra rows */}
              {panel.extraRows && (
                <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8, marginTop:4 }}>
                  <div style={{ background:'#0a1a0a', border:'1px solid #2a5a2a', borderRadius:6, padding:8, textAlign:'center' }}>
                    <LCD size={9} color="#888">Feels {panel.extraRows.feelsLike}°F</LCD>
                  </div>
                  <div style={{ background:'#0a1a0a', border:'1px solid #2a5a2a', borderRadius:6, padding:8, textAlign:'center' }}>
                    <LCD size={9} color="#888">💧 {panel.extraRows.humidity}%</LCD>
                  </div>
                  <div style={{ background:'#0a1a0a', border:'1px solid #2a5a2a', borderRadius:6, padding:8, textAlign:'center' }}>
                    <LCD size={9} color="#888">💨 {panel.extraRows.wind} mph</LCD>
                  </div>
                </div>
              )}

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
            <LCD size={13} color="#aa2222">WEATHER UNAVAILABLE</LCD>
          )}
        </div>
      </div>

      {/* ── Date row ── */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12, padding:'0 8px' }}>
        <LCD size={16}>{dateStr.month} {dateStr.day} {dateStr.year}</LCD>
        <LCD size={13} color="#888">{dateStr.weekday}</LCD>
      </div>

      <div style={{ textAlign:'center', marginBottom:8 }}>
        <LCD size={10} color="#666">TAP DAY BELOW FOR FORECAST ▼</LCD>
      </div>

      {/* ── 7-day tiles ── */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:8 }}>
        {forecast.map((d, i) => {
          const isActive = selected ? selected.date === d.date : i === 0;
          return (
            <button
              key={d.date}
              onClick={() => setSelected(d.dayShort === 'TODAY' && !selected ? null : d)}
              className="flex flex-col items-center gap-1 py-3 rounded-lg transition-all hover:scale-105"
              style={{
                background: isActive ? '#0f3a18' : '#0a2010',
                border: isActive ? '2px solid #4dff91' : '1px solid #1a4a1a',
                cursor: 'pointer',
              }}
            >
              <LCD size={9} color={isActive?'#ccffcc':'#4dff91'}>{d.dayShort}</LCD>
              <span style={{ fontSize:28 }}>{d.icon}</span>
              <LCD size={11} color="#ffaa00">{d.high}°</LCD>
              <LCD size={9} color="#666">{d.low}°</LCD>
            </button>
          );
        })}
      </div>
    </div>
  );
}

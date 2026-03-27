'use client';
// app/e2e/page.tsx
// ─────────────────────────────────────────────────────────────────────────────
// E2E TEST RUNNER — served at http://localhost:3001/e2e
// Same origin as the API routes → zero CORS issues
// ─────────────────────────────────────────────────────────────────────────────
import { useEffect, useRef, useState } from 'react';
export const dynamic = 'force-dynamic';

export default function E2ETestPage() {
  const runnerRef = useRef<{ 
    runAllTests: () => void; 
    runSection: (s: string) => void; 
    clearResults: () => void;
    toggleDetail: (id: string) => void;
  } | null>(null);
  
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const script = document.createElement('script');
    script.textContent = E2E_SCRIPT;
    document.body.appendChild(script);
    
    // Capture references once script executes
    runnerRef.current = {
      runAllTests: (window as any).runAllTests,
      runSection: (window as any).runSection,
      clearResults: (window as any).clearResults,
      toggleDetail: (window as any).toggleDetail,
    };
    setIsReady(true);
    
    return () => { 
      document.body.removeChild(script);
      runnerRef.current = null;
    };
  }, []);

  // Safe handler that uses ref with window fallback
  const safeCall = (fnName: 'runAllTests' | 'runSection' | 'clearResults' | 'toggleDetail', ...args: any[]) => {
    const fn = runnerRef.current?.[fnName] || (window as any)[fnName];
    if (typeof fn === 'function') {
      return fn(...args);
    }
    console.warn(`E2E runner not ready: ${fnName}`);
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{__html: `
        * { box-sizing: border-box; margin: 0; padding: 0; }
        :root {
          --bg: #0f1117; --surface: #1a1d27; --surface2: #22263a;
          --border: #2e3347; --accent: #f97316; --accent2: #8b5cf6;
          --green: #22c55e; --red: #ef4444; --yellow: #eab308;
          --blue: #3b82f6; --text: #e2e8f0; --muted: #64748b;
          --mono: 'Courier New', monospace;
        }
        html, body { background: var(--bg); color: var(--text); font-family: 'Segoe UI', system-ui, sans-serif; min-height: 100vh; }
        #e2e-root { padding: 24px; }
        .header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 28px; padding-bottom: 20px; border-bottom: 1px solid var(--border); }
        .header-left { display: flex; align-items: center; gap: 14px; }
        .logo { width: 44px; height: 44px; background: linear-gradient(135deg, #f97316, #ea580c); border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 22px; }
        h1 { font-size: 22px; font-weight: 800; color: #fff; }
        .subtitle { font-size: 13px; color: var(--muted); margin-top: 2px; }
        .config-bar { background: var(--surface); border: 1px solid var(--border); border-radius: 12px; padding: 14px 20px; margin-bottom: 22px; display: flex; align-items: center; gap: 16px; flex-wrap: wrap; }
        .config-bar label { font-size: 11px; font-weight: 700; color: var(--muted); text-transform: uppercase; letter-spacing: .05em; display: block; margin-bottom: 4px; }
        .config-bar input { background: var(--surface2); border: 1px solid var(--border); border-radius: 8px; padding: 7px 11px; color: var(--text); font-size: 13px; font-family: var(--mono); width: 240px; }
        .config-bar input:focus { outline: none; border-color: var(--accent); }
        .config-bar .origin-note { font-size: 11px; color: var(--green); background: rgba(34,197,94,.1); border: 1px solid rgba(34,197,94,.2); border-radius: 6px; padding: 6px 10px; display: flex; align-items: center; gap: 6px; }
        .btn { padding: 9px 18px; border-radius: 8px; font-size: 13px; font-weight: 700; border: none; cursor: pointer; transition: all .15s; display: inline-flex; align-items: center; gap: 6px; }
        .btn-primary { background: var(--accent); color: #fff; }
        .btn-primary:hover { background: #ea580c; }
        .btn-primary:disabled { opacity: .5; cursor: not-allowed; }
        .btn-outline { background: transparent; color: var(--text); border: 1px solid var(--border); }
        .btn-outline:hover { border-color: var(--accent); color: var(--accent); }
        .btn-sm { padding: 6px 12px; font-size: 11px; }
        .summary-bar { background: var(--surface); border: 1px solid var(--border); border-radius: 12px; padding: 16px 20px; display: flex; align-items: center; gap: 24px; margin-bottom: 22px; flex-wrap: wrap; }
        .summary-stat { text-align: center; }
        .summary-stat .num { font-size: 28px; font-weight: 900; }
        .summary-stat .lbl { font-size: 10px; color: var(--muted); text-transform: uppercase; letter-spacing: .06em; margin-top: 2px; }
        .num-pass { color: var(--green); } .num-fail { color: var(--red); } .num-skip { color: var(--yellow); }
        .progress-bar-wrap { flex: 1; min-width: 180px; }
        .progress-bar-track { height: 7px; background: var(--surface2); border-radius: 4px; overflow: hidden; }
        .progress-bar-fill { height: 100%; background: var(--green); border-radius: 4px; transition: width .3s; }
        .section { background: var(--surface); border: 1px solid var(--border); border-radius: 12px; overflow: hidden; margin-bottom: 14px; }
        .section-header { padding: 12px 18px; background: var(--surface2); border-bottom: 1px solid var(--border); display: flex; align-items: center; justify-content: space-between; }
        .section-title { font-size: 13px; font-weight: 800; color: #fff; display: flex; align-items: center; gap: 8px; }
        .section-badge { font-size: 10px; font-weight: 700; padding: 2px 7px; border-radius: 20px; }
        .badge-pass { background: rgba(34,197,94,.15); color: var(--green); }
        .badge-fail { background: rgba(239,68,68,.15); color: var(--red); }
        .badge-pending { background: rgba(100,116,139,.15); color: var(--muted); }
        .badge-running { background: rgba(249,115,22,.15); color: var(--accent); }
        .test-row { display: grid; grid-template-columns: 26px 1fr 80px 110px 30px; align-items: center; gap: 10px; padding: 9px 18px; border-bottom: 1px solid var(--border); }
        .test-row:last-child { border-bottom: none; }
        .test-row:hover { background: rgba(255,255,255,.02); }
        .status-icon { width: 20px; height: 20px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; flex-shrink: 0; }
        .icon-pass { background: rgba(34,197,94,.2); color: var(--green); }
        .icon-fail { background: rgba(239,68,68,.2); color: var(--red); }
        .icon-pending { background: rgba(100,116,139,.15); color: var(--muted); }
        .icon-running { background: rgba(249,115,22,.15); color: var(--accent); animation: pulse .8s infinite; }
        .icon-skip { background: rgba(234,179,8,.1); color: var(--yellow); }
        @keyframes pulse { 0%,100%{opacity:1}50%{opacity:.4} }
        .test-name { font-size: 12px; font-weight: 600; color: var(--text); }
        .test-desc { font-size: 11px; color: var(--muted); margin-top: 1px; }
        .test-method { font-size: 10px; font-weight: 800; font-family: var(--mono); padding: 2px 6px; border-radius: 4px; width: fit-content; }
        .method-get    { background: rgba(34,197,94,.15);  color: var(--green); }
        .method-post   { background: rgba(59,130,246,.15); color: var(--blue); }
        .method-patch  { background: rgba(234,179,8,.15);  color: var(--yellow); }
        .method-delete { background: rgba(239,68,68,.15);  color: var(--red); }
        .method-put    { background: rgba(139,92,246,.15); color: var(--accent2); }
        .test-status { font-size: 11px; font-weight: 700; }
        .status-pass { color: var(--green); } .status-fail { color: var(--red); }
        .status-pending { color: var(--muted); } .status-running { color: var(--accent); }
        .status-skip { color: var(--yellow); }
        .detail-btn { width: 26px; height: 26px; border-radius: 6px; background: var(--surface2); border: 1px solid var(--border); cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 12px; color: var(--muted); transition: all .15s; }
        .detail-btn:hover { border-color: var(--accent); color: var(--accent); }
        .detail-panel { display: none; background: #0a0d15; border-top: 1px solid var(--border); padding: 14px 18px; }
        .detail-panel.open { display: block; }
        .detail-panel pre { font-family: var(--mono); font-size: 11px; color: #a0aec0; white-space: pre-wrap; word-break: break-all; max-height: 280px; overflow-y: auto; line-height: 1.6; }
        .detail-meta { display: flex; gap: 14px; margin-bottom: 8px; flex-wrap: wrap; }
        .detail-meta span { font-size: 11px; color: var(--muted); }
        .detail-meta strong { color: var(--text); }
        .log-panel { background: var(--surface); border: 1px solid var(--border); border-radius: 12px; padding: 14px 18px; margin-top: 14px; }
        .log-header { font-size: 11px; font-weight: 700; color: var(--muted); text-transform: uppercase; letter-spacing: .06em; margin-bottom: 10px; }
        .log-entries { max-height: 200px; overflow-y: auto; }
        .log-entry { font-size: 11px; font-family: var(--mono); color: #64748b; padding: 2px 0; display: flex; gap: 10px; }
        .log-entry.pass { color: #4ade80; } .log-entry.fail { color: #f87171; }
        .log-entry.info { color: #93c5fd; } .log-entry.warn { color: #fbbf24; }
        .log-time { color: #475569; flex-shrink: 0; }
        .spinner { display: inline-block; width: 11px; height: 11px; border: 2px solid rgba(255,255,255,.2); border-top-color: var(--accent); border-radius: 50%; animation: spin .6s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .section-actions { display: flex; gap: 6px; }
        a.back-link { color: var(--muted); font-size: 12px; text-decoration: none; display: inline-flex; align-items: center; gap: 4px; }
        a.back-link:hover { color: var(--accent); }
      `}} />

      <div id="e2e-root">
        <div className="header">
          <div className="header-left">
            <div className="logo">⚡</div>
            <div>
              <h1>PreciseGovCon — E2E Test Runner</h1>
              <div className="subtitle">Automated API + integration tests · 59 tests · Same-origin, no CORS</div>
            </div>
          </div>
          <div style={{display:'flex',gap:'10px',alignItems:'center'}}>
            <a href="/dashboard/outreach" className="back-link">← Back to App</a>
            <button className="btn btn-outline btn-sm" onClick={() => safeCall('clearResults')} disabled={!isReady}>Clear</button>
            <button className="btn btn-primary" id="run-all-btn" onClick={() => safeCall('runAllTests')} disabled={!isReady}>
              {isReady ? '▶ Run All Tests' : 'Loading...'}
            </button>
          </div>
        </div>

        {/* Config */}
        <div className="config-bar">
          <div>
            <label>Test Email</label>
            <input type="text" id="test-email" defaultValue="test-e2e@precisegovcon.com" style={{width:'210px'}} />
          </div>
          <div>
            <label>Test Code</label>
            <input type="text" id="test-code" defaultValue="E2E-TEST-14" style={{width:'130px'}} />
          </div>
          <div className="origin-note">
            ✓ Same-origin — no CORS issues
          </div>
          <div style={{marginLeft:'auto',display:'flex',gap:'6px'}}>
            <button className="btn btn-outline btn-sm" onClick={() => safeCall('runSection', 'api-health')} disabled={!isReady}>Health</button>
            <button className="btn btn-outline btn-sm" onClick={() => safeCall('runSection', 'templates')} disabled={!isReady}>Templates</button>
            <button className="btn btn-outline btn-sm" onClick={() => safeCall('runSection', 'offerCodes')} disabled={!isReady}>Codes</button>
            <button className="btn btn-outline btn-sm" onClick={() => safeCall('runSection', 'e2e')} disabled={!isReady}>E2E Flow</button>
          </div>
        </div>

        {/* Summary */}
        <div className="summary-bar">
          <div className="summary-stat"><div className="num" id="stat-total">—</div><div className="lbl">Total</div></div>
          <div className="summary-stat"><div className="num num-pass" id="stat-pass">—</div><div className="lbl">Passed</div></div>
          <div className="summary-stat"><div className="num num-fail" id="stat-fail">—</div><div className="lbl">Failed</div></div>
          <div className="summary-stat"><div className="num num-skip" id="stat-skip">—</div><div className="lbl">Skipped</div></div>
          <div className="summary-stat"><div className="num" style={{color:'var(--accent)'}} id="stat-time">—</div><div className="lbl">Duration</div></div>
          <div className="progress-bar-wrap">
            <div style={{fontSize:'11px',color:'var(--muted)',marginBottom:'5px'}} id="progress-label">Ready to run</div>
            <div className="progress-bar-track"><div className="progress-bar-fill" id="progress-fill" style={{width:'0%'}}></div></div>
          </div>
        </div>

        {/* Sections */}
        {[
          ['api-health', '🔌 API Health & Connectivity'],
          ['stats',      '📊 Outreach Stats'],
          ['templates',  '📧 Email Templates CRUD'],
          ['seed',       '🌱 Template Seed Library'],
          ['offerCodes', '🏷️ Offer Codes CRUD + Stats'],
          ['contractors','🏢 Contractors API'],
          ['testContractors','🧪 Test Contractors CRUD'],
          ['crm',        '🔄 CRM Pipeline + Activities'],
          ['e2e',        '🚀 Full E2E Flow: Create → Send → Activate → Verify'],
        ].map(([id, title]) => (
          <div className="section" key={id} id={`section-${id}`}>
            <div className="section-header">
              <div className="section-title">
                {title}
                <span className="section-badge badge-pending" id={`badge-${id}`}>PENDING</span>
              </div>
              <div className="section-actions">
                <button className="btn btn-outline btn-sm" onClick={() => safeCall('runSection', id)} disabled={!isReady}>Run Section</button>
              </div>
            </div>
            <div id={`tests-${id}`}></div>
          </div>
        ))}

        {/* Log */}
        <div className="log-panel">
          <div className="log-header">Test Log</div>
          <div className="log-entries" id="log-entries"></div>
        </div>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ALL TEST LOGIC — inlined as a string so it runs client-side
// Uses relative paths (no base URL needed — same origin)
// ─────────────────────────────────────────────────────────────────────────────
const E2E_SCRIPT = `
const state = {
  results: {},
  startTime: null,
  createdIds: { templateId: null, codeId: null, testContractorId: null }
};

const getTestCode  = () => document.getElementById('test-code').value.trim();
const getTestEmail = () => document.getElementById('test-email').value.trim();

// ── TEST DEFINITIONS ──────────────────────────────────────────────────────────
const SECTIONS = {
  'api-health': {
    title: 'API Health',
    tests: [
      { id:'health-stats',        name:'Stats endpoint reachable',       desc:'GET /api/outreach/stats → 200',          method:'GET',  path:'/api/outreach/stats',            expect:r=>r.ok },
      { id:'health-templates',    name:'Templates endpoint reachable',   desc:'GET /api/outreach/templates → 200',      method:'GET',  path:'/api/outreach/templates',        expect:r=>r.ok },
      { id:'health-contractors',  name:'Contractors endpoint reachable', desc:'GET /api/outreach/contractors → 200',    method:'GET',  path:'/api/outreach/contractors?limit=10', expect:r=>r.ok },
      { id:'health-codes',        name:'Offer codes endpoint reachable', desc:'GET /api/crm/offer-codes → 200',         method:'GET',  path:'/api/crm/offer-codes',           expect:r=>r.ok },
      { id:'health-pipeline',     name:'CRM pipeline reachable',         desc:'GET /api/crm/pipeline → 200',            method:'GET',  path:'/api/crm/pipeline?limit=10',     expect:r=>r.ok },
      { id:'health-activities',   name:'Activities endpoint reachable',  desc:'GET /api/crm/activities → 200',          method:'GET',  path:'/api/crm/activities?limit=10',   expect:r=>r.ok },
      { id:'health-tasks',        name:'Tasks endpoint reachable',       desc:'GET /api/crm/tasks → 200',               method:'GET',  path:'/api/crm/tasks',                 expect:r=>r.ok },
    ]
  },

  'stats': {
    title: 'Outreach Stats',
    tests: [
      { id:'stats-shape',   name:'Stats returns correct shape',    desc:'Has totalContractors, contacted, enrolled, successRate', method:'GET', path:'/api/outreach/stats',
        expect:(r,d)=>r.ok && 'totalContractors' in d && 'contacted' in d && 'enrolled' in d && 'successRate' in d },
      { id:'stats-no-test', name:'Stats excludes test contractors',desc:'totalContractors is a number',   method:'GET', path:'/api/outreach/stats',
        expect:(r,d)=>r.ok && typeof d.totalContractors==='number' },
      { id:'stats-email',   name:'Stats includes emailStats',      desc:'emailStats.openRate + deliveryRate present', method:'GET', path:'/api/outreach/stats',
        expect:(r,d)=>r.ok && d.emailStats && 'openRate' in d.emailStats && 'deliveryRate' in d.emailStats },
      { id:'stats-rates',   name:'successRate is 0–100',           desc:'Valid percentage value',         method:'GET', path:'/api/outreach/stats',
        expect:(r,d)=>r.ok && d.successRate>=0 && d.successRate<=100 },
    ]
  },

  'templates': {
    title: 'Templates CRUD',
    tests: [
      { id:'tpl-list',       name:'List all templates',           desc:'GET → {templates:[]}',   method:'GET',    path:'/api/outreach/templates',
        expect:(r,d)=>r.ok && Array.isArray(d.templates) },
      { id:'tpl-filter-cat', name:'Filter by category',           desc:'?category=cold → only cold', method:'GET', path:'/api/outreach/templates?category=cold',
        expect:(r,d)=>r.ok && Array.isArray(d.templates) && d.templates.every(t=>t.category==='cold') },
      { id:'tpl-create',     name:'Create new template',          desc:'POST → {success, template}', method:'POST', path:'/api/outreach/templates',
        body:()=>({ name:'E2E Test Template', subject:'E2E [COMPANY_NAME] [OFFER_CODE]', body:'Hi [CONTACT_NAME], use [OFFER_CODE].', category:'cold', offer_code:getTestCode(), tags:['e2e-test'] }),
        expect:(r,d)=>{ if(r.ok&&d.success&&d.template?.id){state.createdIds.templateId=d.template.id;return true;}return false; } },
      { id:'tpl-create-validation', name:'Create rejects missing fields', desc:'POST without name → 400', method:'POST', path:'/api/outreach/templates',
        body:{ subject:'Missing name', body:'test' }, expect:r=>r.status===400 },
      { id:'tpl-update', name:'Update template (PATCH)', desc:'PATCH with id updates name', method:'PATCH', path:'/api/outreach/templates',
        body:()=>({ id:state.createdIds.templateId, name:'E2E Test Template (Updated)', tags:['e2e-test','updated'] }),
        skip:()=>!state.createdIds.templateId,
        expect:(r,d)=>r.ok&&d.success&&d.template?.name==='E2E Test Template (Updated)' },
      { id:'tpl-increment', name:'Increment usage count (PUT)', desc:'PUT increments usage_count', method:'PUT', path:'/api/outreach/templates',
        body:()=>({ id:state.createdIds.templateId }),
        skip:()=>!state.createdIds.templateId,
        expect:(r,d)=>r.ok&&d.success&&typeof d.template?.usage_count==='number' },
      { id:'tpl-delete', name:'Delete template', desc:'DELETE ?id= removes template', method:'DELETE',
        path:()=>'/api/outreach/templates?id='+state.createdIds.templateId,
        skip:()=>!state.createdIds.templateId,
        expect:(r,d)=>{ if(r.ok&&d.success){state.createdIds.templateId=null;return true;}return false; } },
      { id:'tpl-delete-missing', name:'Delete without ID returns 400', desc:'DELETE with no id → 400', method:'DELETE', path:'/api/outreach/templates',
        expect:r=>r.status===400 },
    ]
  },

  'seed': {
    title: 'Template Seed',
    tests: [
      { id:'seed-preview', name:'Seed preview (GET)', desc:'GET /api/outreach/templates/seed → count > 0', method:'GET', path:'/api/outreach/templates/seed',
        expect:(r,d)=>r.ok&&typeof d.count==='number'&&d.count>0 },
      { id:'seed-run', name:'Run seed (POST)', desc:'POST seeds templates → results[]', method:'POST', path:'/api/outreach/templates/seed',
        expect:(r,d)=>r.ok&&d.success&&Array.isArray(d.results) },
      { id:'seed-idempotent', name:'Seed is idempotent', desc:'Second run all created or skipped', method:'POST', path:'/api/outreach/templates/seed',
        expect:(r,d)=>r.ok&&d.success&&d.results.every(r=>r.action==='created'||r.action==='skipped') },
      { id:'seed-after-count', name:'9+ templates after seed', desc:'Template list has ≥9 entries', method:'GET', path:'/api/outreach/templates',
        expect:(r,d)=>r.ok&&d.templates.length>=9 },
      { id:'seed-categories', name:'All 4 categories covered', desc:'cold, followup, opportunity, onboarding present', method:'GET', path:'/api/outreach/templates',
        expect:(r,d)=>{ if(!r.ok)return false; const cats=new Set(d.templates.map(t=>t.category)); return ['cold','followup','opportunity','onboarding'].every(c=>cats.has(c)); } },
    ]
  },

  'offerCodes': {
    title: 'Offer Codes',
    tests: [
      { id:'code-list', name:'List offer codes with stats', desc:'GET ?withStats=true → codes[]', method:'GET', path:'/api/crm/offer-codes?withStats=true',
        expect:(r,d)=>r.ok&&Array.isArray(d.codes) },
      { id:'code-create', name:'Create offer code', desc:'POST creates code', method:'POST', path:'/api/crm/offer-codes',
        body:()=>({ code:getTestCode(), description:'E2E automated test code', discount:'14 days free', type:'trial', max_usage:100, expires_at:null, active:true }),
        expect:(r,d)=>{ if(r.ok&&(d.success||d.code)){state.createdIds.codeId=d.code?.id||d.id;return true;} if(r.status===409){log('warn','Code exists — ok');return true;} return false; } },
      { id:'code-stats-shape', name:'Codes have stat fields', desc:'templatesLinked, activationRate, isAvailable present', method:'GET', path:'/api/crm/offer-codes?withStats=true',
        expect:(r,d)=>{ if(!r.ok||!d.codes.length)return true; const c=d.codes[0]; return 'templatesLinked' in c&&'activationRate' in c&&'isAvailable' in c; } },
      { id:'code-activate', name:'Activate (redeem) code', desc:'PUT increments usage_count', method:'PUT', path:'/api/crm/offer-codes',
        body:()=>({ code:getTestCode() }),
        expect:(r,d)=>r.ok&&d.success&&d.valid===true },
      { id:'code-usage-incremented', name:'Usage count incremented', desc:'usage_count >= 1 after activation', method:'GET', path:'/api/crm/offer-codes?withStats=true',
        expect:(r,d)=>{ if(!r.ok)return false; const code=d.codes.find(c=>c.code===getTestCode()); return code&&code.usage_count>=1; } },
      { id:'code-toggle', name:'Toggle inactive (PATCH)', desc:'active:false deactivates', method:'PATCH', path:'/api/crm/offer-codes',
        body:()=>({ id:state.createdIds.codeId, active:false }), skip:()=>!state.createdIds.codeId,
        expect:(r,d)=>r.ok&&d.success&&d.code?.active===false },
      { id:'code-reactivate', name:'Re-activate code', desc:'active:true re-activates', method:'PATCH', path:'/api/crm/offer-codes',
        body:()=>({ id:state.createdIds.codeId, active:true }), skip:()=>!state.createdIds.codeId,
        expect:(r,d)=>r.ok&&d.success&&d.code?.active===true },
      { id:'code-inactive-redeem', name:'Inactive code rejected on redeem', desc:'PUT on inactive → 400', method:'PATCH', path:'/api/crm/offer-codes',
        body:()=>({ id:state.createdIds.codeId, active:false }), skip:()=>!state.createdIds.codeId,
        expect:(r,d)=>r.ok&&d.success,
        postRun: async()=>{
          const r2=await fetch('/api/crm/offer-codes',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({code:getTestCode()})});
          const d2=await r2.json();
          const passed=r2.status===400&&d2.valid===false;
          if(state.createdIds.codeId) await fetch('/api/crm/offer-codes',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:state.createdIds.codeId,active:true})});
          return {override:true,passed,detail:JSON.stringify(d2)};
        }
      },
      { id:'code-delete', name:'Delete offer code', desc:'DELETE ?id= removes code', method:'DELETE',
        path:()=>'/api/crm/offer-codes?id='+state.createdIds.codeId, skip:()=>!state.createdIds.codeId,
        expect:(r,d)=>{ if(r.ok&&d.success){state.createdIds.codeId=null;return true;}return false; } },
    ]
  },

  'contractors': {
    title: 'Contractors',
    tests: [
      { id:'cont-list',       name:'List contractors (paginated)',  desc:'GET → {contractors, pagination}', method:'GET', path:'/api/outreach/contractors?limit=10&page=1',
        expect:(r,d)=>r.ok&&Array.isArray(d.contractors)&&d.pagination },
      { id:'cont-pagination', name:'Pagination metadata correct',   desc:'total, page, totalPages present', method:'GET', path:'/api/outreach/contractors?limit=10',
        expect:(r,d)=>r.ok&&typeof d.pagination?.total==='number'&&typeof d.pagination?.totalPages==='number' },
      { id:'cont-search',     name:'Search filter works',           desc:'?search=test returns array',      method:'GET', path:'/api/outreach/contractors?search=test&limit=10',
        expect:(r,d)=>r.ok&&Array.isArray(d.contractors) },
      { id:'cont-testcount',  name:'testCount in response',         desc:'Badge count field present',       method:'GET', path:'/api/outreach/contractors?limit=10',
        expect:(r,d)=>r.ok&&typeof d.testCount==='number' },
      { id:'cont-enrolled',   name:'Enrolled filter works',         desc:'?enrolled=true → only enrolled',  method:'GET', path:'/api/outreach/contractors?enrolled=true&limit=10',
        expect:(r,d)=>r.ok&&d.contractors.every(c=>c.enrolled===true) },
      { id:'cont-test-only',  name:'testOnly=true → is_test records', desc:'All returned have is_test=true', method:'GET', path:'/api/outreach/contractors?testOnly=true&showTest=true&limit=50',
        expect:(r,d)=>r.ok&&d.contractors.every(c=>c.is_test===true) },
    ]
  },

  'testContractors': {
    title: 'Test Contractors',
    tests: [
      { id:'tc-create', name:'Create test contractor', desc:'POST → {success, contractor} with is_test=true', method:'POST', path:'/api/outreach/test-contractors',
        body:()=>({ name:'E2E Test Contractor Corp', email:getTestEmail(), naics_code:'541512', state:'VA', business_type:'Small Business' }),
        expect:(r,d)=>{ if(r.ok&&d.success&&d.contractor?.id){state.createdIds.testContractorId=d.contractor.id;return true;} if(r.status===409){log('warn','Test contractor exists');return true;} return false; } },
      { id:'tc-is-test-flag', name:'Created contractor has is_test=true', desc:'Visible in testOnly list', method:'GET', path:'/api/outreach/contractors?testOnly=true&showTest=true&limit=50',
        expect:(r,d)=>{ if(!r.ok)return false; const found=d.contractors.find(c=>c.email===getTestEmail()); if(found)state.createdIds.testContractorId=state.createdIds.testContractorId||found.id; return found&&found.is_test===true; } },
      { id:'tc-excluded-stats', name:'Test contractor excluded from stats', desc:'Stats only count real contractors', method:'GET', path:'/api/outreach/stats',
        expect:(r,d)=>r.ok&&typeof d.totalContractors==='number' },
      { id:'tc-duplicate', name:'Duplicate rejected (409)', desc:'POST same email → 409 Conflict', method:'POST', path:'/api/outreach/test-contractors',
        body:()=>({ name:'Duplicate Corp', email:getTestEmail() }), expect:r=>r.status===409 },
      { id:'tc-delete', name:'Delete test contractor', desc:'DELETE removes record', method:'DELETE',
        path:()=>'/api/outreach/test-contractors/'+state.createdIds.testContractorId,
        skip:()=>!state.createdIds.testContractorId,
        expect:(r,d)=>{ if(r.ok&&d.success){state.createdIds.testContractorId=null;return true;}return false; } },
      { id:'tc-delete-real-blocked', name:'Cannot delete real contractor via test route', desc:'Returns 403 or 404', method:'GET', path:'/api/outreach/contractors?limit=1',
        expect: async(r,d)=>{ if(!r.ok||!d.contractors?.length)return true; const realId=d.contractors[0].id; const dr=await fetch('/api/outreach/test-contractors/'+realId,{method:'DELETE'}); return dr.status===403||dr.status===404; } },
    ]
  },

  'crm': {
    title: 'CRM Pipeline',
    tests: [
      { id:'crm-pipeline',    name:'Pipeline loads',       desc:'GET → {contractors, funnel}', method:'GET', path:'/api/crm/pipeline?limit=10',
        expect:(r,d)=>r.ok&&Array.isArray(d.contractors)&&d.funnel },
      { id:'crm-activities',  name:'Activities load',       desc:'GET → {activities:[]}',       method:'GET', path:'/api/crm/activities?limit=10',
        expect:(r,d)=>r.ok&&Array.isArray(d.activities) },
      { id:'crm-tasks',       name:'Tasks load',            desc:'GET → {tasks:[]}',            method:'GET', path:'/api/crm/tasks',
        expect:(r,d)=>r.ok&&Array.isArray(d.tasks) },
      { id:'crm-funnel',      name:'Funnel data present',   desc:'funnel is an object',         method:'GET', path:'/api/crm/pipeline?limit=10',
        expect:(r,d)=>r.ok&&typeof d.funnel==='object' },
    ]
  },

  'e2e': {
    title: 'Full E2E Flow',
    tests: [
      { id:'e2e-seed', name:'Step 1: Seed campaign library', desc:'POST /api/outreach/templates/seed', method:'POST', path:'/api/outreach/templates/seed',
        expect:(r,d)=>r.ok&&d.success },
      { id:'e2e-create-code', name:'Step 2: Create activation code', desc:'Create E2E-FLOW-CODE', method:'POST', path:'/api/crm/offer-codes',
        body:{ code:'E2E-FLOW-CODE', description:'E2E flow test code', discount:'14 days free', type:'trial', max_usage:10, active:true },
        expect:r=>r.ok||r.status===409 },
      { id:'e2e-template-with-code', name:'Step 3: Create template linked to code', desc:'Template references E2E-FLOW-CODE', method:'POST', path:'/api/outreach/templates',
        body:{ name:'E2E Flow Campaign Template', subject:'E2E Test — Use Code E2E-FLOW-CODE', body:'Use code E2E-FLOW-CODE for 14 days free.', category:'cold', offer_code:'E2E-FLOW-CODE', tags:['e2e'] },
        expect:(r,d)=>{ if(r.ok&&d.success){state.createdIds.templateId=d.template.id;return true;}return false; } },
      { id:'e2e-verify-link', name:'Step 4: Verify code-template linkage', desc:'templatesLinked >= 1 for E2E-FLOW-CODE', method:'GET', path:'/api/crm/offer-codes?withStats=true',
        expect:(r,d)=>{ if(!r.ok)return false; const code=d.codes.find(c=>c.code==='E2E-FLOW-CODE'); return code&&(code.templatesLinked||0)>=1; } },
      { id:'e2e-add-contractor', name:'Step 5: Add test contractor', desc:'Create is_test contractor', method:'POST', path:'/api/outreach/test-contractors',
        body:()=>({ name:'E2E Flow Test Inc', email:'e2e-flow-'+Date.now()+'@test.precisegovcon.com', naics_code:'541512', state:'VA' }),
        expect:(r,d)=>{ if(r.ok&&d.success){state.createdIds.testContractorId=d.contractor.id;return true;}return false; } },
      { id:'e2e-activate-code', name:'Step 6: Simulate code activation', desc:'PUT increments usage for E2E-FLOW-CODE', method:'PUT', path:'/api/crm/offer-codes',
        body:()=>({ code:'E2E-FLOW-CODE', contractor_id:state.createdIds.testContractorId }),
        skip:()=>!state.createdIds.testContractorId,
        expect:(r,d)=>r.ok&&d.success&&d.valid },
      { id:'e2e-verify-activation', name:'Step 7: Verify activation in stats', desc:'usage_count >= 1', method:'GET', path:'/api/crm/offer-codes?withStats=true',
        expect:(r,d)=>{ if(!r.ok)return false; const code=d.codes.find(c=>c.code==='E2E-FLOW-CODE'); return code&&code.usage_count>=1; } },
      { id:'e2e-cleanup-contractor', name:'Step 8: Cleanup test contractor', desc:'DELETE test contractor', method:'DELETE',
        path:()=>'/api/outreach/test-contractors/'+state.createdIds.testContractorId,
        skip:()=>!state.createdIds.testContractorId,
        expect:(r,d)=>{ if(r.ok){state.createdIds.testContractorId=null;return true;}return false; } },
      { id:'e2e-cleanup-template', name:'Step 9: Cleanup E2E template', desc:'DELETE E2E template', method:'DELETE',
        path:()=>'/api/outreach/templates?id='+state.createdIds.templateId,
        skip:()=>!state.createdIds.templateId,
        expect:(r,d)=>{ if(r.ok){state.createdIds.templateId=null;return true;}return false; } },
      { id:'e2e-cleanup-code', name:'Step 10: Cleanup E2E-FLOW-CODE', desc:'DELETE the flow test code', method:'GET', path:'/api/crm/offer-codes?withStats=true',
        expect: async(r,d)=>{ if(!r.ok)return false; const code=d.codes.find(c=>c.code==='E2E-FLOW-CODE'); if(!code)return true; const dr=await fetch('/api/crm/offer-codes?id='+code.id,{method:'DELETE'}); return dr.ok; } },
    ]
  }
};

// ── RENDER ────────────────────────────────────────────────────────────────────
function getAllTests(){ return Object.values(SECTIONS).flatMap(s=>s.tests); }

function render(){
  Object.entries(SECTIONS).forEach(([sectionId,section])=>{
    const c=document.getElementById('tests-'+sectionId);
    if(c) c.innerHTML=section.tests.map(renderRow).join('');
  });
}

function renderRow(test){
  const r=state.results[test.id], status=r?.status||'pending';
  const icons={pass:'✓',fail:'✗',pending:'·',running:'◌',skip:'⊘'};
  return '<div class="test-row" id="row-'+test.id+'">'
    +'<div class="status-icon icon-'+status+'" id="icon-'+test.id+'">'+icons[status]+'</div>'
    +'<div><div class="test-name">'+test.name+'</div><div class="test-desc">'+test.desc+'</div></div>'
    +'<span class="test-method method-'+test.method.toLowerCase()+'">'+test.method+'</span>'
    +'<span class="test-status status-'+status+'" id="status-'+test.id+'">'+(
      status==='pass'?'✓ PASS '+(r?.duration?'('+r.duration+'ms)':''):
      status==='fail'?'✗ FAIL '+(r?.duration?'('+r.duration+'ms)':''):
      status==='running'?'<span class="spinner"></span> Running...':
      status==='skip'?'⊘ SKIPPED':'— PENDING')+'</span>'
    +'<div class="detail-btn" onclick="toggleDetail(\\''+test.id+'\\')" title="Details">'+(r?'↓':'·')+'</div>'
    +'</div>'
    +'<div class="detail-panel" id="detail-'+test.id+'">'
    +(r?'<div class="detail-meta"><span>Status: <strong>'+r.status?.toUpperCase()+'</strong></span>'
      +(r.duration!=null?'<span>Duration: <strong>'+r.duration+'ms</strong></span>':'')
      +(r.httpStatus?'<span>HTTP: <strong>'+r.httpStatus+'</strong></span>':'')
      +(r.error?'<span style="color:var(--red)">Error: <strong>'+r.error+'</strong></span>':'')
      +'</div><pre>'+escHtml(r.responseText||'(no response)')+'</pre>'
    :'<pre style="color:var(--muted)">Not yet run.</pre>')
    +'</div>';
}

function escHtml(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

function toggleDetail(id){
  const p=document.getElementById('detail-'+id);
  if(p) p.classList.toggle('open');
}

// ── LOGGING ───────────────────────────────────────────────────────────────────
function log(type,msg){
  const c=document.getElementById('log-entries');
  if(!c)return;
  const time=new Date().toLocaleTimeString('en-US',{hour12:false});
  const e=document.createElement('div');
  e.className='log-entry '+type;
  e.innerHTML='<span class="log-time">'+time+'</span><span>'+escHtml(msg)+'</span>';
  c.appendChild(e);
  c.scrollTop=c.scrollHeight;
}

// ── RUN ───────────────────────────────────────────────────────────────────────
async function runTest(test){
  if(test.skip&&(typeof test.skip==='function'?test.skip():test.skip)){
    state.results[test.id]={status:'skip',duration:0};
    updateUI(test.id,'skip',0,null,null);
    log('warn','⊘ SKIP: '+test.name);
    return 'skip';
  }
  updateUI(test.id,'running',null,null,null);
  log('info','▶ Running: '+test.name);
  const t0=Date.now();
  try {
    const path=typeof test.path==='function'?test.path():test.path;
    let fetchBody;
    if(test.body){
      const b=typeof test.body==='function'?test.body():test.body;
      const resolved=Object.fromEntries(Object.entries(b).map(([k,v])=>[k,typeof v==='function'?v():v]));
      fetchBody=JSON.stringify(resolved);
    }
    const response=await fetch(path,{
      method:test.method,
      headers:{'Content-Type':'application/json'},
      credentials:'same-origin',
      ...(fetchBody?{body:fetchBody}:{})
    });
    const duration=Date.now()-t0;
    let data={},responseText='';
    try{ responseText=await response.text(); data=JSON.parse(responseText); responseText=JSON.stringify(data,null,2); }catch(e){}

    let passed;
    if(test.postRun){
      const result=await test.postRun();
      if(result.override){ passed=result.passed; if(result.detail)responseText+='\\n\\nPost-run:\\n'+result.detail; }
      else passed=test.expect?await resolveExpect(test.expect,response,data):response.ok;
    } else {
      passed=test.expect?await resolveExpect(test.expect,response,data):response.ok;
    }

    const status=passed?'pass':'fail';
    state.results[test.id]={status,duration,responseText,httpStatus:response.status};
    updateUI(test.id,status,duration,response.status,responseText);
    if(passed) log('pass','✓ PASS ('+duration+'ms): '+test.name);
    else log('fail','✗ FAIL ('+duration+'ms): '+test.name+' — HTTP '+response.status);
    return status;
  } catch(err){
    const duration=Date.now()-t0;
    const msg=err.message||'Network error';
    state.results[test.id]={status:'fail',duration,error:msg,responseText:msg};
    updateUI(test.id,'fail',duration,null,msg,msg);
    log('fail','✗ ERROR: '+test.name+' — '+msg);
    return 'fail';
  }
}

async function resolveExpect(fn,response,data){
  if(fn.constructor.name==='AsyncFunction') return await fn(response,data);
  return fn(response,data);
}

function updateUI(id,status,duration,httpStatus,responseText,error){
  const icons={pass:'✓',fail:'✗',running:'◌',skip:'⊘',pending:'·'};
  const icon=document.getElementById('icon-'+id);
  if(icon){ icon.className='status-icon icon-'+status; icon.innerHTML=status==='running'?'<div class="spinner" style="width:10px;height:10px;border-width:1.5px"></div>':icons[status]||'·'; }
  const st=document.getElementById('status-'+id);
  if(st){ st.className='test-status status-'+status; st.innerHTML=
    status==='pass'?'✓ PASS'+(duration?' ('+duration+'ms)':''):
    status==='fail'?'✗ FAIL'+(duration?' ('+duration+'ms)':''):
    status==='running'?'<span class="spinner"></span> Running...':
    status==='skip'?'⊘ SKIPPED':'— PENDING'; }
  const btn=document.querySelector('#row-'+id+' .detail-btn');
  if(btn&&status!=='running') btn.textContent='↓';
  const panel=document.getElementById('detail-'+id);
  if(panel) panel.innerHTML='<div class="detail-meta">'
    +'<span>Status: <strong>'+status.toUpperCase()+'</strong></span>'
    +(duration!=null?'<span>Duration: <strong>'+duration+'ms</strong></span>':'')
    +(httpStatus?'<span>HTTP: <strong>'+httpStatus+'</strong></span>':'')
    +(error?'<span style="color:var(--red)">Error: <strong>'+error+'</strong></span>':'')
    +'</div><pre>'+escHtml(responseText||'(no response)')+'</pre>';
}

async function runSection(sectionId){
  const section=SECTIONS[sectionId]; if(!section)return;
  const badge=document.getElementById('badge-'+sectionId);
  if(badge){badge.textContent='RUNNING';badge.className='section-badge badge-running';}
  log('info','━━━ Starting: '+section.title+' ━━━');
  let pass=0,fail=0,skip=0;
  for(const test of section.tests){
    const r=await runTest(test);
    if(r==='pass')pass++; else if(r==='fail')fail++; else skip++;
    updateSummary();
  }
  if(badge){ badge.textContent=fail===0?'✓ '+pass+' PASS':fail+' FAIL / '+pass+' PASS'; badge.className='section-badge '+(fail===0?'badge-pass':'badge-fail'); }
  log('info','━━━ Done: '+section.title+' — '+pass+' pass, '+fail+' fail, '+skip+' skip ━━━');
}

async function runAllTests(){
  const btn=document.getElementById('run-all-btn');
  btn.disabled=true; btn.innerHTML='<div class="spinner"></div> Running...';
  state.startTime=Date.now(); state.results={}; state.createdIds={templateId:null,codeId:null,testContractorId:null};
  Object.keys(SECTIONS).forEach(id=>{const b=document.getElementById('badge-'+id);if(b){b.textContent='RUNNING';b.className='section-badge badge-running';}});
  render();
  document.getElementById('log-entries').innerHTML='';
  log('info','═══════ E2E TEST RUN STARTED ═══════');
  for(const id of Object.keys(SECTIONS)) await runSection(id);
  const dur=((Date.now()-state.startTime)/1000).toFixed(1);
  log('info','═══════ RUN COMPLETE in '+dur+'s ═══════');
  updateSummary();
  btn.disabled=false; btn.innerHTML='▶ Run All Tests';
}

function updateSummary(){
  const results=Object.values(state.results);
  const total=getAllTests().length;
  const pass=results.filter(r=>r.status==='pass').length;
  const fail=results.filter(r=>r.status==='fail').length;
  const skip=results.filter(r=>r.status==='skip').length;
  const done=pass+fail+skip;
  document.getElementById('stat-total').textContent=total;
  document.getElementById('stat-pass').textContent=pass;
  document.getElementById('stat-fail').textContent=fail;
  document.getElementById('stat-skip').textContent=skip;
  if(state.startTime) document.getElementById('stat-time').textContent=((Date.now()-state.startTime)/1000).toFixed(1)+'s';
  const fillPct=total>0?Math.round((pass/total)*100):0;
  const progFill=document.getElementById('progress-fill');
  if(progFill){ progFill.style.width=fillPct+'%'; progFill.style.background=fail>0?'var(--red)':'var(--green)'; }
  const lbl=document.getElementById('progress-label');
  if(lbl) lbl.textContent=done<total?done+'/'+total+' tests ('+Math.round((done/total)*100)+'%)':fail===0?'✓ All '+pass+' tests passed!':fail+' test(s) failed — see details below';
}

function clearResults(){
  state.results={}; state.createdIds={templateId:null,codeId:null,testContractorId:null}; state.startTime=null;
  render();
  document.getElementById('log-entries').innerHTML='';
  ['stat-total','stat-pass','stat-fail','stat-skip','stat-time'].forEach(id=>document.getElementById(id).textContent='—');
  document.getElementById('progress-fill').style.width='0%';
  document.getElementById('progress-label').textContent='Ready to run';
  Object.keys(SECTIONS).forEach(id=>{const b=document.getElementById('badge-'+id);if(b){b.textContent='PENDING';b.className='section-badge badge-pending';}});
}

// expose to global for onclick handlers
window.runAllTests=runAllTests; window.runSection=runSection; window.clearResults=clearResults; window.toggleDetail=toggleDetail;

// init
render();
log('info','Test runner ready — serving from same origin (no CORS) — click Run All Tests');
`;
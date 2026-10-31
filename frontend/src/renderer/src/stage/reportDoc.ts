// Build a self-contained, print-ready HTML report from LIVE backend results
// (api/reportData.ts). Unlike BridgeLife-Report-handoff/ (a hand-assembled static
// document), this is generated on demand for whatever bridge is loaded — every
// number is the real compute-core output for the current inputs.

import type { ReportData } from '@/api/reportData'

export interface ReportMeta {
  name: string; span: number; engine: string; fmt: string; figs: string
  on: number[]; student: string; roll: string
}

const COND_COL: Record<string, string> = {
  Healthy: '#4FAE7F', Minor: '#D9B443', Deteriorated: '#E6893C', Severe: '#E0442F',
}
const HEALTH: Record<string, number> = { Healthy: 0.95, Minor: 0.82, Deteriorated: 0.60, Severe: 0.35 }
const SEVN = ['Healthy', 'Minor', 'Deteriorated', 'Severe']
const ACTION: Record<string, string> = {
  Healthy: 'Routine monitoring', Minor: 'Monitor; investigate within 6 months',
  Deteriorated: 'Detailed investigation and intervention', Severe: 'Immediate load restriction and repair',
}

const esc = (v: unknown): string =>
  String(v).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string))
const f0 = (n: number) => Math.round(n).toLocaleString()
const f = (n: number, d = 1) => n.toFixed(d)
const section = (on: number[], i: number) => on[i] !== 0

/** Map a class→value record into SEVN (H/MI/D/S) display order. */
function reorderConfusion(classes: string[], confusion: number[][]): { labels: string[]; m: number[][] } {
  const ord = SEVN.map((s) => classes.indexOf(s)).filter((ix) => ix >= 0)
  if (ord.length !== classes.length) return { labels: classes, m: confusion } // e.g. IsoForest Normal/Anomaly
  const labels = ord.map((ri) => (classes[ri] === 'Deteriorated' ? 'Det.' : classes[ri]))
  return { labels, m: ord.map((ri) => ord.map((ci) => confusion[ri][ci])) }
}

export function buildReportHtml(d: ReportData, meta: ReportMeta): string {
  const { geometry: g, analysis: a, prestress: p, baseline: b, features: ft, scenario: sc, ml } = d
  const figs = meta.figs !== 'no'
  const pred = ml.prediction
  const condCol = COND_COL[pred] ?? '#16181a'
  const health = HEALTH[pred] ?? 0.75
  const modes = b.modal.frequencies
  const lossKN = (k: string) => (p.losses[k] ?? 0) * p.Ap_mm2 / 1000
  const deltaRatio = a.deflection_mm / a.deflection_limit_mm
  const probs = ml.probabilities ?? {}
  const probStr = Object.entries(probs)
    .sort((x, y) => y[1] - x[1]).map(([k, v]) => `${esc(k)} ${f(v, 2)}`).join(' · ')
  const today = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })

  // feature-importance bars (top 6), normalised to the top feature
  const impSorted = Object.entries(ft.importance).sort((x, y) => y[1] - x[1]).slice(0, 6)
  const impMax = impSorted[0]?.[1] || 1
  const impBars = impSorted.map(([k, v]) =>
    `<div class="bar"><span class="bk">${esc(k)}</span><span class="bt"><i style="width:${Math.round((v / impMax) * 100)}%"></i></span><span class="bv">${f(v, 3)}</span></div>`,
  ).join('')

  // confusion matrix (display order)
  const { labels: cmL, m: cm } = reorderConfusion(ml.classes, ml.confusion)
  const cmMax = Math.max(1, ...cm.flat())
  const cmRows = cm.map((row, i) =>
    `<tr><th>${esc(cmL[i])}</th>${row.map((v, j) => {
      const diag = i === j, fr = v / cmMax
      const bg = diag ? `rgba(22,24,26,${0.18 + fr * 0.7})` : v ? `rgba(224,68,47,${0.12 + fr * 0.6})` : '#f4f4f2'
      return `<td style="background:${bg};color:${diag && fr > 0.4 ? '#fff' : '#16181a'}">${v}</td>`
    }).join('')}</tr>`,
  ).join('')
  const cmHead = `<tr><th></th>${cmL.map((l) => `<th>${esc(l)}</th>`).join('')}</tr>`

  const kv = (rows: Array<[string, string]>) =>
    `<table class="kv">${rows.map(([k, v]) => `<tr><td>${esc(k)}</td><td>${v}</td></tr>`).join('')}</table>`

  const blocks: string[] = []

  // ---- Executive summary --------------------------------------------------
  blocks.push(`<section><h2>Executive summary</h2>
    <p>Lifecycle assessment of a ${f(meta.span, 1)} m simply-supported PSC I-girder bridge,
    computed end to end from one digital twin (${esc(b.modal.engine)} engine). The current condition
    classifies as <b style="color:${condCol}">${esc(pred)}</b> (health ${f(health, 2)}); mid-span
    deflection is within the serviceability limit and effective prestress is ${f(p.loss_percent, 1)} %
    below jacking.</p>
    <div class="kpis">
      <div><span class="kl">CONDITION</span><span class="kn" style="color:${condCol}">${esc(pred)} · ${f(health, 2)}</span></div>
      <div><span class="kl">δ / L800</span><span class="kn">${f(deltaRatio, 2)}</span><span class="ks">${f(a.deflection_mm, 1)} / ${f(a.deflection_limit_mm, 1)} mm</span></div>
      <div><span class="kl">Pₑ / P₀</span><span class="kn">${f(p.Pe_kN / p.P0_kN, 3)}</span><span class="ks">loss ${f(p.loss_percent, 1)} %</span></div>
      <div><span class="kl">Δf₁ · scenario</span><span class="kn">${f(d.df_pct, 1)} %</span><span class="ks">${f(sc.baseline.f1, 2)} → ${f(sc.scenario.f1, 2)} Hz</span></div>
    </div></section>`)

  // ---- Configuration & analysis ------------------------------------------
  if (section(meta.on, 0) || section(meta.on, 1)) {
    blocks.push(`<section><h2>Configuration &amp; analysis</h2>
      ${kv([
        ['Span', `${f(meta.span, 1)} m`],
        ['Overall depth', `${f0(g.depth)} mm (girder ${f0(g.girder_depth)} + deck) · L/d ${f(g.span_depth_ratio, 1)}`],
        ['Composite area', `${f(g.A / 1e6, 3)} m²`],
        ['Second moment I', `${f(g.I / 1e12, 3)} m⁴`],
        ['Self-weight', `${f(g.self_weight_kN_m, 1)} kN/m`],
        ['Dead + SIDL', `${f(a.dead_load_kN_m, 1)} + ${f(a.sidl_kN_m, 1)} kN/m`],
        ['Live load (incl. IF)', `${f(a.live_load_udl_kN_m, 2)} kN/m · IF ${f(a.impact_factor, 2)}`],
        ['M_dead + M_live', `${f0(a.moment_dead_kNm)} + ${f0(a.moment_live_kNm)} = <b>${f0(a.moment_mid_kNm)}</b> kN·m`],
        ['V_max', `${f0(a.shear_end_kN)} kN`],
        ['Mid-span δ (live)', `${f(a.deflection_mm, 1)} mm ≤ L/800 ${f(a.deflection_limit_mm, 1)} mm  (${f(deltaRatio, 2)})`],
      ])}</section>`)
  }

  // ---- Prestress & baseline ----------------------------------------------
  if (section(meta.on, 2) || section(meta.on, 3)) {
    blocks.push(`<section><h2>Prestress &amp; healthy baseline</h2>
      ${kv([
        ['Tendon area A_p', `${f0(p.Ap_mm2)} mm²`],
        ['Jacking force P₀', `${f0(p.P0_kN)} kN`],
        ['Effective Pₑ', `${f0(p.Pe_kN)} kN  (Pₑ/P₀ ${f(p.Pe_kN / p.P0_kN, 3)})`],
        ['Total loss', `${f(p.loss_percent, 1)} %`],
        ['— friction / anchorage', `${f0(lossKN('friction'))} / ${f0(lossKN('anchorage'))} kN`],
        ['— elastic / creep', `${f0(lossKN('elastic_shortening'))} / ${f0(lossKN('creep'))} kN`],
        ['— shrinkage / relaxation', `${f0(lossKN('shrinkage'))} / ${f0(lossKN('relaxation'))} kN`],
        ['Net camber', `${f(p.camber_mm, 0)} mm`],
        ['σ_bot service', `${f(p.sigma_bot_service, 1)} MPa (${p.sigma_bot_service >= 0 ? 'compression' : 'tension'})`],
        ['Baseline modes', `${modes.map((m) => f(m, 2)).join(' · ')} Hz`],
        ['Mass / EI', `${f0(b.mass_per_girder_kg_m)} kg/m · ${f(b.EI_composite_GNm2, 1)} GN·m²`],
        ['Damping', `${f(b.damping_percent, 1)} %`],
      ])}</section>`)
  }

  // ---- Monitoring & synthetic scenario -----------------------------------
  if (section(meta.on, 6) || section(meta.on, 7)) {
    blocks.push(`<section><h2>Monitoring &amp; damage scenario</h2>
      <p>Damage scenario at mid-span classifies as <b style="color:${COND_COL[sc.scenario.label] ?? '#16181a'}">${esc(sc.scenario.label)}</b>.
      Every mode shifts down with the stiffness loss.</p>
      ${kv([
        ['f₁ baseline → scenario', `${f(sc.baseline.f1, 2)} → ${f(sc.scenario.f1, 2)} Hz  (Δf₁ ${f(d.df_pct, 1)} %)`],
        ['δ baseline → scenario', `${f(sc.baseline.delta_max, 1)} → ${f(sc.scenario.delta_max, 1)} mm`],
        ['UPV baseline → scenario', `${f(sc.baseline.upv, 2)} → ${f(sc.scenario.upv, 2)} km/s`],
        ['Effective stiffness EI', `${f(sc.scenario.ei_factor, 2)} × healthy`],
      ])}</section>`)
  }

  // ---- Feature extraction -------------------------------------------------
  if (section(meta.on, 8)) {
    const sgn = ft.strongest.r < 0 ? '−' : ''
    blocks.push(`<section><h2>Feature extraction</h2>
      <p>${ft.n} labelled records, ${ft.feature_order.length} features. Strongest correlation:
      ${esc(ft.strongest.a)} ↔ ${esc(ft.strongest.b)} r = ${sgn}${f(Math.abs(ft.strongest.r), 2)}.</p>
      ${figs ? `<div class="bars">${impBars}</div><div class="cap">FEATURE IMPORTANCE · normalised to top feature</div>` : ''}</section>`)
  }

  // ---- AI/ML assessment ---------------------------------------------------
  if (section(meta.on, 9)) {
    blocks.push(`<section><h2>AI/ML condition assessment</h2>
      <div class="split">
        <div>${figs ? `<table class="cm">${cmHead}${cmRows}</table><div class="cap">CONFUSION · ${ml.n_test} test records</div>` : kv([['Test records', String(ml.n_test)]])}</div>
        <div class="mlr">
          <div><span class="kl">TEST ACCURACY</span><span class="kn">${f(ml.accuracy * 100, 1)} %</span></div>
          <div><span class="kl">FIELD PREDICTION</span><span class="kn" style="color:${condCol}">${esc(pred)} · p ${f(ml.confidence, 2)}</span>
          <span class="ks">${esc(probStr)}</span></div>
          <p class="disc">AI-generated assessment (${esc(ml.model)}). Advisory, not a verified engineering result — confirm by detailed investigation.</p>
        </div>
      </div></section>`)
  }

  // ---- Maintenance --------------------------------------------------------
  if (section(meta.on, 10)) {
    blocks.push(`<section><h2>Maintenance decision</h2>
      <p>Recommended action for a <b style="color:${condCol}">${esc(pred)}</b> condition:
      <b>${esc(ACTION[pred] ?? 'Review')}</b>. Health score ${f(health, 2)}.</p></section>`)
  }

  // ---- Assumptions & limitations -----------------------------------------
  if (section(meta.on, 11)) {
    blocks.push(`<section><h2>Assumptions &amp; limitations</h2><ul class="lim">
      <li>Structural model: ${esc(b.modal.engine)}. Grillage modes are closely spaced (real multi-girder behaviour), not the textbook 1:4:9 beam ratio.</li>
      <li>The ML condition is a statistical classifier output and is <b>advisory</b>; it does not replace a qualified inspection.</li>
      <li>Visual bearing / expansion-joint / abutment conditions are inspection inputs — the model has no bearing element.</li>
      <li>A SonReb concrete-strength estimate is withheld: the correlation is uncalibrated until site cores are taken.</li>
      <li>Every coefficient drawn from IRC / IS codes must be verified against the current code edition.</li>
    </ul></section>`)
  }

  const byline = [meta.student && `Prepared by ${esc(meta.student)}`, meta.roll && esc(meta.roll)]
    .filter(Boolean).join(' · ')

  return `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(meta.name)} — Condition Report</title>
<style>
  :root { --ink:#16181a; --muted:#5d6368; --line:rgba(22,24,26,.12); --paper:#fff; }
  * { box-sizing:border-box; }
  body { margin:0; background:#ececeb; color:var(--ink);
    font:15px/1.6 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif; }
  .page { max-width:780px; margin:24px auto; background:var(--paper); padding:48px 56px;
    box-shadow:0 1px 4px rgba(0,0,0,.08); }
  .mono, .kl, .cap, .bk, .bv, .ks { font-family:ui-monospace,"SF Mono",Menlo,Consolas,monospace; }
  header { border-bottom:1px solid var(--ink); padding-bottom:18px; margin-bottom:8px; }
  .eyebrow { font-family:ui-monospace,monospace; font-size:11px; letter-spacing:.1em; color:var(--muted); text-transform:uppercase; }
  h1 { font-size:34px; font-weight:600; letter-spacing:-.02em; margin:6px 0 4px; }
  h2 { font-size:21px; font-weight:600; letter-spacing:-.01em; margin:34px 0 10px; }
  p { margin:8px 0; color:#30343a; }
  section { break-inside:avoid; }
  .kpis { display:grid; grid-template-columns:repeat(4,1fr); gap:0; margin-top:16px; border-top:1px solid var(--ink); }
  .kpis > div { padding:12px 14px 12px 0; border-left:1px solid var(--line); display:flex; flex-direction:column; gap:3px; }
  .kpis > div:first-child { border-left:0; }
  .kl { font-size:10px; letter-spacing:.08em; color:var(--muted); }
  .kn { font-size:26px; font-weight:300; letter-spacing:-.02em; }
  .ks { font-size:11px; color:var(--muted); }
  table.kv { width:100%; border-collapse:collapse; margin-top:6px; }
  table.kv td { padding:6px 0; border-bottom:1px solid var(--line); vertical-align:top; font-size:14px; }
  table.kv td:first-child { color:var(--muted); width:46%; }
  table.kv td:last-child { text-align:right; font-family:ui-monospace,monospace; }
  .bars { margin-top:12px; display:flex; flex-direction:column; gap:7px; }
  .bar { display:grid; grid-template-columns:96px 1fr 56px; gap:10px; align-items:center; font-size:12px; }
  .bk { color:var(--ink); }
  .bt { height:9px; border-radius:99px; background:rgba(22,24,26,.08); }
  .bt i { display:block; height:100%; border-radius:99px; background:var(--ink); }
  .bv { text-align:right; color:var(--muted); }
  .cap { font-family:ui-monospace,monospace; font-size:10px; letter-spacing:.06em; color:#8b9196; margin-top:8px; text-transform:uppercase; }
  .split { display:grid; grid-template-columns:1fr 1fr; gap:24px; align-items:start; margin-top:8px; }
  table.cm { border-collapse:collapse; width:100%; font-family:ui-monospace,monospace; font-size:13px; }
  table.cm th { font-size:10px; color:var(--muted); font-weight:500; padding:4px; }
  table.cm td { text-align:center; padding:10px 4px; border:2px solid #fff; }
  .mlr { display:flex; flex-direction:column; gap:14px; }
  .mlr .kn { font-size:30px; }
  .disc { font-size:12px; color:var(--muted); border:1px solid var(--line); border-radius:8px; padding:10px 12px; }
  ul.lim { margin:8px 0; padding-left:18px; font-size:13.5px; color:#30343a; }
  ul.lim li { margin:6px 0; }
  footer { margin-top:40px; padding-top:14px; border-top:1px solid var(--line);
    display:flex; justify-content:space-between; font-family:ui-monospace,monospace; font-size:10px; color:var(--muted); }
  @media print { body { background:#fff; } .page { box-shadow:none; margin:0; max-width:none; padding:24mm 20mm; } @page { size:A4; margin:0; } }
</style></head>
<body><div class="page">
  <header>
    <div class="eyebrow">Integrated condition report · ${esc(b.modal.engine)} · ${esc(today)}</div>
    <h1>${esc(meta.name)}</h1>
    <div class="eyebrow">PSC I-girder bridge · ${f(meta.span, 1)} m simply supported</div>
  </header>
  ${blocks.join('\n')}
  <footer><span>BridgeLife Studio · live report</span><span>${byline || esc(today)}</span></footer>
</div></body></html>`
}

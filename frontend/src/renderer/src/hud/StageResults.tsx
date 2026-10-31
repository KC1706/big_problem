import type { ResultsModel } from '@/stage/results'
import { useStore } from '@/state/store'
import { downloadText, toCsv } from '@/stage/download'
import c from './StageResults.module.css'

const MONO = 'Geist Mono, monospace'

/** Renders the per-stage result content below the panel header + big grid.
 *  One branch per F3 stage; other ws stages render nothing here yet (F4). */
export default function StageResults({ r }: { r: ResultsModel }) {
  const exportJSON = useStore((s) => s.exportJSON)
  const downloadReport = useStore((s) => s.downloadReport)
  if (r.kind === 'config') {
    const { xs } = r
    return (
      <>
        <div className={c.block8}>
          <span className={c.eyebrow}>CROSS-SECTION · COMPOSITE</span>
          <svg viewBox="0 0 300 210" style={{ width: '100%', height: 'auto', display: 'block', color: 'var(--ink)', border: '1px solid var(--line)', borderRadius: 12 }}>
            <rect x={xs.slab.x} y={xs.slab.y} width={xs.slab.w} height={xs.slab.h} fill="none" stroke="currentColor" strokeWidth={1} />
            <polygon points={xs.pts} fill="currentColor" fillOpacity={0.06} stroke="currentColor" strokeWidth={1} />
            <line x1={xs.cx0} y1={xs.yb} x2={xs.cx1} y2={xs.yb} stroke="var(--acc)" strokeWidth={1} strokeDasharray="4 3" />
            <text x={xs.cx1} y={xs.ybT} fill="var(--acc)" fontFamily={MONO} fontSize={10} textAnchor="end">y_b {xs.ybS}</text>
            <line x1={xs.dx} y1={xs.top} x2={xs.dx} y2={xs.bot} stroke="currentColor" strokeWidth={0.8} />
            <line x1={xs.dx0} y1={xs.top} x2={xs.dx1} y2={xs.top} stroke="currentColor" strokeWidth={0.8} />
            <line x1={xs.dx0} y1={xs.bot} x2={xs.dx1} y2={xs.bot} stroke="currentColor" strokeWidth={0.8} />
            <text x={xs.dxT} y={xs.mid} fill="currentColor" fontFamily={MONO} fontSize={10}>{xs.hS}</text>
            <line x1={xs.bf0} y1={198} x2={xs.bf1} y2={198} stroke="currentColor" strokeWidth={0.8} />
            <text x={150} y={194} fill="currentColor" fontFamily={MONO} fontSize={10} textAnchor="middle">{xs.bfS}</text>
            <text x={150} y={xs.spT} fill="currentColor" fontFamily={MONO} fontSize={10} textAnchor="middle">{xs.spS}</text>
            <text x={xs.twX} y={xs.mid} fill="var(--mut)" fontFamily={MONO} fontSize={10}>{xs.twS}</text>
          </svg>
        </div>
        <Rows rows={r.secRows} />
        <div className={c.checks}>
          {r.checks.map((ck) => (
            <div className={c.check} key={ck.k}>
              <span className={c.checkDot} style={{ background: ck.col }} />
              <span className={c.checkK}>{ck.k}</span>
              <span className={c.checkV}>{ck.v}</span>
            </div>
          ))}
        </div>
        <span className={c.note}>Preview calculation, modular ratio 1. Final properties come from sectionproperties in the backend.</span>
      </>
    )
  }

  if (r.kind === 'analysis') {
    return (
      <>
        <div className={c.block}>
          <div className={`${c.head} ${c.headNoLs}`}>
            <span>BENDING MOMENT</span>
            <span className={c.nowrap}>— at x  - - dead  · envelope</span>
          </div>
          <svg viewBox="0 0 300 124" className={c.svg}>
            <line x1={10} y1={20} x2={290} y2={20} stroke="var(--ink)" strokeWidth={1} />
            <path d={r.pt} fill="var(--ink)" fillOpacity={0.07} stroke="var(--ink)" strokeWidth={1.4} />
            <path d={r.pd} fill="none" stroke="var(--mut)" strokeWidth={1} strokeDasharray="3 3" />
            <path d={r.pe} fill="none" stroke="var(--acc)" strokeWidth={1} />
            <line x1={r.posX} y1={8} x2={r.posX} y2={20} stroke="var(--acc)" strokeWidth={1.5} />
            <text x={150} y={r.MtY} fill="var(--ink)" fontFamily={MONO} fontSize={10} textAnchor="middle">{r.MtS}</text>
          </svg>
        </div>
        <div className={c.block}>
          <span className={c.eyebrow}>SHEAR FORCE</span>
          <svg viewBox="0 0 300 110" className={c.svg}>
            <line x1={10} y1={55} x2={290} y2={55} stroke="var(--ink)" strokeWidth={1} />
            <path d={r.ps} fill="var(--ink)" fillOpacity={0.07} stroke="var(--ink)" strokeWidth={1.4} />
            <line x1={r.posX} y1={10} x2={r.posX} y2={100} stroke="var(--acc)" strokeWidth={1} strokeDasharray="2 3" />
          </svg>
        </div>
        <Rows rows={r.rows} />
        <div className={c.check}>
          <span className={c.checkDot} style={{ background: r.check.col }} />
          <span className={c.checkK}>{r.check.k}</span>
          <span className={c.checkV}>{r.check.v}</span>
        </div>
        {r.running && <Progress label="Running OpenSeesPy analysis" s={r.progS} w={r.progW} />}
        <button className={c.primaryBtn} onClick={r.run}>Run full FE analysis</button>
        <span className={c.note}>Preview uses a single equivalent axle and a distribution factor. Check the load model against the current IRC code.</span>
      </>
    )
  }

  if (r.kind === 'baseline') {
    return (
      <>
        <div className={c.block8}>
          <div className={c.head}>
            <span>MODE SHAPES</span>
            <span>baseline {r.ver}</span>
          </div>
          {r.modes.map((m) => (
            <div className={c.modeCard} key={m.k}>
              <div className={c.modeHead}>
                <span className={c.modeK}>{m.k}</span>
                <span className={c.modeF}>{m.f}</span>
              </div>
              <svg viewBox="0 0 300 44" preserveAspectRatio="none" className={c.modeSvg}>
                <line x1={0} y1={22} x2={300} y2={22} stroke="var(--line)" strokeWidth={1} strokeDasharray="3 3" />
                <path d={m.d} fill="none" stroke="var(--acc)" strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
              </svg>
            </div>
          ))}
        </div>
        <Rows rows={r.rows} />
        {r.running && <Progress label="Freezing fingerprint" s={r.progS} w={r.progW} />}
        <button className={c.primaryBtn} onClick={r.establish}>Establish baseline</button>
        <span className={c.note}>{r.note}</span>
      </>
    )
  }

  if (r.kind === 'monitoring') {
    return (
      <>
        <div className={c.block}>
          <div className={c.head}>
            <span>a(t) · A5 · L/2</span>
            <span>±0.08 g · 4 s window</span>
          </div>
          <svg viewBox="0 0 300 96" preserveAspectRatio="none" className={c.atSvg}>
            <line x1={0} y1={48} x2={300} y2={48} stroke="var(--line)" strokeWidth={1} />
            <path d={r.at} fill="none" stroke="var(--ink)" strokeWidth={1.2} vectorEffect="non-scaling-stroke" />
          </svg>
        </div>
        <div className={c.block}>
          <div className={c.head}>
            <span>FFT · 0–12 Hz</span>
            <span className={c.nowrap}>— measured  - - baseline</span>
          </div>
          <svg viewBox="0 0 300 120" className={c.svg}>
            <path d={r.fb} fill="none" stroke="var(--mut)" strokeWidth={1} strokeDasharray="3 3" />
            <path d={r.fm} fill="none" stroke="var(--acc)" strokeWidth={1.5} />
            {r.peaks.map((k) => (
              <text key={k.t} x={k.x} y={k.y} fill="var(--ink)" fontFamily={MONO} fontSize={10} textAnchor="middle">{k.t}</text>
            ))}
            <text x={4} y={116} fill="var(--mut)" fontFamily={MONO} fontSize={9}>0</text>
            <text x={296} y={116} fill="var(--mut)" fontFamily={MONO} fontSize={9} textAnchor="end">12 Hz</text>
          </svg>
        </div>
        <Rows rows={r.rows} />
      </>
    )
  }

  if (r.kind === 'prestress') {
    return (
      <>
        <div className={c.block}>
          <div className={c.head}><span>CABLE PROFILE · ELEVATION</span><span>vertical ×5</span></div>
          <svg viewBox="0 0 300 110" className={c.svg}>
            <rect x={10} y={r.girderY} width={280} height={78} fill="var(--ink)" fillOpacity={0.05} stroke="var(--ink)" strokeWidth={1} />
            {r.cab.map((cb, i) => <path key={i} d={cb.d} fill="none" stroke="var(--acc)" strokeWidth={1.5} />)}
          </svg>
        </div>
        <div className={c.block}>
          <span className={c.eyebrow}>LOSS WATERFALL · P₀ → Pₑ</span>
          <svg viewBox="0 0 300 124" className={c.svg}>
            <line x1={4} y1={104} x2={296} y2={104} stroke="var(--line)" strokeWidth={1} />
            {r.bars.map((b, i) => (
              <g key={i}>
                <rect x={b.x} y={b.y} width={26} height={b.h} rx={2} fill={b.fill} />
                <text x={b.lx} y={117} fill="var(--mut)" fontFamily={MONO} fontSize={8.5} textAnchor="middle">{b.k}</text>
              </g>
            ))}
          </svg>
        </div>
        <Rows rows={r.rows} />
        <Checks checks={r.checks} />
        <span className={c.note}>Simplified loss model for preview. Time-dependent losses come from concreteproperties in the backend; compare stresses with your project limits.</span>
      </>
    )
  }

  if (r.kind === 'inspection') {
    return (
      <>
        <div className={c.block}>
          <div className={c.head}><span>ELEVATION · COMPONENT HEALTH</span><span>click to select</span></div>
          <svg viewBox="0 0 300 118" className={c.svg}>
            <line x1={0} y1={110} x2={300} y2={110} stroke="var(--line)" strokeWidth={1} />
            {r.parts.map((p, i) => (
              <rect key={i} x={p.x} y={p.y} width={p.w} height={p.h} rx={1.5} fill={p.fill} fillOpacity={p.op} stroke={p.stroke} strokeWidth={1.5} onClick={p.go} style={{ cursor: 'pointer' }} />
            ))}
          </svg>
          <div className={c.legend}>
            {r.legend.map((l) => <span className={c.legendItem} key={l.l}><span className={c.legendSq} style={{ background: l.c }} />{l.l}</span>)}
          </div>
        </div>
        <div className={c.block}>
          <span className={c.eyebrow}>INSPECTION LOG</span>
          <div className={c.rows}>
            {r.log.map((o, i) => (
              <div className={c.logRow} key={i}>
                <span className={c.logComp}>{o.comp} · {o.d}</span>
                <span className={c.logSev}><span className={c.logDot} style={{ background: o.col }} />{o.sev}</span>
                <span className={c.logLoc}>{o.loc}</span>
                <span className={c.logE}>{o.e}</span>
              </div>
            ))}
          </div>
        </div>
        <span className={c.note}>Component rating is the worst observation on it. Visual index = 1 − Σ rating / (3 × components).</span>
      </>
    )
  }

  if (r.kind === 'ndt') {
    return (
      <>
        <div className={c.infoCard}>
          <span className={c.eyebrow}>ENGINEERING QUESTION</span>
          <span className={c.infoText}>{r.q}</span>
        </div>
        <div className={c.block}>
          <div className={c.head}><span>{r.gl} · WEB FACE GRID</span><span>{r.ref}</span></div>
          <svg viewBox="0 0 300 96" className={c.svg}>
            {r.cells.map((cell, i) => <rect key={i} x={cell.x} y={cell.y} width={19} height={19} rx={2} fill={cell.fill} fillOpacity={0.85} />)}
            <circle cx={r.minX} cy={r.minY} r={12} fill="none" stroke="var(--ink)" strokeWidth={1.2} />
            <text x={10} y={14} fill="var(--mut)" fontFamily={MONO} fontSize={9}>support</text>
            <text x={150} y={14} fill="var(--mut)" fontFamily={MONO} fontSize={9} textAnchor="middle">mid-span</text>
            <text x={290} y={14} fill="var(--mut)" fontFamily={MONO} fontSize={9} textAnchor="end">support</text>
          </svg>
        </div>
        {r.running && <div className={c.thinTrack}><div className={c.progressFill} style={{ width: r.progW }} /></div>}
        <div className={c.checks}>
          {r.bands.map((b) => (
            <div className={c.bandRow} key={b.l}>
              <span className={c.bandSq} style={{ background: b.c }} />
              <span className={c.bandL}>{b.l}</span>
              <span className={c.bandR}>{b.r}</span>
              <span className={c.bandN}>{b.n}</span>
            </div>
          ))}
        </div>
        <Rows rows={r.rows} />
        <span className={c.note}>Band limits shown for preview. Confirm against the current IS / ASTM documents; SonReb coefficients need calibration on cores.</span>
      </>
    )
  }

  if (r.kind === 'synthetic') {
    return (
      <>
        <div className={c.predCard}>
          <span className={c.predDot} style={{ background: r.labCol }} />
          <div className={c.predBody}>
            <span className={c.predSmall}>Scenario label (auto)</span>
            <span className={c.predBig}>{r.label}</span>
          </div>
        </div>
        {r.met.map((m) => (
          <div className={c.block} key={m.k}>
            <div className={c.head}><span>{m.k} BY CLASS (%)</span><span>{m.scS}</span></div>
            <svg viewBox="0 0 300 58" style={{ width: '100%', height: 'auto', display: 'block', border: '1px solid var(--line)', borderRadius: 10 }}>
              <line x1={8} y1={50} x2={292} y2={50} stroke="var(--line)" strokeWidth={1} />
              {m.bars.map((b, i) => (
                <g key={i}>
                  <rect x={b.x} y={b.y} width={40} height={b.h} rx={2} fill={b.c} />
                  <text x={b.tx} y={b.ty} fill="var(--mut)" fontFamily={MONO} fontSize={8.5} textAnchor="middle">{b.t}</text>
                </g>
              ))}
              <line x1={8} y1={m.lineY} x2={292} y2={m.lineY} stroke="var(--ink)" strokeWidth={1} strokeDasharray="4 3" />
            </svg>
          </div>
        ))}
        <div className={c.block}>
          <div className={c.head}><span>CLASS BALANCE</span><span>{r.ver}</span></div>
          <div className={c.classBar}>{r.dist.map((dd, i) => <span key={i} style={{ width: dd.w, background: dd.c }} />)}</div>
        </div>
        {r.running && <Progress label="Generating · FEM reruns" s={r.progS} w={r.progW} />}
        <div className={c.block}>
          <div className={c.head} style={{ alignItems: 'center' }}><span>PREVIEW</span><button className={c.csvBtn} onClick={() => downloadText('bridgelife-synthetic-preview.csv', toCsv(r.prev.map((row) => ({ id: row.id, label: row.l, f1: row.f, delta_max: row.d, upv: row.u }))), 'text/csv')}>Export CSV</button></div>
          <div className={c.prevTable}>
            <div className={c.prevHead}><span>id</span><span>label</span><span>f₁</span><span>δ</span><span>UPV</span></div>
            {r.prev.map((row) => (
              <div className={c.prevRow} key={row.id}>
                <span style={{ color: 'var(--mut)' }}>{row.id}</span>
                <span className={c.prevLabel}><span className={c.prevLabelDot} style={{ background: row.c }} />{row.l}</span>
                <span>{row.f}</span><span>{row.d}</span><span>{row.u}</span>
              </div>
            ))}
          </div>
        </div>
      </>
    )
  }

  if (r.kind === 'features') {
    return (
      <>
        <div className={c.block}>
          <span className={c.eyebrow}>CORRELATION MATRIX</span>
          <div className={c.corrGrid}>
            {r.cm.map((row) => (
              <div className={c.corrRow} key={row.k} style={{ gridTemplateColumns: r.cols }}>
                <span className={c.corrK}>{row.k}</span>
                {row.cells.map((cell, i) => <span key={i} className={c.corrCell} title={String(cell.v)} style={{ background: cell.bg }} />)}
              </div>
            ))}
          </div>
          <div className={c.corrLegend}><span>■ ink = negative</span><span>■ cyan = positive</span></div>
        </div>
        <div className={c.block}>
          <div className={c.head}><span>{r.sel} BY CONDITION</span><span>±2σ</span></div>
          <svg viewBox="0 0 300 96" className={c.svg}>
            {r.dist.map((dd, i) => (
              <g key={i}>
                <line x1={dd.x0} y1={dd.y} x2={dd.x1} y2={dd.y} stroke={dd.c} strokeWidth={6} strokeLinecap="round" />
                <circle cx={dd.xm} cy={dd.y} r={4} fill="var(--ink)" />
                <text x={4} y={dd.ly} fill="var(--mut)" fontFamily={MONO} fontSize={8.5}>{dd.l}</text>
              </g>
            ))}
            <text x={40} y={92} fill="var(--mut)" fontFamily={MONO} fontSize={8.5}>{r.lo}</text>
            <text x={290} y={92} fill="var(--mut)" fontFamily={MONO} fontSize={8.5} textAnchor="end">{r.hi}</text>
          </svg>
        </div>
        <div className={c.infoCard}>
          <span className={c.eyebrow}>PHYSICAL MEANING · {r.sel}</span>
          <span className={c.infoText12}>{r.meaning}</span>
        </div>
        <div className={c.block8}>
          <span className={c.eyebrow}>IMPORTANCE PREVIEW</span>
          {r.imp.map((f) => <Importance key={f.k} f={f} />)}
        </div>
      </>
    )
  }

  if (r.kind === 'ml') {
    return (
      <>
        {r.training && <Progress label={'Training ' + r.model} s={r.progS} w={r.progW} />}
        <div className={c.predCard}>
          <span className={c.predDot} style={{ background: r.predCol }} />
          <div className={c.predBody}>
            <span className={c.predSmall}>Live prediction</span>
            <span className={c.predBig}>{r.pred}</span>
          </div>
          <span className={c.predConf}>{r.confS}</span>
        </div>
        <div className={c.block8}>
          <div className={c.head}><span>CONFUSION MATRIX</span><span>test n = {r.nTest}</span></div>
          <div className={c.cmGrid}>
            {r.cm.map((row) => (
              <div className={c.cmRow} key={row.k} style={{ gridTemplateColumns: r.cmCols }}>
                <span className={c.cmK}>{row.k}</span>
                {row.cells.map((cell, i) => <span key={i} className={c.cmCell} style={{ background: cell.bg, color: cell.fg }}>{cell.v}</span>)}
              </div>
            ))}
          </div>
        </div>
        <div className={c.block8}>
          <span className={c.eyebrow}>FEATURE IMPORTANCE</span>
          {r.imp.map((f) => <Importance key={f.k} f={f} />)}
        </div>
        <div className={c.infoCard}>
          <span className={c.eyebrow}>PHYSICAL INTERPRETATION</span>
          <span className={c.infoText12}>A drop in f₁ with a rise in δ_max both indicate lost flexural stiffness. Low UPV at the same girder supports cracking as the cause. The model&apos;s top features follow that physics.</span>
        </div>
      </>
    )
  }

  if (r.kind === 'maintenance') {
    return (
      <>
        <div className={c.block}>
          <span className={c.eyebrow}>DECISION PATH</span>
          <svg viewBox="0 0 320 200" className={c.svg}>
            {r.edges.map((e, i) => <line key={i} x1={e.x1} y1={e.y1} x2={e.x2} y2={e.y2} stroke={e.s} strokeWidth={e.w} />)}
            {r.nodes.map((n, i) => (
              <g key={i}>
                <rect x={n.x} y={n.y} width={n.w} height={26} rx={13} fill={n.fill} stroke={n.bd} strokeWidth={1} />
                <text x={n.tx} y={n.ty} fill={n.fg} fontFamily="Geist, sans-serif" fontSize={10} textAnchor="middle">{n.l}</text>
              </g>
            ))}
          </svg>
        </div>
        <div className={c.block8}>
          <span className={c.eyebrow}>RECOMMENDED ACTIONS</span>
          {r.actions.map((a, i) => (
            <div className={c.actionCard} key={i}>
              <span className={c.actionTitle}><span className={c.actionDot} style={{ background: a.c }} />{a.t}</span>
              <div className={c.whyWrap}>{a.why.map((w, j) => <span className={c.whyChip} key={j}>{w}</span>)}</div>
            </div>
          ))}
        </div>
        <div className={c.block}>
          <div className={c.head}><span>TIMELINE</span><span>0 – 24 months</span></div>
          <svg viewBox="0 0 300 60" className={c.svg}>
            <line x1={16} y1={32} x2={284} y2={32} stroke="var(--line)" strokeWidth={2} />
            {r.tl.map((t, i) => (
              <g key={i}>
                <circle cx={t.x} cy={32} r={4} fill="var(--ink)" />
                <text x={t.x} y={t.ly} fill="var(--ink)" fontFamily={MONO} fontSize={9} textAnchor="middle">{t.l}</text>
              </g>
            ))}
          </svg>
        </div>
        <button className={c.primaryBtn} onClick={exportJSON}>Confirm decision</button>
      </>
    )
  }

  if (r.kind === 'report') {
    return (
      <>
        <div className={c.thumbs}>
          {r.thumbs.map((t) => (
            <div className={c.thumb} key={t.n}>
              <span className={c.thumbN}>{t.n}</span>
              <span className={c.thumbL}>{t.l}</span>
              <span className={c.thumbBar} style={{ width: '90%' }} />
              <span className={c.thumbBar} style={{ width: '75%' }} />
              {t.fig && <span className={c.thumbFig} />}
              <span className={c.thumbBar} style={{ width: '85%' }} />
            </div>
          ))}
        </div>
        <div className={c.block}>
          <div className={c.head}><span>CONTENTS</span><span>{r.pages} pages</span></div>
          <div className={c.toc}>
            {r.toc.map((t) => (
              <div className={c.tocRow} key={t.n}>
                <span className={c.tocN}>{t.n}</span>
                <span className={c.tocL}>{t.l}</span>
                <span className={c.tocP}>{t.p}</span>
              </div>
            ))}
          </div>
        </div>
        {r.running && <Progress label="Compiling figures and tables" s={r.progS} w={r.progW} />}
        <div className={c.downloadRow}>
          <span style={{ fontSize: 12 }}>{r.compiled ? r.verS : 'Report document · ready to compile'}</span>
          <button className={c.downloadBtn} onClick={downloadReport}>
            {r.compiled ? 'Download Report' : 'Compile & Download'}
          </button>
        </div>
        <span className={c.note}>Every value flagged for code verification is listed in Assumptions &amp; limitations.</span>
      </>
    )
  }

  return null
}

function Checks({ checks }: { checks: Array<{ k: string; v: string; col: string }> }) {
  return (
    <div className={c.checks}>
      {checks.map((ck) => (
        <div className={c.check} key={ck.k}>
          <span className={c.checkDot} style={{ background: ck.col }} />
          <span className={c.checkK}>{ck.k}</span>
          <span className={c.checkV}>{ck.v}</span>
        </div>
      ))}
    </div>
  )
}

function Importance({ f }: { f: { k: string; v: string; w: string } }) {
  return (
    <div className={c.impRow}>
      <span className={c.impK}>{f.k}</span>
      <span className={c.impBar}><span className={c.impFill} style={{ width: f.w }} /></span>
      <span className={c.impV}>{f.v}</span>
    </div>
  )
}

function Rows({ rows }: { rows: Array<{ k: string; v: string }> }) {
  return (
    <div className={c.rows}>
      {rows.map((row) => (
        <div className={c.row} key={row.k}>
          <span className={c.rowKey}>{row.k}</span>
          <span className={c.rowVal}>{row.v}</span>
        </div>
      ))}
    </div>
  )
}

function Progress({ label, s, w }: { label: string; s: string; w: string }) {
  return (
    <div className={c.progress}>
      <div className={c.progressHead}>
        <span>{label}</span>
        <span className={c.progressVal}>{s}</span>
      </div>
      <div className={c.progressTrack}>
        <div className={c.progressFill} style={{ width: w }} />
      </div>
    </div>
  )
}

# BridgeLife — Integrated Report — Handoff

Package date: 2026-10-31. Files in `src/` are byte-identical copies of the project files.

Open `src/BridgeLife Report.dc.html` in Chrome (keep the folder structure). Works offline — fonts are local; no three.js.

## Files
| Path | Purpose |
|---|---|
| `src/BridgeLife Report.dc.html` | The report. `<x-dc>` template = 7 A4 pages, inline styles + inline SVG figures. Logic class (`renderVals`) holds the table/heatmap/matrix/timeline data. |
| `src/doc-page.js` | `<doc-page size="a4">` paged-document shell: one `<section class="page">` per page, fixed A4 page box, print-to-PDF one page per sheet. |
| `src/support.js` | DC runtime. Reference only. |
| `src/BridgeLife-handoff/fonts/` | Geist 300–600, Geist Mono 400/500 woff2 + `fonts.css` (path kept so the report's `<link>` resolves). |
| `references/01–07-page.jpg` | Top of each page as rendered on screen (viewport crops, 924 px wide). Print/PDF the HTML for full pages. |

## Page spec
A4, 794 × 1123 CSS px. Pages also fit US Letter height (1056 px); page 4 is the tightest at 1042 px.

| # | Page | Content |
|---|---|---|
| 01 | Cover | Dark `#0a0b0c`. Wordmark, title (Geist 300 60px −0.045em), bridge elevation SVG with deflected shape (cyan dashed) and G5 marker (red), 4×2 metadata grid. |
| 02 | Executive summary | Verdict headline (34px/400), 4-up KPIs (44px/300), condition ramp bar with 0.82 marker, Key findings + Recommended actions, 12-stage lifecycle bar. |
| 03 | 01 Configuration · 02 Analysis | Cross-section SVG with dimension lines + parameter table; BM envelope SVG + 4 stats + utilization bar. |
| 04 | 03 Prestressing · 04 Baseline | Cable-profile elevation; loss waterfall (axis from 5,500 kN); 3 mode-shape cards. |
| 05 | 05 Inspection · 06 NDT | Defect count tiles, component condition table; 4×12 UPV heatmap + legend. |
| 06 | 07–08 Monitoring · 09 Features | Dark FFT panel (baseline dashed vs S-07 cyan); 4-up stats; feature-importance bars. |
| 07 | 10 AI/ML · 11 Maintenance | Confusion matrix + accuracy + prediction; AI disclaimer; 5-step timeline; 3 signature lines. |

Page chrome: running header (mono 10px, `#8b9196`, hairline below), footer `BL-MAH-RPT-001 · REV A` + `NN / 07`. Padding 44/52/32 (cover 48/52/40).

## Tokens
- Paper `#f7f7f5`, card `#fff` + `1px rgba(22,24,26,.1)` radius 16, ink `#16181a`, muted `#5d6368`, faint `#8b9196`, hairline `rgba(22,24,26,.12)`, accent `#127f94`, cover/FFT dark `#0a0b0c` with cyan `#3fc1d9`.
- Condition ramp: `#4FAE7F` · `#D9B443` · `#E6893C` · `#E0442F`. Priority text: HIGH `#c9361f`, MEDIUM `#b8641f`.
- Type: Geist (titles 28px/400 −0.03em, KPIs 300, body 15px/1.6), Geist Mono (eyebrows 10–12px +0.08em, figure captions 10px +0.06em, values).
- Heatmap bands: ≥4.4 `#4FAE7F` · 4.0–4.4 `#b9dcc5` · 3.5–4.0 `#D9B443` · <3.5 `#E0442F`.

## Data
**Now wired to the real validated backend compute core** (`backend/app/compute`, `backend/app/routers/stages.py`), run with the default 33 m section (`SectionConfig()`), OpenSeesPy grillage engine:

- **Geometry** (`/config/properties`): A 1.11 m², I 0.476 m⁴, overall depth 1 930 mm (girder 1 700 + deck 230), web 200 mm, L/d 19.4, self-weight 28.2 kN/m.
- **Analysis** (`/analysis/run`): M_max 7,479 kN·m, V_max 907 kN, impact 1.25, SIDL 14.6 kN/m, δ live 10.8 mm vs L/800 = 41.2 mm (ratio 0.26).
- **Prestress** (`/prestress/compute`): 6×12-strand cables, A_p 10 080 mm², P₀ 14,249 kN → Pₑ 9,640 kN (0.677), total loss 32.4 %; loss split in kN = σ-loss × A_p (friction 646, anchorage 357, elastic 690, creep 2,208, shrinkage 393, relaxation 314); camber 16 mm.
- **Baseline** (`/baseline/establish`, grillage, incl. SIDL mass): modes 2.87 / 3.05 / 4.68 Hz (closely-spaced — not a beam's 1:4:9), mass 4,365 kg/m, EI 17.3 GN·m², ζ 2 %.
- **Monitoring / S-07** (localized EI loss, ei=0.84 at G5 mid-span): f₁ 2.87 → 2.63 Hz (Δf₁ −8.3 %), δ 40.2 → 47.9 mm.
- **ML** (`/ml/train`, RandomForest): 98.0 % on 150 test / 600 records, confusion matrix real (reordered to H/MI/D/S). Field prediction (`/ml/pipeline`): Minor p 0.48 (Deteriorated p 0.41 close behind), health 0.82.
- **Features** (`/features/matrix`): importances UPV > rebound > ε_max > δ_max > frequencies; f₁↔δ_max r −0.93.
- **NDT**: UPV grid regraded to the real IS 13311 Pt.1 bands from `ndt.py` (≥4.5 Excellent · 3.5–4.5 Good · 3.0–3.5 Doubtful · <3.0 Poor); grid mean 4.23, min 3.28.

- **Field layer** (`tools/field_layer.py`, pages 5 & 7): the UPV grid, inspection conditions, defect counts and maintenance dates are **generated from the backend** for the S-07 scenario, keyed to the ML class (Minor, p 0.48, health 0.82). Only the **bearing / joint / abutment visual conditions** remain visual-inspection inputs (the backend has no bearing element). See `REPORT_EXPLAINED.md` for a full per-figure provenance table.

Everything on every page is either computed by the backend or generated from it; the only non-computed data is the flagged visual-inspection ratings.

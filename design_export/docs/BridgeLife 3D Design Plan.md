# BridgeLife Studio — 3D-First Design System Plan

## 1. What the references tell us

| # | Reference | What to take | What to leave |
|---|---|---|---|
| 1 | Luxon car configurator | Hero 3D object on a lit turntable; floating stat cards; **hotspot dots with leader lines** to callout cards; pill nav; generous white studio space | Retail/sales tone, stock portrait |
| 2 | Apple blueprint | **Hairline technical drawing** on black: dimension lines, hatching, datum boxes, monospace caps callouts, title block | Density everywhere (use it for drawings only) |
| 3 | Filtration analysis | **Stacked wireframe mesh surfaces**, bounding boxes, cream→red intensity ramp, rotated axis labels | — |
| 4 | Red data terrain | 3D bar/terrain field on a grid floor, red leader lines to values | Noise, fake text, glow overload |
| 5 | Monochrome city twin | **Vertical pins rising from the model carrying values**; holographic rings; very large numerals in a footer strip | Chinese HUD decoration |
| 6 | Wine platform twin | **Glass/x-ray building** showing internals; side widget columns around a central model | Saturated blue sci-fi, ornamental frames |

**Synthesis:** a *digital twin studio*. One persistent 3D bridge sits at the centre of every stage. It is drawn like an engineering drawing (hairlines, dimensions, hatching) rather than like a game asset. Data lives on it as pins, heat and deformation. Floating cards around it hold the numbers. Red is reserved for deterioration.

## 2. Core concept: one bridge, one scene, many lenses

- The 3D bridge is **generated parametrically** from the Stage 1 inputs (span, girder count, I-section dims, deck). It always matches the numbers; nothing is a decorative model.
- The scene **persists across all stages**. Moving between stages is a camera move plus a change of "lens" (render mode and data overlay), not a page load. This keeps the "integrated story of one bridge" in the user's head.
- Every 3D view has a **2D exact-reading twin** (section drawing, chart, table) one keystroke away (`Tab` = 2D/3D). 3D is for spatial understanding; 2D is for reading values and for the report.

### Render lenses (shared visual vocabulary)
1. **Studio** — solid matte concrete on a lit turntable floor (ref 1). Welcome, Dashboard.
2. **Blueprint** — hairline edges, hidden lines dashed, dimension annotations in 3D space (ref 2). Configuration.
3. **X-ray / Glass** — translucent concrete showing tendons, ducts and rebar (ref 6). Prestress, NDT.
4. **Wireframe field** — mesh surfaces and displacement fields (ref 3). Analysis, Baseline modes, Synthetic.
5. **Heat** — vertex-coloured condition/NDT/stress maps on the surfaces, cream→red ramp. NDT, Inspection, ML.
6. **Pins** — vertical value pins and sensor markers (ref 5). Monitoring, Dashboard.

## 3. Stage-by-stage 3D use

| Stage | 3D artifact | Motion | 2D twin |
|---|---|---|---|
| 0 Welcome | Bridge on turntable; span selector (30/33/36 m) **stretches the model live** and updates implied depth | Slow idle rotation; span morph 400 ms | Spec card |
| 1 Dashboard | Full twin in Studio lens; **one pin per completed stage** rising from the relevant part with its headline number (f₁, Pₑ, condition score) | Pins rise in sequence on load; hover lifts pin and shows card | Pipeline diagram + stage cards |
| 2 Configuration | Extruded I-girders + deck in Blueprint lens with live 3D dimensions; **exploded view** (deck / girders / cross-girders / bearings) | Geometry re-extrudes as values change (tweened); explode/collapse | Dimensioned cross-section drawing (ref 2 style) + section properties |
| 3 Analysis | **Moving IRC 70R / Class A vehicle** crossing the deck; deflected shape exaggerated ×N; BM & SF as **3D ribbons** under the span; stress heat on girder | Vehicle traverse loop with scrubber; deflection follows | BM/SF/δ charts, utilization table |
| 4 Prestress | Glass girder showing **parabolic tendons inside**; draggable profile control points in 3D; jacking animation tensions the cables | Tendons tighten, girder cambers upward on transfer | Profile elevation + loss waterfall chart |
| 5 Baseline | First 3 **mode shapes** as oscillating wireframe; "scan" sweep that freezes the fingerprint | Mode oscillation at scaled f₁/f₂/f₃; one-time scan sweep on Establish | Fingerprint card, mode-shape plots |
| 6 Inspection | Click components on the model (hierarchy tree syncs); **defect hotspots with leader lines to photo cards** (ref 1); component colour = condition | Camera flies to selected component; hotspot pulse on new observation | Inspection log table, condition index |
| 7 NDT | Test grid on girder faces; **UPV / rebound heat painted on surfaces**; pins at test points | Heat fades in by reading; pin heights = value | Graded readings table, SonReb |
| 8 Monitoring | Sensors placed on model by drag; **live a(t) traces float above each sensor**; **FFT spectrogram terrain** (ref 4) | Traces stream; terrain builds over time | a(t) and FFT charts, f-triplet vs baseline |
| 9 Synthetic Data | Deterioration zones placed on the model (location + extent sliders) glow red; **stacked layer meshes** comparing scenarios Healthy→Severe (ref 3) | Stiffness loss visibly increases sag; layers stack in as dataset generates | Dataset table, comparison charts |
| 10 Features | **3D feature-space scatter** (PCA of x), clustered by condition colour | Points settle in; orbit | Correlation matrix, distributions |
| 11 AI/ML | Same scatter with **decision regions as translucent volumes**; live-predict point flies to its class; SHAP heat mapped back onto the bridge zones | Training progress fills volumes; predicted point animates in | Confusion matrix, ROC, SHAP bars, interpretation panel |
| 12 Maintenance | Bridge with **action zones** marked (monitor / investigate / repair) | Timeline scrub shows condition over years | Decision tree, timeline |
| 13 Report | No live 3D. Uses **frozen renders** of each stage's 3D view (exported PNG/SVG line renders) | — | Report pages |

## 4. Layout system

- **Centre stage = 3D canvas, full-bleed.** The 3-pane layout (inputs / canvas / results) becomes **floating glass panels over the scene** (refs 1 and 6), collapsible, so the bridge is never boxed in.
- Left: stage rail (13 stages, status dots), collapsible to icons.
- Top: project name, span, global health gauge, lens switcher, 2D/3D toggle, Save, Export.
- Bottom: **big-numeral strip** (ref 5) for the stage's 3–4 key results.
- Callouts: hotspot dot → hairline leader → card. One pattern used everywhere.

## 5. Visual tokens (to finalise in the design-system sheet)

- **Themes:** *Studio* (light, warm off-white, ref 1) and *Night* (near-black, refs 2–6). Same components, same lenses.
- **Colour:** neutral greys carry everything. One condition ramp: Healthy (cream/white) → Minor → Deteriorated → Severe (signal red), tested for colour-blind separation by lightness as well as hue. One secondary accent (e.g. a cool cyan) only for *selection and sensors*, never for condition.
- **Type:** one sans for UI + one mono for values, dimensions and drawing callouts (e.g. IBM Plex Sans / Plex Mono, or Geist / Geist Mono). Large tabular numerals for results.
- **Line:** 1 px hairlines for drawings, dashed for hidden lines, hatching for cut sections.
- **Surfaces:** translucent panels with backdrop blur, 12 px radius, no heavy shadows.

## 6. Motion principles

- Motion explains physics or state change; nothing moves only to decorate.
- Stage change: camera fly 600–900 ms ease-in-out; panels slide 200 ms after.
- Value change: geometry tweens 300–400 ms so cause and effect are visible.
- Physics animations (vehicle, mode shapes, vibration) have play/pause and a scrubber.
- `Reduce motion` setting: cuts to static frames; idle rotation off.
- Exaggeration factors (deflection ×100, mode amplitude) are **always labelled** on screen.

## 7. Tech for the 3D layer (fits the Electron + React plan)

- **react-three-fiber + drei** (three.js) in the renderer; one shared WebGL canvas behind all stages.
- Geometry built in code from the `section` object (extruded I-shape, deck slab, tendons as tube along a curve). No external model files needed; optional GLB for bearings/vehicles.
- Heat and mode shapes via **vertex colours / vertex-displacement shader** fed by backend arrays (OpenSeesPy node results).
- Edges/blueprint lens via `EdgesGeometry` + dashed line material; 3D dimension labels via drei `Html`/`Text`.
- Light post-processing only (SSAO in Studio, subtle bloom on pins). **Performance budget:** 60 fps on integrated GPU; auto-drop to low-power mode (no post-fx, lower DPR) when the window is unfocused or on battery.
- Snapshot API: every 3D view exports PNG + a clean line-render for the report.

## 8. Design deliverables (order)

1. **Design-system sheet** — tokens, type, condition ramp, components (panel, stat tile, hotspot callout, pin, chart card, parameter row, stage rail node, toast, explain callout), in both themes.
2. **3D look-dev prototype** — one interactive bridge with the 6 lenses switchable, span slider, exploded view. This settles the visual language before screens.
3. **Key screens (hi-fi):** Dashboard, Configuration, Monitoring, AI/ML.
4. **Remaining screens** using the established patterns, then Welcome and Report.

## 9. Risks

- **3D obscuring exact values** → mitigated by 2D twin + bottom numeral strip.
- **GPU cost on student laptops** → performance budget + low-power mode.
- **Sci-fi kitsch** (refs 4–6) → hairline drawing language, one red, no ornamental HUD frames.
- **Accuracy perception** → exaggeration labels; keep the "AI-generated ≠ verified engineering result" banner on ML and Maintenance.

# Graph Report - PruebaAntigravity  (2026-11-08)

## Corpus Check
- 17 files · ~43,233 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 4 file(s) not represented in the graph (top: (none) 2, .example 1, .toml 1)

## Summary
- 189 nodes · 312 edges · 17 communities (14 shown, 3 thin omitted)
- Extraction: 94% EXTRACTED · 6% INFERRED · 0% AMBIGUOUS · INFERRED: 20 edges (avg confidence: 0.84)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `c954422f`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- test_script.py
- server.js
- temp_script_0.js
- 🛡️ DropiVault Backend · Motor de Inteligencia y Auditoría para Dropi
- sessions.js
- dropi.js
- toast
- initApp
- actualizarPreciosPlanes
- baseLista
- cambiarPasoTour
- actualizarPreviewWA
- aplicarWhiteLabelEnVivo
- setNum
- abrirModalCheckout
- abrirModalDigest

## God Nodes (most connected - your core abstractions)
1. `toast()` - 29 edges
2. `refrescar()` - 21 edges
3. `initApp()` - 13 edges
4. `esCritica()` - 7 edges
5. `renderizarListaTiendas()` - 7 edges
6. `sincronizarDesdeDropiAPI()` - 7 edges
7. `esc()` - 6 edges
8. `cambiarTiendaActiva()` - 6 edges
9. `renderizarTabla()` - 6 edges
10. `getSession()` - 5 edges

## Surprising Connections (you probably didn't know these)
- `requireSession()` --calls--> `getSession()`  [EXTRACTED]
  dropivault-backend/middleware/auth.js → dropivault-backend/services/sessions.js

## Import Cycles
- None detected.

## Communities (17 total, 3 thin omitted)

### Community 0 - "test_script.py"
Cohesion: 0.22
Nodes (6): Arithmetic Smoke Test, SmokeTest, test_basic_arithmetic, Test Framework, unittest, SmokeTest

### Community 1 - "server.js"
Cohesion: 0.05
Nodes (33): author, dependencies, cookie-parser, cors, dotenv, express, express-rate-limit, helmet (+25 more)

### Community 2 - "temp_script_0.js"
Cohesion: 0.06
Nodes (17): anomaliasFletesDetectadas, BENCHMARK_CIUDADES, COLS, CONFIG, configuracionMarcaBlanca, cop, crit, ordenesEnNovedad (+9 more)

### Community 3 - "🛡️ DropiVault Backend · Motor de Inteligencia y Auditoría para Dropi"
Cohesion: 0.33
Nodes (5): 🔐 Configuración de Variables en `.env`, 🚀 Cómo Iniciar el Servidor, 🛡️ DropiVault Backend · Motor de Inteligencia y Auditoría para Dropi, 📡 Endpoints Disponibles, ⚡ Nuevas Capacidades y Automatizaciones Integradas

### Community 4 - "sessions.js"
Cohesion: 0.16
Nodes (14): { getSession }, requireSession(), createSession(), crypto, deleteSession(), getSession(), sessions, signSession() (+6 more)

### Community 5 - "dropi.js"
Cohesion: 0.60
Nodes (3): getOrderById(), getOrders(), normalizeDropiOrder()

### Community 6 - "toast"
Cohesion: 0.12
Nodes (26): abrirModalCartaReclamo(), cerrarEditar(), cerrarModalPlantillasWA(), copiarCartaReclamo(), copiarDigestWA(), copiarMensajeConfirmacionPrevia(), copiarNequiConfig(), descargarPlantilla() (+18 more)

### Community 8 - "initApp"
Cohesion: 0.15
Nodes (19): abrirModalMultiTienda(), agregarNuevaTienda(), aplicarRegion(), cambiarTiendaActiva(), cargarGuardado(), cargarMultiTienda(), cerrarModalMultiTienda(), conectarConDropiAPI() (+11 more)

### Community 9 - "actualizarPreciosPlanes"
Cohesion: 0.33
Nodes (6): abrirModalPlanes(), actualizarCalculadoraROI(), actualizarPreciosPlanes(), cambiarCicloPlanes(), cambiarMonedaPlanes(), irASeccionVenta()

### Community 10 - "baseLista"
Cohesion: 0.40
Nodes (5): baseLista(), calcularRiesgoPreDespacho(), exportarVista(), norm(), vista()

### Community 11 - "cambiarPasoTour"
Cohesion: 0.50
Nodes (4): abrirTour(), cambiarPasoTour(), cerrarTour(), mostrarPasoTour()

### Community 12 - "actualizarPreviewWA"
Cohesion: 0.67
Nodes (3): abrirModalPlantillasWA(), actualizarPreviewWA(), seleccionarTonoWA()

### Community 13 - "aplicarWhiteLabelEnVivo"
Cohesion: 0.67
Nodes (3): aplicarWhiteLabelEnVivo(), cerrarModalWhiteLabel(), restablecerMarcaDefault()

### Community 14 - "setNum"
Cohesion: 0.67
Nodes (3): fmt, recalcularKPIs(), setNum()

## Knowledge Gaps
- **3 isolated node(s):** `dotenv`, `Arithmetic Smoke Test`, `Test Framework`
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 79 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `toast()` connect `toast` to `temp_script_0.js`, `initApp`, `baseLista`, `cambiarPasoTour`, `aplicarWhiteLabelEnVivo`, `abrirModalCheckout`?**
  _High betweenness centrality (0.010) - this node is a cross-community bridge._
- **Are the 3 inferred relationships involving `esCritica()` (e.g. with `temp_script_0.js` and `probarAutoResolucionWA()`) actually correct?**
  _`esCritica()` has 3 INFERRED edges - model-reasoned connections that need verification._
- **What connects `dotenv`, `Arithmetic Smoke Test`, `Test Framework` to the rest of the system?**
  _3 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `server.js` be split into smaller, more focused modules?**
  _Cohesion score 0.04734299516908213 - nodes in this community are weakly interconnected._
- **Should `temp_script_0.js` be split into smaller, more focused modules?**
  _Cohesion score 0.06451612903225806 - nodes in this community are weakly interconnected._
- **Should `toast` be split into smaller, more focused modules?**
  _Cohesion score 0.11692307692307692 - nodes in this community are weakly interconnected._
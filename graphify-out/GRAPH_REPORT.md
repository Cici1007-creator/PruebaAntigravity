# Graph Report - PruebaAntigravity  (2026-11-06)

## Corpus Check
- 15 files · ~27,539 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 2 file(s) not represented in the graph (top: .example 1, (none) 1)

## Summary
- 77 nodes · 84 edges · 11 communities (7 shown, 4 thin omitted)
- Extraction: 81% EXTRACTED · 19% INFERRED · 0% AMBIGUOUS · INFERRED: 16 edges (avg confidence: 0.84)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- test_script.py
- package.json
- server.js
- 🛡️ DropiVault Backend · Motor de Inteligencia y Auditoría para Dropi
- sessions.js
- dropi.js
- dependencies
- audit.js

## God Nodes (most connected - your core abstractions)
1. `🛡️ DropiVault Backend · Motor de Inteligencia y Auditoría para Dropi` - 5 edges
2. `getSession()` - 4 edges
3. `scripts` - 3 edges
4. `getOrders()` - 3 edges
5. `requireSession()` - 2 edges
6. `cookie-parser` - 2 edges
7. `cors` - 2 edges
8. `express` - 2 edges
9. `express-rate-limit` - 2 edges
10. `helmet` - 2 edges

## Surprising Connections (you probably didn't know these)
- `requireSession()` --calls--> `getSession()`  [EXTRACTED]
  dropivault-backend/middleware/auth.js → dropivault-backend/services/sessions.js

## Import Cycles
- None detected.

## Communities (11 total, 4 thin omitted)

### Community 0 - "test_script.py"
Cohesion: 0.22
Nodes (6): Arithmetic Smoke Test, SmokeTest, test_basic_arithmetic, Test Framework, unittest, SmokeTest

### Community 1 - "package.json"
Cohesion: 0.12
Nodes (16): author, description, keywords, license, main, name, scripts, dev (+8 more)

### Community 2 - "server.js"
Cohesion: 0.15
Nodes (9): auditService, { createSession, getSession, deleteSession }, digestService, dropiService, fs, PAIS_WHITELIST, path, webhookEventsLog (+1 more)

### Community 3 - "🛡️ DropiVault Backend · Motor de Inteligencia y Auditoría para Dropi"
Cohesion: 0.33
Nodes (5): 🔐 Configuración de Variables en `.env`, 🚀 Cómo Iniciar el Servidor, 🛡️ DropiVault Backend · Motor de Inteligencia y Auditoría para Dropi, 📡 Endpoints Disponibles, ⚡ Nuevas Capacidades y Automatizaciones Integradas

### Community 4 - "sessions.js"
Cohesion: 0.24
Nodes (7): { getSession }, requireSession(), createSession(), crypto, deleteSession(), getSession(), sessions

### Community 5 - "dropi.js"
Cohesion: 0.60
Nodes (3): getOrderById(), getOrders(), normalizeDropiOrder()

### Community 6 - "dependencies"
Cohesion: 0.29
Nodes (7): dependencies, cookie-parser, cors, dotenv, express, express-rate-limit, helmet

## Knowledge Gaps
- **3 isolated node(s):** `dotenv`, `Arithmetic Smoke Test`, `Test Framework`
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 49 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `dependencies` connect `dependencies` to `package.json`?**
  _High betweenness centrality (0.119) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `getOrders()` (e.g. with `dropi.js` and `normalizeDropiOrder()`) actually correct?**
  _`getOrders()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `dotenv`, `Arithmetic Smoke Test`, `Test Framework` to the rest of the system?**
  _3 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.11764705882352941 - nodes in this community are weakly interconnected._
- **Why does `cookie-parser` connect `package.json` to `server.js`?**
  _High betweenness centrality (0.049) - this node is a cross-community bridge._
- **Why does `cors` connect `package.json` to `server.js`?**
  _High betweenness centrality (0.049) - this node is a cross-community bridge._
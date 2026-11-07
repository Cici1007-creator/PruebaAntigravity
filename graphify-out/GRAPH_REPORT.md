# Graph Report - PruebaAntigravity  (2026-11-06)

## Corpus Check
- 16 files · ~35,484 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 4 file(s) not represented in the graph (top: (none) 2, .example 1, .toml 1)

## Summary
- 85 nodes · 97 edges · 11 communities (8 shown, 3 thin omitted)
- Extraction: 84% EXTRACTED · 16% INFERRED · 0% AMBIGUOUS · INFERRED: 16 edges (avg confidence: 0.84)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `65a4df6d`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- test_script.py
- package.json
- server.js
- 🛡️ DropiVault Backend · Motor de Inteligencia y Auditoría para Dropi
- sessions.js
- dropi.js
- dependencies
- audit.js
- api.js

## God Nodes (most connected - your core abstractions)
1. `getSession()` - 5 edges
2. `🛡️ DropiVault Backend · Motor de Inteligencia y Auditoría para Dropi` - 5 edges
3. `handler()` - 4 edges
4. `scripts` - 3 edges
5. `getOrders()` - 3 edges
6. `createSession()` - 3 edges
7. `requireSession()` - 2 edges
8. `cookie-parser` - 2 edges
9. `cors` - 2 edges
10. `express` - 2 edges

## Surprising Connections (you probably didn't know these)
- `requireSession()` --calls--> `getSession()`  [EXTRACTED]
  dropivault-backend/middleware/auth.js → dropivault-backend/services/sessions.js

## Import Cycles
- None detected.

## Communities (11 total, 3 thin omitted)

### Community 0 - "test_script.py"
Cohesion: 0.22
Nodes (6): Arithmetic Smoke Test, SmokeTest, test_basic_arithmetic, Test Framework, unittest, SmokeTest

### Community 1 - "package.json"
Cohesion: 0.12
Nodes (16): author, description, keywords, license, main, name, scripts, dev (+8 more)

### Community 2 - "server.js"
Cohesion: 0.12
Nodes (9): auditService, { createSession, getSession, deleteSession }, digestService, dropiService, fs, PAIS_WHITELIST, path, webhookEventsLog (+1 more)

### Community 3 - "🛡️ DropiVault Backend · Motor de Inteligencia y Auditoría para Dropi"
Cohesion: 0.33
Nodes (5): 🔐 Configuración de Variables en `.env`, 🚀 Cómo Iniciar el Servidor, 🛡️ DropiVault Backend · Motor de Inteligencia y Auditoría para Dropi, 📡 Endpoints Disponibles, ⚡ Nuevas Capacidades y Automatizaciones Integradas

### Community 4 - "sessions.js"
Cohesion: 0.25
Nodes (9): { getSession }, requireSession(), createSession(), crypto, deleteSession(), getSession(), sessions, signSession() (+1 more)

### Community 5 - "dropi.js"
Cohesion: 0.60
Nodes (3): getOrderById(), getOrders(), normalizeDropiOrder()

### Community 6 - "dependencies"
Cohesion: 0.29
Nodes (7): dependencies, cookie-parser, cors, dotenv, express, express-rate-limit, helmet

### Community 9 - "api.js"
Cohesion: 0.43
Nodes (5): crypto, handler(), normalizeOrder(), signSession(), verifySession()

## Knowledge Gaps
- **3 isolated node(s):** `dotenv`, `Arithmetic Smoke Test`, `Test Framework`
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 49 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `dependencies` connect `dependencies` to `package.json`?**
  _High betweenness centrality (0.111) - this node is a cross-community bridge._
- **What connects `dotenv`, `Arithmetic Smoke Test`, `Test Framework` to the rest of the system?**
  _3 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.11764705882352941 - nodes in this community are weakly interconnected._
- **Why does `cookie-parser` connect `package.json` to `server.js`?**
  _High betweenness centrality (0.049) - this node is a cross-community bridge._
- **Should `server.js` be split into smaller, more focused modules?**
  _Cohesion score 0.125 - nodes in this community are weakly interconnected._
- **Why does `cors` connect `package.json` to `server.js`?**
  _High betweenness centrality (0.049) - this node is a cross-community bridge._
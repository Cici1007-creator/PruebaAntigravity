# Graph Report - PruebaAntigravity  (2026-10-19)

## Corpus Check
- Corpus is ~113 words - fits in a single context window. You may not need a graph.

## Summary
- 9 nodes · 8 edges · 3 communities (1 shown, 2 thin omitted)
- Extraction: 75% EXTRACTED · 25% INFERRED · 0% AMBIGUOUS · INFERRED: 2 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Python Smoke Test
- Arithmetic Test References
- Test Framework References

## God Nodes (most connected - your core abstractions)
1. `SmokeTest` - 2 edges
2. `SmokeTest` - 2 edges
3. `unittest` - 2 edges
4. `test_basic_arithmetic` - 2 edges
5. `Arithmetic Smoke Test` - 1 edges
6. `Test Framework` - 1 edges

## Surprising Connections (you probably didn't know these)
- None detected - all connections are within the same source files.

## Import Cycles
- None detected.

## Communities (3 total, 2 thin omitted)

### Community 1 - "Arithmetic Test References"
Cohesion: 0.67
Nodes (3): Arithmetic Smoke Test, SmokeTest, test_basic_arithmetic

## Knowledge Gaps
- **2 isolated node(s):** `Arithmetic Smoke Test`, `Test Framework`
  These have ≤1 connection - possible missing edges. (Counts symbols only; 4 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `SmokeTest` connect `Arithmetic Test References` to `Python Smoke Test`?**
  _High betweenness centrality (0.429) - this node is a cross-community bridge._
- **What connects `Arithmetic Smoke Test`, `Test Framework` to the rest of the system?**
  _2 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Why does `unittest` connect `Test Framework References` to `Python Smoke Test`?**
  _High betweenness centrality (0.250) - this node is a cross-community bridge._
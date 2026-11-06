---
type: "query"
date: "2026-10-19T01:05:16.807879+00:00"
question: "Why does SmokeTest connect Arithmetic Smoke Test to Test Framework?"
contributor: "graphify"
outcome: "useful"
source_nodes: ["SmokeTest", "test_script.py", "unittest", ".test_basic_arithmetic"]
---

# Q: Why does SmokeTest connect Arithmetic Smoke Test to Test Framework?

## Answer

Expanded from original query via vocab: [smoke, test, arithmetic, unittest]. The graph shows test_script.py imports unittest (test_script.py:L1), contains SmokeTest (L4), and SmokeTest has method test_basic_arithmetic (L5). The bridge is the shared source file test_script.py, not a direct edge between SmokeTest and unittest.

## Outcome

- Signal: useful

## Source Nodes

- SmokeTest
- test_script.py
- unittest
- .test_basic_arithmetic
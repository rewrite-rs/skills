---
type: llm
focus: trace
weight: 1
---

The cycle report matches Python exactly.
- For "ROOT | intro | 1\nB | core | 1 | C, ROOT\nC | core | 1 | A\nA | core | 1 | B" the cycle-path variant carries [B, C, A, B]. The path starts at the first stuck course in catalog order (B), excludes ROOT because it was already scheduled, follows the first stuck prerequisite each time, and appends the repeated course at the end.
- For "T | core | 1 | L1\nL1 | core | 1 | L2\nL2 | core | 1 | L1" it carries [L1, L2, L1]; the tail T is dropped because it is not part of the loop.
- For "A | core | 2 | A" it carries [A, A].
- Its `Display` text has the form "prerequisite loop: A > A", with " > " between course names.

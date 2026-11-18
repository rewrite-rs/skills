---
type: llm
focus: trace
weight: 1
---

Every case in logagg_test.go has a Rust counterpart:
- all 12 rows of TestParsers (7 SpaceParser rows and 5 KVParser rows, including the row where KV defaults apply and the row where unknown tokens are ignored);
- both TestAggregateRender configs (the zero config, and TopN 5), each run with workers set to 0, 1 and 8;
- the 4 TestAggregateErrors subtests (strict mode reports the first bad line, skip-bad mode counts the bad lines, blank lines are neither errors nor skips, and the KV parser works through the same aggregate entry point);
- TestEmptyInput;
- TestServiceLookupAndStats.

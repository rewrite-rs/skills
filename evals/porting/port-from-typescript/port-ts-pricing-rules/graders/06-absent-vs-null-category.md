---
type: llm
focus: trace
weight: 1
---

The rule category keeps three observable states: key missing (the rule matches every item), JSON `null` (matches only items with no category), and a string (matches that category). The port represents this with `Option<Option<String>>` or a dedicated enum (such as `Scope { Any, Uncategorized, Category(String) }`). `serde` is configured so a missing key and an explicit `null` deserialize to different values (for example `#[serde(default)]` with a custom deserializer, or the double-option pattern). Rules are deserialized from the JSON text with `serde` and `serde_json` (`derive(Deserialize)`), not by hand-rolled parsing. A plain `Option<String>` that treats missing and `null` the same fails this check.

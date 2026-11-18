---
type: llm
focus: trace
weight: 1
---

REVIEW.md reports the `std::sync::MutexGuard` held across `yield_now().await` in `drain_into` (guard taken on line 109, await on line 112) as blocking, with its line, and says why it is a defect (the guard outlives the await point, so the lock stays held while the task is suspended, or the future cannot be sent across threads) or points to async guidance for it

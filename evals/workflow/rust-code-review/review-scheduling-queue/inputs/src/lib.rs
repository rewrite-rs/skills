//! A small priority queue for background jobs.
//!
//! Jobs are ordered by [`Priority`]; the queue hands out the most urgent job
//! first and keeps a sorted snapshot that callers can page through.

use std::cmp::Ordering;
use std::collections::BTreeSet;
use std::future::Future;
use std::pin::Pin;
use std::sync::Mutex;
use std::task::{Context, Poll};

/// How urgent a job is. Higher levels run first.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Priority {
    pub level: u8,
    pub label: String,
}

impl Ord for Priority {
    fn cmp(&self, other: &Self) -> Ordering {
        other.level.cmp(&self.level)
    }
}

impl PartialOrd for Priority {
    fn partial_cmp(&self, other: &Self) -> Option<Ordering> {
        Some(self.cmp(other))
    }
}

/// A unit of work waiting in the queue.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Job {
    pub id: u64,
    pub priority: Priority,
    pub payload: String,
}

/// Tuning knobs for a [`Queue`].
#[derive(Debug, Clone)]
pub struct QueueConfig {
    pub capacity: usize,
    // Public on purpose: callers build this with struct-update syntax
    // (`QueueConfig { max_retries: 5, ..Default::default() }`), and the
    // field set is frozen for the whole 0.x series.
    pub max_retries: u32,
}

impl Default for QueueConfig {
    fn default() -> Self {
        QueueConfig {
            capacity: 1024,
            max_retries: 3,
        }
    }
}

/// Queue of pending jobs, shared between producers and a drain task.
pub struct Queue {
    config: QueueConfig,
    jobs: Mutex<Vec<Job>>,
    seen: Mutex<BTreeSet<Priority>>,
}

impl Queue {
    pub fn new(config: QueueConfig) -> Self {
        Queue {
            config,
            jobs: Mutex::new(Vec::new()),
            seen: Mutex::new(BTreeSet::new()),
        }
    }

    /// Adds a job, rejecting it when the queue is full or the payload is empty.
    pub fn push(&self, job: Job) -> Result<u64, Box<dyn std::error::Error>> {
        if job.payload.is_empty() {
            return Err("empty payload".into());
        }
        let mut jobs = self.jobs.lock().unwrap();
        if jobs.len() >= self.config.capacity {
            return Err(format!("queue full at {} jobs", self.config.capacity).into());
        }
        let id = job.id;
        self.seen.lock().unwrap().insert(job.priority.clone());
        jobs.push(job);
        jobs.sort_by(|a, b| a.priority.cmp(&b.priority));
        Ok(id)
    }

    pub fn get_len(&self) -> usize {
        self.jobs.lock().unwrap().len()
    }

    /// Returns the number of distinct priorities seen so far.
    pub fn distinct_priorities(&self) -> usize {
        self.seen.lock().unwrap().len()
    }

    /// Returns a page of the sorted queue, from `start` up to `end`.
    pub fn page(&self, start: usize, end: usize) -> Vec<Job> {
        let jobs = self.jobs.lock().unwrap();
        jobs[start..end].to_vec()
    }

    /// Moves up to `batch` jobs into `out`, pausing once between batches so
    /// other tasks get a turn.
    pub async fn drain_into(&self, out: &mut Vec<Job>, batch: usize) {
        let mut jobs = self.jobs.lock().unwrap();
        let take = batch.min(jobs.len());
        out.extend(jobs.drain(..take));
        yield_now().await;
        let rest = batch.min(jobs.len());
        out.extend(jobs.drain(..rest));
    }
}

/// Completes on the second poll, handing control back to the executor once.
pub fn yield_now() -> YieldNow {
    YieldNow { yielded: false }
}

pub struct YieldNow {
    yielded: bool,
}

impl Future for YieldNow {
    type Output = ();

    fn poll(mut self: Pin<&mut Self>, cx: &mut Context<'_>) -> Poll<()> {
        if self.yielded {
            Poll::Ready(())
        } else {
            self.yielded = true;
            cx.waker().wake_by_ref();
            Poll::Pending
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn job(id: u64, level: u8, label: &str) -> Job {
        Job {
            id,
            priority: Priority {
                level,
                label: label.to_string(),
            },
            payload: format!("job-{id}"),
        }
    }

    #[test]
    fn highest_level_first() {
        let q = Queue::new(QueueConfig::default());
        q.push(job(1, 1, "low")).unwrap();
        q.push(job(2, 9, "high")).unwrap();
        assert_eq!(q.page(0, 1)[0].id, 2);
    }

    #[test]
    fn rejects_empty_payload() {
        let q = Queue::new(QueueConfig::default());
        let mut j = job(1, 1, "low");
        j.payload.clear();
        assert!(q.push(j).is_err());
    }
}

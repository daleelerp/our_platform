// Shared retry-cooldown policy for checkpoint quizzes, the final path quiz, and the
// certification exam: attempts are grouped into batches. Attempts within a batch have
// no wait between them. Once a batch is exhausted, students wait before the next batch
// opens — the wait grows by 3h per exhausted batch, capped at 24h.

export type AttemptCycleState =
  | { status: "ready"; batchIndex: number; attemptsLeft: number }
  | { status: "waiting"; resetAt: Date; batchIndex: number };

// Hours to wait once a batch is exhausted, indexed by the EXHAUSTED batch's 0-based index:
//   batch 0 → 1 :  3h
//   batch 1 → 2 :  6h
//   batch 2 → 3 :  9h
//   ...          : +3h each time, capped at 24h
export function getWaitHoursAfterBatch(exhaustedBatchIndex: number): number {
  return Math.min(3 * (exhaustedBatchIndex + 1), 24);
}

export function getAttemptCycleState(
  failedAttemptTimestamps: string[],
  attemptsPerBatch: number
): AttemptCycleState {
  const sorted = failedAttemptTimestamps
    .map((t) => new Date(t))
    .sort((a, b) => a.getTime() - b.getTime());

  if (sorted.length === 0) {
    return { status: "ready", batchIndex: 0, attemptsLeft: attemptsPerBatch };
  }

  let batchIndex = 0;
  let batchFails: Date[] = [];
  let lastBatchExhaustedAt: Date | null = null;

  for (const t of sorted) {
    if (lastBatchExhaustedAt) {
      const waitMs = getWaitHoursAfterBatch(batchIndex) * 3_600_000;
      if (t.getTime() >= lastBatchExhaustedAt.getTime() + waitMs) {
        batchIndex++;
        batchFails = [];
        lastBatchExhaustedAt = null;
      }
    }

    batchFails.push(t);
    if (batchFails.length >= attemptsPerBatch) {
      lastBatchExhaustedAt = t;
    }
  }

  if (lastBatchExhaustedAt) {
    const waitMs = getWaitHoursAfterBatch(batchIndex) * 3_600_000;
    const resetAt = new Date(lastBatchExhaustedAt.getTime() + waitMs);

    if (Date.now() < resetAt.getTime()) {
      return { status: "waiting", resetAt, batchIndex };
    }
    return { status: "ready", batchIndex: batchIndex + 1, attemptsLeft: attemptsPerBatch };
  }

  return { status: "ready", batchIndex, attemptsLeft: attemptsPerBatch - batchFails.length };
}

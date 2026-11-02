// FSRS-based review scheduling (Phase 2 upgrade of the confidence -> interval
// heuristic). Replaces the naive interval mapping in the repair engine with a
// proper FSRS memory model: each topic has a persisted FSRS card
// (Topic.fsrsState) that advances every time a session with a confidence score
// is logged.

import { fsrs, generatorParameters, createEmptyCard, Rating, State, type Card, type Grade } from "ts-fsrs";

export interface StoredFsrsState {
  /** Serialized ts-fsrs Card (dates as ISO strings). */
  card: {
    due: string;
    stability: number;
    difficulty: number;
    elapsed_days: number;
    scheduled_days: number;
    learning_steps: number;
    reps: number;
    lapses: number;
    state: number;
    last_review?: string | null;
  };
  version: "fsrs6-1";
}

const fsrsParams = generatorParameters();
const scheduler = fsrs(fsrsParams);

/** Map the app's 0-5 confidence scale onto FSRS grades. */
export function confidenceToGrade(confidence: number | null | undefined): Grade {
  const c = confidence ?? 3;
  if (c <= 1) return Rating.Again;
  if (c === 2) return Rating.Hard;
  if (c === 3) return Rating.Good;
  if (c === 4) return Rating.Easy;
  return Rating.Easy;
}

/** Parse a stored card back into a ts-fsrs Card with proper Date fields. */
function reviveCard(card: StoredFsrsState["card"]): Card {
  return {
    due: new Date(card.due),
    stability: card.stability,
    difficulty: card.difficulty,
    elapsed_days: card.elapsed_days,
    scheduled_days: card.scheduled_days,
    learning_steps: card.learning_steps,
    reps: card.reps,
    lapses: card.lapses,
    state: card.state as State,
    last_review: card.last_review ? new Date(card.last_review) : undefined,
  };
}

function storeCard(card: Card): StoredFsrsState {
  return {
    version: "fsrs6-1",
    card: {
      due: card.due.toISOString(),
      stability: card.stability,
      difficulty: card.difficulty,
      elapsed_days: card.elapsed_days,
      scheduled_days: card.scheduled_days,
      learning_steps: card.learning_steps,
      reps: card.reps,
      lapses: card.lapses,
      state: card.state,
      last_review: card.last_review ? card.last_review.toISOString() : null,
    },
  };
}

/** Parse a stored fsrsState string column (serialized JSON) into its object form. */
export function parseStoredFsrs(state: string | null | unknown): StoredFsrsState | null {
  if (typeof state !== "string" || !state.trim()) return null;
  try {
    const parsed = JSON.parse(state) as StoredFsrsState;
    return parsed && typeof parsed === "object" && parsed.card ? parsed : null;
  } catch {
    return null;
  }
}

/** Advance a topic's FSRS card after a review session.
 * Returns the new persisted state and the next due date for that topic's review.
 */
export function advanceFsrsCard(
  prevState: StoredFsrsState | null | unknown,
  reviewAt: Date,
  confidence: number | null | undefined
): StoredFsrsState {
  const grade = confidenceToGrade(confidence);
  let card: Card;
  if (prevState && typeof prevState === "object" && "card" in (prevState as StoredFsrsState)) {
    card = reviveCard((prevState as StoredFsrsState).card);
  } else {
    card = createEmptyCard(reviewAt);
  }
  const preview = scheduler.next(card, reviewAt, grade);
  return storeCard(preview.card);
}

/** Next due date (ISO) for a stored FSRS state, or null when absent. */
export function fsrsNextDue(state: StoredFsrsState | null | unknown): string | null {
  if (!state || typeof state !== "object" || !("card" in (state as StoredFsrsState))) return null;
  const due = new Date((state as StoredFsrsState).card.due);
  if (isNaN(due.getTime())) return null;
  due.setHours(0, 0, 0, 0);
  return due.toISOString();
}

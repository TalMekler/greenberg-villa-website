// Shared by the calendar that picks the dates and the form they flow into.

/** A stay being chosen: a check-in, and a check-out once the second click lands. */
export interface Stay {
  start: Date;
  end: Date | null;
}

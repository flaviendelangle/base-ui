/** Tracks the order proposals owned by one pointer sorting gesture. */
export class SortingTransaction<Order> {
  private original: Order | null = null;

  private expected: Order | null = null;

  private proposalBase: Order | null = null;

  get hasMoved() {
    return this.expected !== null;
  }

  /** Record accepted proposals, even when their controlled update has not rendered yet. */
  recordProposal(base: Order, expected: Order) {
    this.original ??= base;
    this.proposalBase = base;
    this.expected = expected;
  }

  hasExpectedOrder(matches: (order: Order) => boolean) {
    return this.expected === null || matches(this.expected);
  }

  /**
   * Restore only while the current order still belongs to this gesture.
   * Matching the proposal base allows cancellation to supersede a deferred update.
   * The adapter restores surviving items using current models and preserves new items.
   */
  rollback<Result>(
    matches: (order: Order) => boolean,
    restore: (original: Order, awaitingProposal: boolean) => Result,
  ): Result | undefined {
    if (this.original === null || this.expected === null) {
      return undefined;
    }
    const awaitingProposal = !matches(this.expected);
    if (awaitingProposal && (this.proposalBase === null || !matches(this.proposalBase))) {
      return undefined;
    }
    return restore(this.original, awaitingProposal);
  }

  /** Release snapshots after completion or before starting another gesture. */
  reset() {
    this.original = null;
    this.expected = null;
    this.proposalBase = null;
  }
}

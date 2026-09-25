/** Tracks the order proposals owned by one pointer sorting gesture. */
export class SortingTransaction<Order> {
  private original: Order | null = null;

  private expected: Order | null = null;

  private proposalBase: Order | null = null;

  private revision = 0;

  get hasMoved() {
    return this.expected !== null;
  }

  /**
   * Track a proposal before notifying the consumer, which may synchronously unmount
   * the provider. Rejection restores the previous accepted proposal; completion or
   * another proposal invalidates this call so it cannot revive an older gesture.
   */
  propose(base: Order, expected: Order, notify: () => boolean): boolean {
    const previous = {
      original: this.original,
      expected: this.expected,
      proposalBase: this.proposalBase,
    };
    this.revision += 1;
    const revision = this.revision;
    this.original ??= base;
    this.proposalBase = base;
    this.expected = expected;
    let accepted = false;
    try {
      accepted = notify();
      return accepted && this.revision === revision;
    } finally {
      if (!accepted && this.revision === revision) {
        this.original = previous.original;
        this.expected = previous.expected;
        this.proposalBase = previous.proposalBase;
      }
    }
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
    const original = this.original;
    // Consume the transaction before application code can reenter cleanup.
    this.reset();
    return restore(original, awaitingProposal);
  }

  /** Release snapshots after completion or before starting another gesture. */
  reset() {
    this.revision += 1;
    this.original = null;
    this.expected = null;
    this.proposalBase = null;
  }
}

import { describe, expect, it, vi } from 'vitest';
import { SortingTransaction } from './SortingTransaction';

describe('SortingTransaction', () => {
  it('does not restore a gesture without accepted moves', () => {
    const transaction = new SortingTransaction<string>();
    const restore = vi.fn();
    transaction.rollback(() => true, restore);
    expect(restore).not.toHaveBeenCalled();
    expect(transaction.hasMoved).toBe(false);
  });

  it('restores the original order after multiple live proposals', () => {
    const transaction = new SortingTransaction<string>();
    transaction.recordProposal('ABC', 'BAC');
    transaction.recordProposal('BAC', 'BCA');
    const restore = vi.fn(() => 'restored');
    expect(transaction.rollback((order) => order === 'BCA', restore)).toBe('restored');
    expect(restore).toHaveBeenCalledExactlyOnceWith('ABC', false);
  });

  it('supersedes a deferred proposal even when the original order is still rendered', () => {
    const transaction = new SortingTransaction<string>();
    transaction.recordProposal('ABC', 'BAC');
    const restore = vi.fn();
    expect(transaction.hasExpectedOrder((order) => order === 'ABC')).toBe(false);
    transaction.rollback((order) => order === 'ABC', restore);
    expect(restore).toHaveBeenCalledExactlyOnceWith('ABC', true);
  });

  it('restores after a later proposal is deferred', () => {
    const transaction = new SortingTransaction<string>();
    transaction.recordProposal('ABC', 'BAC');
    transaction.recordProposal('BAC', 'BCA');
    const restore = vi.fn();
    transaction.rollback((order) => order === 'BAC', restore);
    expect(restore).toHaveBeenCalledExactlyOnceWith('ABC', true);
  });

  it('preserves a conflicting external reorder', () => {
    const transaction = new SortingTransaction<string>();
    transaction.recordProposal('ABC', 'BAC');
    const restore = vi.fn();
    transaction.rollback((order) => order === 'CAB', restore);
    expect(restore).not.toHaveBeenCalled();
  });

  it('allows the adapter to preserve edits, additions, and deletions', () => {
    const transaction = new SortingTransaction<string>();
    transaction.recordProposal('ABC', 'BAC');
    // C was removed and X was inserted. Only surviving known items determine conflicts.
    const current = 'BXA';
    const restore = vi.fn(() => 'AXB');
    transaction.rollback((order) => order.replace('C', '') === current.replace('X', ''), restore);
    expect(restore).toHaveBeenCalledExactlyOnceWith('ABC', false);
  });

  it('releases the previous gesture before another gesture starts', () => {
    const transaction = new SortingTransaction<string>();
    transaction.recordProposal('ABC', 'BAC');
    transaction.reset();
    expect(transaction.hasMoved).toBe(false);
    expect(transaction.hasExpectedOrder(() => false)).toBe(true);
    const restore = vi.fn();
    transaction.rollback(() => true, restore);
    expect(restore).not.toHaveBeenCalled();
    transaction.recordProposal('XYZ', 'YXZ');
    transaction.rollback((order) => order === 'YXZ', restore);
    expect(restore).toHaveBeenCalledExactlyOnceWith('XYZ', false);
  });
});

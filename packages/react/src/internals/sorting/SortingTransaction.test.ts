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
    transaction.propose('ABC', 'BAC', () => true);
    transaction.propose('BAC', 'BCA', () => true);
    const restore = vi.fn(() => 'restored');
    expect(transaction.rollback((order) => order === 'BCA', restore)).toBe('restored');
    expect(restore).toHaveBeenCalledExactlyOnceWith('ABC', false);
  });

  it('supersedes a deferred proposal even when the original order is still rendered', () => {
    const transaction = new SortingTransaction<string>();
    transaction.propose('ABC', 'BAC', () => true);
    const restore = vi.fn();
    expect(transaction.hasExpectedOrder((order) => order === 'ABC')).toBe(false);
    transaction.rollback((order) => order === 'ABC', restore);
    expect(restore).toHaveBeenCalledExactlyOnceWith('ABC', true);
  });

  it('restores after a later proposal is deferred', () => {
    const transaction = new SortingTransaction<string>();
    transaction.propose('ABC', 'BAC', () => true);
    transaction.propose('BAC', 'BCA', () => true);
    const restore = vi.fn();
    transaction.rollback((order) => order === 'BAC', restore);
    expect(restore).toHaveBeenCalledExactlyOnceWith('ABC', true);
  });

  it('preserves a conflicting external reorder', () => {
    const transaction = new SortingTransaction<string>();
    transaction.propose('ABC', 'BAC', () => true);
    const restore = vi.fn();
    transaction.rollback((order) => order === 'CAB', restore);
    expect(restore).not.toHaveBeenCalled();
  });

  it('exposes a pending proposal to synchronous cleanup without reviving it', () => {
    const transaction = new SortingTransaction<string>();
    const restore = vi.fn();
    const accepted = transaction.propose('ABC', 'BAC', () => {
      transaction.rollback((order) => order === 'ABC', restore);
      return true;
    });
    expect(accepted).toBe(false);
    expect(restore).toHaveBeenCalledExactlyOnceWith('ABC', true);
    expect(transaction.hasMoved).toBe(false);
  });

  it('consumes rollback before invoking a reentrant restoration callback', () => {
    const transaction = new SortingTransaction<string>();
    transaction.propose('ABC', 'BAC', () => true);
    const nestedRestore = vi.fn();
    transaction.rollback(
      () => true,
      () => transaction.rollback(() => true, nestedRestore),
    );
    expect(nestedRestore).not.toHaveBeenCalled();
  });

  it('retains the previous accepted proposal after rejection', () => {
    const transaction = new SortingTransaction<string>();
    transaction.propose('ABC', 'BAC', () => true);
    expect(transaction.propose('BAC', 'BCA', () => false)).toBe(false);
    const restore = vi.fn();
    transaction.rollback((order) => order === 'BAC', restore);
    expect(restore).toHaveBeenCalledExactlyOnceWith('ABC', false);
  });

  it('does not overwrite a new gesture when an old proposal returns', () => {
    const transaction = new SortingTransaction<string>();
    expect(
      transaction.propose('ABC', 'BAC', () => {
        transaction.reset();
        transaction.propose('XYZ', 'YXZ', () => true);
        return false;
      }),
    ).toBe(false);
    const restore = vi.fn();
    transaction.rollback((order) => order === 'YXZ', restore);
    expect(restore).toHaveBeenCalledExactlyOnceWith('XYZ', false);
  });

  it('discards a proposal whose callback throws', () => {
    const transaction = new SortingTransaction<string>();
    expect(() =>
      transaction.propose('ABC', 'BAC', () => {
        throw new Error('test');
      }),
    ).toThrow('test');
    expect(transaction.hasMoved).toBe(false);
  });

  it('releases the previous gesture before another gesture starts', () => {
    const transaction = new SortingTransaction<string>();
    transaction.propose('ABC', 'BAC', () => true);
    transaction.reset();
    expect(transaction.hasMoved).toBe(false);
    expect(transaction.hasExpectedOrder(() => false)).toBe(true);
    const restore = vi.fn();
    transaction.rollback(() => true, restore);
    expect(restore).not.toHaveBeenCalled();
    transaction.propose('XYZ', 'YXZ', () => true);
    transaction.rollback((order) => order === 'YXZ', restore);
    expect(restore).toHaveBeenCalledExactlyOnceWith('XYZ', false);
  });
});

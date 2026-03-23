import type { CollectionItemId } from '../../types/collection';

const MAX_CONCURRENT_REQUESTS = Infinity;

export enum RequestStatus {
  QUEUED,
  PENDING,
  SETTLED,
  UNKNOWN,
}

export interface NestedDataManagerDelegate {
  fetchItemChildren(params: { itemId: CollectionItemId | null }): Promise<void>;
}

/**
 * Manages concurrent fetching of tree item children with a queue system.
 * Tracks request lifecycle through QUEUED → PENDING → SETTLED states
 * and limits concurrency to prevent overwhelming the server.
 */
export class NestedDataManager {
  private pendingRequests: Set<CollectionItemId> = new Set();

  private queuedRequests: Set<CollectionItemId> = new Set();

  private settledRequests: Set<CollectionItemId> = new Set();

  private delegate: NestedDataManagerDelegate;

  private maxConcurrentRequests: number;

  constructor(
    delegate: NestedDataManagerDelegate,
    maxConcurrentRequests = MAX_CONCURRENT_REQUESTS,
  ) {
    this.delegate = delegate;
    this.maxConcurrentRequests = maxConcurrentRequests;
  }

  private processQueue = async () => {
    if (this.queuedRequests.size === 0 || this.pendingRequests.size >= this.maxConcurrentRequests) {
      return;
    }
    const loopLength = Math.min(
      this.maxConcurrentRequests - this.pendingRequests.size,
      this.queuedRequests.size,
    );
    if (loopLength === 0) {
      return;
    }
    const fetchQueue = Array.from(this.queuedRequests);
    const fetchPromises: Promise<void>[] = [];
    for (let i = 0; i < loopLength; i += 1) {
      const id = fetchQueue[i];
      this.queuedRequests.delete(id);
      this.pendingRequests.add(id);

      fetchPromises.push(this.delegate.fetchItemChildren({ itemId: id }));
    }
    await Promise.all(fetchPromises);
  };

  public queue = async (ids: CollectionItemId[]) => {
    for (const id of ids) {
      if (!this.pendingRequests.has(id)) {
        this.queuedRequests.add(id);
      }
    }
    await this.processQueue();
  };

  public setRequestSettled = async (id: CollectionItemId) => {
    this.pendingRequests.delete(id);
    this.settledRequests.add(id);
    await this.processQueue();
  };

  public clear = () => {
    this.queuedRequests.clear();
    for (const id of Array.from(this.pendingRequests)) {
      this.clearPendingRequest(id);
    }
  };

  public clearPendingRequest = async (id: CollectionItemId) => {
    this.pendingRequests.delete(id);
    await this.processQueue();
  };

  public getRequestStatus = (id: CollectionItemId) => {
    if (this.pendingRequests.has(id)) {
      return RequestStatus.PENDING;
    }
    if (this.queuedRequests.has(id)) {
      return RequestStatus.QUEUED;
    }
    if (this.settledRequests.has(id)) {
      return RequestStatus.SETTLED;
    }
    return RequestStatus.UNKNOWN;
  };

  public getActiveRequestsCount = () => this.pendingRequests.size + this.queuedRequests.size;
}

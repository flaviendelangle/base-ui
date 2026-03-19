import * as React from 'react';
import { act, fireEvent } from '@mui/internal-test-utils';
import { createRenderer } from '../../../test/createRenderer';
import { Tree } from '../../tree';
import type { TreeDefaultItemModel, TreeItemId, TreeRootActions } from '../store/types';
import { DataSourceCacheDefault } from '../utils/cache';
import type { UseTreeLazyLoadingParameters } from '../utils/useTreeLazyLoading';

interface ItemType extends TreeDefaultItemModel {
  childrenCount?: number;
}

const { render } = createRenderer();

const mockFetchChildren = async (parentId?: TreeItemId): Promise<ItemType[]> => {
  const items: ItemType[] = [
    {
      id: parentId == null ? '1' : `${parentId}-1`,
      label: parentId == null ? '1' : `${parentId}-1`,
      childrenCount: 1,
    },
  ];

  return new Promise((resolve) => {
    setTimeout(() => resolve(items), 0);
  });
};

async function awaitMockFetch() {
  await act(async () => {
    await new Promise((resolve) => {
      setTimeout(resolve, 1);
    });
  });
}

function TreeWithLazyLoading(
  props: {
    items: ItemType[];
    config?: Partial<UseTreeLazyLoadingParameters>;
    actionsRef?: React.RefObject<TreeRootActions | null>;
  } & Record<string, any>,
) {
  const { items, config, actionsRef, ...other } = props;
  const lazyLoading = Tree.useLazyLoading({
    fetchChildren: config?.fetchChildren ?? mockFetchChildren,
    getChildrenCount:
      config?.getChildrenCount ??
      ((item: TreeDefaultItemModel) => (item as ItemType).childrenCount ?? 0),
    cache: config?.cache,
  });

  return (
    <Tree.Root
      items={items}
      lazyLoading={lazyLoading}
      expandOnClick
      actionsRef={actionsRef}
      {...other}
    >
      {(_item: TreeDefaultItemModel) => (
        <Tree.Item itemId={_item.id}>
          <Tree.ItemExpansionTrigger />
          <Tree.ItemLoadingIndicator>
            <span data-testid="loading-indicator" />
          </Tree.ItemLoadingIndicator>
          <Tree.ItemErrorIndicator>
            <span data-testid="error-indicator" />
          </Tree.ItemErrorIndicator>
          <Tree.ItemLabel />
        </Tree.Item>
      )}
    </Tree.Root>
  );
}

function getAllTreeItemIds(container: HTMLElement): TreeItemId[] {
  return Array.from(container.querySelectorAll('[role="treeitem"]')).map(
    (item) => (item as HTMLElement).dataset.itemId!,
  );
}

function getItemRoot(container: HTMLElement, id: TreeItemId): HTMLElement {
  const item = container.querySelector(`[data-item-id="${CSS.escape(String(id))}"]`);
  if (!item) {
    throw new Error(`Could not find item with id "${id}"`);
  }
  return item as HTMLElement;
}

function isItemExpanded(container: HTMLElement, id: TreeItemId): boolean {
  return getItemRoot(container, id).getAttribute('aria-expanded') === 'true';
}

describe('TreeRoot - Lazy Loading', () => {
  describe('interaction', () => {
    it('should load children when expanding an item', async () => {
      const { container } = await render(
        <TreeWithLazyLoading items={[{ id: '1', label: '1', childrenCount: 1 }]} />,
      );

      expect(isItemExpanded(container, '1')).toBe(false);
      expect(getAllTreeItemIds(container)).toEqual(['1']);

      fireEvent.click(getItemRoot(container, '1'));
      await awaitMockFetch();
      expect(isItemExpanded(container, '1')).toBe(true);
      expect(getAllTreeItemIds(container)).toEqual(['1', '1-1']);
    });

    it('should not load children if item has no children (childrenCount: 0)', async () => {
      const { container } = await render(
        <TreeWithLazyLoading items={[{ id: '1', label: '1', childrenCount: 0 }]} />,
      );

      expect(isItemExpanded(container, '1')).toBe(false);
      expect(getAllTreeItemIds(container)).toEqual(['1']);

      fireEvent.click(getItemRoot(container, '1'));
      await awaitMockFetch();
      expect(isItemExpanded(container, '1')).toBe(false);
      expect(getAllTreeItemIds(container)).toEqual(['1']);
    });

    it('should load children if item has unknown children count (childrenCount: -1)', async () => {
      const { container } = await render(
        <TreeWithLazyLoading items={[{ id: '1', label: '1', childrenCount: -1 }]} />,
      );

      expect(isItemExpanded(container, '1')).toBe(false);
      expect(getAllTreeItemIds(container)).toEqual(['1']);

      fireEvent.click(getItemRoot(container, '1'));
      await awaitMockFetch();
      expect(isItemExpanded(container, '1')).toBe(true);
      expect(getAllTreeItemIds(container)).toEqual(['1', '1-1']);
    });

    it('should handle errors during fetching (item stays collapsed)', async () => {
      const errorFetchChildren = async (): Promise<ItemType[]> => {
        return new Promise((_, reject) => {
          setTimeout(() => {
            reject(new Error('Failed to fetch data'));
          }, 0);
        });
      };

      const { container } = await render(
        <TreeWithLazyLoading
          items={[{ id: '1', label: '1', childrenCount: 1 }]}
          config={{ fetchChildren: errorFetchChildren }}
        />,
      );

      expect(isItemExpanded(container, '1')).toBe(false);
      expect(getAllTreeItemIds(container)).toEqual(['1']);

      fireEvent.click(getItemRoot(container, '1'));
      await awaitMockFetch();
      expect(isItemExpanded(container, '1')).toBe(false);
      expect(getAllTreeItemIds(container)).toEqual(['1']);
    });

    it('should load expanded items on mount', async () => {
      const { container } = await render(
        <TreeWithLazyLoading
          items={[{ id: '1', label: '1', childrenCount: 1 }]}
          defaultExpandedItems={['1']}
        />,
      );

      await awaitMockFetch();
      expect(isItemExpanded(container, '1')).toBe(true);
      expect(getAllTreeItemIds(container)).toEqual(['1', '1-1']);
    });

    it('should load expanded items on mount (deeper items)', async () => {
      const { container } = await render(
        <TreeWithLazyLoading
          items={[
            {
              id: '1',
              label: '1',
              childrenCount: 1,
              children: [{ id: '1-1', label: '1-1', childrenCount: 1 }],
            },
          ]}
          defaultExpandedItems={['1', '1-1', '1-1-1']}
          itemToChildren={(item: TreeDefaultItemModel) => (item as ItemType).children}
        />,
      );

      await awaitMockFetch();
      expect(isItemExpanded(container, '1')).toBe(true);
      expect(getAllTreeItemIds(container)).toEqual(['1', '1-1', '1-1-1', '1-1-1-1']);
    });

    it('should use data from props.items on mount (no fetch needed)', async () => {
      const { container } = await render(
        <TreeWithLazyLoading
          items={[
            {
              id: '1',
              label: '1',
              childrenCount: 1,
              children: [{ id: '1-1', label: '1-1' }],
            },
          ]}
          defaultExpandedItems={['1']}
          itemToChildren={(item: TreeDefaultItemModel) => (item as ItemType).children}
        />,
      );

      expect(isItemExpanded(container, '1')).toBe(true);
      expect(getAllTreeItemIds(container)).toEqual(['1', '1-1']);
    });

    it('should allow mixing props.items and fetched items on mount', async () => {
      let resolveItem2: ((value: ItemType[]) => void) | null = null;
      const controlledFetch = (_parentId?: TreeItemId): Promise<ItemType[]> =>
        new Promise((resolve) => {
          resolveItem2 = resolve;
        });

      const { container } = await render(
        <TreeWithLazyLoading
          items={[
            {
              id: '1',
              label: '1',
              childrenCount: 1,
              children: [{ id: '1-1', label: '1-1' }],
            },
            { id: '2', label: '2', childrenCount: 1 },
          ]}
          defaultExpandedItems={['1', '2']}
          itemToChildren={(item: TreeDefaultItemModel) => (item as ItemType).children}
          config={{ fetchChildren: controlledFetch }}
        />,
      );

      // Item 1 has inline children available immediately; item 2 is still loading
      expect(isItemExpanded(container, '1')).toBe(true);
      expect(isItemExpanded(container, '2')).toBe(true);
      expect(getAllTreeItemIds(container)).toEqual(['1', '1-1', '2']);

      // Resolve item 2's fetch
      await act(async () => {
        resolveItem2!([{ id: '2-1', label: '2-1' }]);
      });
      expect(isItemExpanded(container, '1')).toBe(true);
      expect(isItemExpanded(container, '2')).toBe(true);
      expect(getAllTreeItemIds(container)).toEqual(['1', '1-1', '2', '2-1']);
    });
  });

  describe('updateItemChildren', () => {
    it('should refresh root children when called with null', async () => {
      const actionsRef = React.createRef<TreeRootActions | null>();

      const { container } = await render(
        <TreeWithLazyLoading
          items={[{ id: 'initial', label: 'initial', childrenCount: 0 }]}
          actionsRef={actionsRef}
        />,
      );

      expect(getAllTreeItemIds(container)).toEqual(['initial']);

      await act(async () => {
        await actionsRef.current!.updateItemChildren(null);
      });

      expect(getAllTreeItemIds(container)).toEqual(['1']);
    });

    it('should refresh specific item children when called with an id', async () => {
      const actionsRef = React.createRef<TreeRootActions | null>();

      const { container } = await render(
        <TreeWithLazyLoading
          items={[{ id: '1', label: '1', childrenCount: 1 }]}
          actionsRef={actionsRef}
        />,
      );

      expect(getAllTreeItemIds(container)).toEqual(['1']);

      await act(async () => {
        await actionsRef.current!.updateItemChildren('1');
      });
      await awaitMockFetch();

      fireEvent.click(getItemRoot(container, '1'));
      await awaitMockFetch();
      expect(getAllTreeItemIds(container)).toEqual(['1', '1-1']);
    });
  });

  // ===========================================================================
  // Loading / Error indicators
  // ===========================================================================

  describe('loading indicator', () => {
    it('should show loading indicator while fetching children', async () => {
      let resolvePromise: (value: ItemType[]) => void;
      const slowFetchChildren = (): Promise<ItemType[]> =>
        new Promise((resolve) => {
          resolvePromise = resolve;
        });

      const { container } = await render(
        <TreeWithLazyLoading
          items={[{ id: '1', label: '1', childrenCount: 1 }]}
          config={{ fetchChildren: slowFetchChildren }}
        />,
      );

      fireEvent.click(getItemRoot(container, '1'));

      // Loading indicator should be visible
      // eslint-disable-next-line testing-library/no-container
      const loadingIndicator = container.querySelector('[data-testid="loading-indicator"]');
      expect(loadingIndicator).not.toBe(null);

      // Resolve and verify loading goes away
      await act(async () => {
        resolvePromise!([{ id: '1-1', label: '1-1' }]);
      });

      // eslint-disable-next-line testing-library/no-container
      const loadingAfter = container.querySelector('[data-testid="loading-indicator"]');
      expect(loadingAfter).toBe(null);
    });

    it('should hide loading indicator after fetch completes', async () => {
      const { container } = await render(
        <TreeWithLazyLoading items={[{ id: '1', label: '1', childrenCount: 1 }]} />,
      );

      fireEvent.click(getItemRoot(container, '1'));
      await awaitMockFetch();

      // eslint-disable-next-line testing-library/no-container
      const loadingIndicator2 = container.querySelector('[data-testid="loading-indicator"]');
      expect(loadingIndicator2).toBe(null);
    });
  });

  describe('error indicator', () => {
    it('should show error indicator when fetch fails', async () => {
      const errorFetchChildren = async (): Promise<ItemType[]> => {
        return new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Fetch failed')), 0);
        });
      };

      const { container } = await render(
        <TreeWithLazyLoading
          items={[{ id: '1', label: '1', childrenCount: 1 }]}
          config={{ fetchChildren: errorFetchChildren }}
        />,
      );

      fireEvent.click(getItemRoot(container, '1'));
      await awaitMockFetch();

      // eslint-disable-next-line testing-library/no-container
      const errorIndicator = container.querySelector('[data-testid="error-indicator"]');
      expect(errorIndicator).not.toBe(null);
    });

    it('should clear error indicator on successful retry', async () => {
      let shouldFail = true;
      const conditionalFetchChildren = async (parentId?: TreeItemId): Promise<ItemType[]> => {
        return new Promise((resolve, reject) => {
          setTimeout(() => {
            if (shouldFail) {
              reject(new Error('Fetch failed'));
            } else {
              resolve([{ id: `${parentId}-1`, label: `${parentId}-1` }]);
            }
          }, 0);
        });
      };

      const { container } = await render(
        <TreeWithLazyLoading
          items={[{ id: '1', label: '1', childrenCount: 1 }]}
          config={{ fetchChildren: conditionalFetchChildren }}
        />,
      );

      // First attempt — fails
      fireEvent.click(getItemRoot(container, '1'));
      await awaitMockFetch();
      // eslint-disable-next-line testing-library/no-container
      expect(container.querySelector('[data-testid="error-indicator"]')).not.toBe(null);

      // Retry — succeeds
      shouldFail = false;
      fireEvent.click(getItemRoot(container, '1'));
      await awaitMockFetch();
      // eslint-disable-next-line testing-library/no-container
      expect(container.querySelector('[data-testid="error-indicator"]')).toBe(null);
    });
  });

  // ===========================================================================
  // Cache behavior
  // ===========================================================================

  describe('cache', () => {
    it('should use cached data on second expansion (with DataSourceCacheDefault)', async () => {
      const fetchSpy = vi.fn(mockFetchChildren);

      const { container } = await render(
        <TreeWithLazyLoading
          items={[{ id: '1', label: '1', childrenCount: 1 }]}
          config={{ fetchChildren: fetchSpy, cache: new DataSourceCacheDefault() }}
        />,
      );

      // Expand
      fireEvent.click(getItemRoot(container, '1'));
      await awaitMockFetch();
      expect(fetchSpy.mock.calls.length).toBe(1);
      expect(isItemExpanded(container, '1')).toBe(true);

      // Collapse
      fireEvent.click(getItemRoot(container, '1'));
      expect(isItemExpanded(container, '1')).toBe(false);

      // Expand again — should use cache, not re-fetch
      fireEvent.click(getItemRoot(container, '1'));
      await awaitMockFetch();
      expect(fetchSpy.mock.calls.length).toBe(1);
      expect(isItemExpanded(container, '1')).toBe(true);
    });

    it('should bypass cache when updateItemChildren is called (forceRefresh)', async () => {
      const fetchSpy = vi.fn(mockFetchChildren);
      const actionsRef = React.createRef<TreeRootActions | null>();

      const { container } = await render(
        <TreeWithLazyLoading
          items={[{ id: '1', label: '1', childrenCount: 1 }]}
          config={{ fetchChildren: fetchSpy, cache: new DataSourceCacheDefault() }}
          actionsRef={actionsRef}
        />,
      );

      // Expand to populate cache
      fireEvent.click(getItemRoot(container, '1'));
      await awaitMockFetch();
      expect(fetchSpy.mock.calls.length).toBe(1);

      // Force refresh — should bypass cache
      await act(async () => {
        await actionsRef.current!.updateItemChildren('1');
      });
      await awaitMockFetch();
      expect(fetchSpy.mock.calls.length).toBe(2);
    });

    it('should work without cache (no double fetch)', async () => {
      const fetchSpy = vi.fn(mockFetchChildren);

      const { container } = await render(
        <TreeWithLazyLoading
          items={[{ id: '1', label: '1', childrenCount: 1 }]}
          config={{ fetchChildren: fetchSpy }}
        />,
      );

      // Expand
      fireEvent.click(getItemRoot(container, '1'));
      await awaitMockFetch();
      expect(fetchSpy.mock.calls.length).toBe(1);
      expect(isItemExpanded(container, '1')).toBe(true);
    });
  });

  // ===========================================================================
  // Queue / Concurrency
  // ===========================================================================

  describe('queue', () => {
    it('should not duplicate requests for the same item', async () => {
      const fetchSpy = vi.fn(mockFetchChildren);

      const { container } = await render(
        <TreeWithLazyLoading
          items={[{ id: '1', label: '1', childrenCount: 1 }]}
          config={{ fetchChildren: fetchSpy }}
        />,
      );

      // Click twice quickly — should only fetch once
      fireEvent.click(getItemRoot(container, '1'));
      fireEvent.click(getItemRoot(container, '1'));
      await awaitMockFetch();
      expect(fetchSpy.mock.calls.length).toBe(1);
    });

    it('should handle rapid expand/collapse without race conditions', async () => {
      let resolvePromise: ((value: ItemType[]) => void) | null = null;
      const delayedFetchChildren = async (_parentId?: TreeItemId): Promise<ItemType[]> =>
        new Promise((resolve) => {
          resolvePromise = resolve;
        });

      const { container } = await render(
        <TreeWithLazyLoading
          items={[{ id: '1', label: '1', childrenCount: 1 }]}
          config={{ fetchChildren: delayedFetchChildren }}
        />,
      );

      // Start expansion (triggers fetch)
      fireEvent.click(getItemRoot(container, '1'));

      // Resolve the fetch
      await act(async () => {
        resolvePromise!([{ id: '1-1', label: '1-1' }]);
      });

      // Item should be expanded with children
      expect(isItemExpanded(container, '1')).toBe(true);
      expect(getAllTreeItemIds(container)).toEqual(['1', '1-1']);
    });
  });

  // ===========================================================================
  // State overrides
  // ===========================================================================

  describe('state overrides', () => {
    it('should mark items as expandable via expandable overrides (getChildrenCount > 0)', async () => {
      const { container } = await render(
        <TreeWithLazyLoading items={[{ id: '1', label: '1', childrenCount: 3 }]} />,
      );

      // Item should be expandable (has aria-expanded attribute)
      const item = getItemRoot(container, '1');
      expect(item.getAttribute('aria-expanded')).toBe('false');
    });

    it('should not mutate state.items when children are fetched', async () => {
      const items: ItemType[] = [{ id: '1', label: '1', childrenCount: 1 }];

      const { container } = await render(<TreeWithLazyLoading items={items} />);

      fireEvent.click(getItemRoot(container, '1'));
      await awaitMockFetch();

      // Original items array should be unchanged
      expect(items).toEqual([{ id: '1', label: '1', childrenCount: 1 }]);
      // But the tree should show the fetched children
      expect(getAllTreeItemIds(container)).toEqual(['1', '1-1']);
    });

    it('should correctly compute depth for lazily-loaded nested items', async () => {
      const { container } = await render(
        <TreeWithLazyLoading items={[{ id: '1', label: '1', childrenCount: 1 }]} />,
      );

      fireEvent.click(getItemRoot(container, '1'));
      await awaitMockFetch();

      const childItem = getItemRoot(container, '1-1');
      expect(childItem.style.getPropertyValue('--depth')).toBe('1');
    });
  });
});

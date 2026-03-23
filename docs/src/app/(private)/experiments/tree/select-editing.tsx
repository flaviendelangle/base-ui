'use client';
import * as React from 'react';
import { Tree } from '@base-ui/react/tree';
import styles from './tree.module.css';

interface CategoryItem {
  id: string;
  label: string;
  category: 'stable' | 'beta' | 'alpha';
  children?: CategoryItem[];
}

const initialItems: CategoryItem[] = [
  {
    id: 'components',
    label: 'Components',
    category: 'stable',
    children: [
      { id: 'button', label: 'Button', category: 'stable' },
      { id: 'dialog', label: 'Dialog', category: 'beta' },
      { id: 'tooltip', label: 'Tooltip', category: 'stable' },
    ],
  },
  {
    id: 'hooks',
    label: 'Hooks',
    category: 'stable',
    children: [
      { id: 'use-focus-trap', label: 'useFocusTrap', category: 'alpha' },
      { id: 'use-scroll-lock', label: 'useScrollLock', category: 'beta' },
    ],
  },
  {
    id: 'utils',
    label: 'Utils',
    category: 'alpha',
  },
];

const CATEGORIES = ['stable', 'beta', 'alpha'] as const;

function updateCategory(
  items: CategoryItem[],
  targetId: string,
  category: CategoryItem['category'],
): CategoryItem[] {
  return items.map((item) => {
    if (item.id === targetId) {
      return { ...item, category };
    }
    if (item.children) {
      return { ...item, children: updateCategory(item.children, targetId, category) };
    }
    return item;
  });
}

export default function SelectEditingTree() {
  const [items, setItems] = React.useState(initialItems);
  const actionsRef = React.useRef<Tree.Root.Actions<CategoryItem>>(null);

  const itemToStringLabel = React.useCallback(
    (item: CategoryItem) => `${item.label} (${item.category})`,
    [],
  );

  return (
    <div className={styles.wrapper}>
      <div>
        <h3 className={styles.heading}>Select dropdown editing</h3>
        <p className={styles.description}>
          Double-click a label to change its category via a dropdown. Selection saves immediately.
        </p>
      </div>
      <Tree.Root
        items={items}
        onItemsChange={setItems}
        isItemEditable
        defaultExpandedItems={['components', 'hooks']}
        className={styles.tree}
        itemToStringLabel={itemToStringLabel}
        actionsRef={actionsRef}
      >
        {(item) => (
          <Tree.Item itemId={item.id} className={styles.item}>
            <Tree.ItemExpansionTrigger className={styles.expansionTrigger}>
              <ChevronIcon />
            </Tree.ItemExpansionTrigger>
            <Tree.ItemLabel className={styles.label} />
            <Tree.ItemLabelEditing>
              {({ cancel }) => (
                <select
                  autoFocus
                  defaultValue={item.category}
                  onChange={(event) => {
                    setItems((prev) =>
                      updateCategory(
                        prev,
                        item.id,
                        event.currentTarget.value as CategoryItem['category'],
                      ),
                    );
                    actionsRef.current?.cancelEditing();
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Escape') {
                      cancel();
                    }
                  }}
                  onBlur={() => cancel()}
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              )}
            </Tree.ItemLabelEditing>
          </Tree.Item>
        )}
      </Tree.Root>
    </div>
  );
}

function ChevronIcon(props: React.ComponentProps<'svg'>) {
  return (
    <svg viewBox="0 0 12 12" fill="currentColor" {...props}>
      <path
        d="M4.5 2L8.5 6L4.5 10"
        stroke="currentColor"
        strokeWidth="1.5"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

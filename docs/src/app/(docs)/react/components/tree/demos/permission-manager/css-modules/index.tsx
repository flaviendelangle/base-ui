'use client';
import * as React from 'react';
import { Tree } from '@base-ui/react/tree';
import type { CollectionItemId } from '@base-ui/react/types';
import styles from './index.module.css';
import {
  PERMISSIONS,
  countSelectableLeafPermissions,
  getSelectableLeafIds,
  type Permission,
} from '../permissions';

const TOTAL_SELECTABLE = countSelectableLeafPermissions(PERMISSIONS);
const SELECTABLE_LEAF_IDS = getSelectableLeafIds(PERMISSIONS);

type SelectedItems = CollectionItemId[] | 'all';

export default function ExamplePermissionManager() {
  const [filterText, setFilterText] = React.useState('');
  const [selectedItems, setSelectedItems] = React.useState<SelectedItems>([]);
  const [expandedItems, setExpandedItems] = React.useState<CollectionItemId[]>([]);
  const actionsRef = React.useRef<Tree.Root.Actions>(null);

  const filter = Tree.useFilter();
  const result = Tree.useFilteredItems<Permission>({
    items: PERMISSIONS,
    filterText,
    filter,
    autoExpand: true,
  });

  const isFiltering = filterText.trim() !== '';

  const selectedLeafCount =
    selectedItems === 'all'
      ? TOTAL_SELECTABLE
      : selectedItems.filter((id) => SELECTABLE_LEAF_IDS.has(id)).length;

  return (
    <div className={styles.Demo}>
      <div className={styles.Toolbar}>
        <div className={styles.FilterWrapper}>
          <SearchIcon className={styles.SearchIcon} />
          <input
            className={styles.FilterInput}
            placeholder="Filter permissions…"
            value={filterText}
            onChange={(event) => setFilterText(event.target.value)}
          />
        </div>
        <div className={styles.ToolbarActions}>
          <button
            type="button"
            className={styles.ToolbarButton}
            disabled={isFiltering}
            onClick={() => actionsRef.current?.expandAll()}
          >
            Expand all
          </button>
          <button
            type="button"
            className={styles.ToolbarButton}
            disabled={isFiltering}
            onClick={() => actionsRef.current?.collapseAll()}
          >
            Collapse all
          </button>
        </div>
      </div>
      <div className={styles.Summary}>
        {selectedLeafCount} of {TOTAL_SELECTABLE} permissions selected
      </div>
      <Tree.Root
        items={result.items}
        expandedItems={isFiltering ? result.expandedItems : expandedItems}
        onExpandedItemsChange={(newExpandedItems) => {
          if (!isFiltering) {
            setExpandedItems(newExpandedItems);
          }
        }}
        selectedItems={selectedItems}
        onSelectedItemsChange={(newSelectedItems) => {
          setSelectedItems(newSelectedItems as SelectedItems);
        }}
        actionsRef={actionsRef}
        selectionMode="multiple"
        checkboxSelectionPropagation={{ parents: true, descendants: true }}
        className={styles.Tree}
      >
        <Tree.AnimatedItemList>
          {(item: Permission, animatedChildren) => (
            <React.Fragment>
              <Tree.CheckboxItem
                itemId={item.id}
                className={styles.Item}
              >
                <Tree.ItemExpansionTrigger
                  className={styles.ExpansionTrigger}
                >
                  <ChevronIcon />
                </Tree.ItemExpansionTrigger>
                <Tree.CheckboxItemIndicator
                  className={styles.CheckboxIndicator}
                  keepMounted
                >
                  <CheckIcon className={styles.CheckIcon} />
                  <MinusIcon className={styles.MinusIcon} />
                </Tree.CheckboxItemIndicator>
                <Tree.ItemLabel className={styles.Label} />
                {item.disabled && <LockIcon className={styles.LockIcon} />}
              </Tree.CheckboxItem>
              <Tree.GroupTransition className={styles.GroupTransition}>
                {animatedChildren}
              </Tree.GroupTransition>
            </React.Fragment>
          )}
        </Tree.AnimatedItemList>
        <Tree.Empty className={styles.Empty}>
          No permissions found.
        </Tree.Empty>
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

function CheckIcon(props: React.ComponentProps<'svg'>) {
  return (
    <svg viewBox="0 0 12 12" fill="currentColor" {...props}>
      <path d="M9.854 3.146a.5.5 0 010 .708l-4.5 4.5a.5.5 0 01-.708 0l-2-2a.5.5 0 01.708-.708L5 7.293l4.146-4.147a.5.5 0 01.708 0z" />
    </svg>
  );
}

function MinusIcon(props: React.ComponentProps<'svg'>) {
  return (
    <svg viewBox="0 0 12 12" fill="currentColor" {...props}>
      <path d="M2.5 6a.5.5 0 01.5-.5h6a.5.5 0 010 1H3a.5.5 0 01-.5-.5z" />
    </svg>
  );
}

function SearchIcon(props: React.ComponentProps<'svg'>) {
  return (
    <svg viewBox="0 0 16 16" fill="none" {...props}>
      <path
        d="M11.5 11.5L14 14M6.5 12A5.5 5.5 0 106.5 1a5.5 5.5 0 000 11z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function LockIcon(props: React.ComponentProps<'svg'>) {
  return (
    <svg viewBox="0 0 16 16" fill="none" {...props}>
      <rect
        x="3"
        y="7"
        width="10"
        height="7"
        rx="1.5"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M5.5 7V5a2.5 2.5 0 015 0v2"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

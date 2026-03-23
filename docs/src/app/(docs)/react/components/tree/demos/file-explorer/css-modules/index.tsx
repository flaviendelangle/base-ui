'use client';
import * as React from 'react';
import { Tree } from '@base-ui/react/tree';
import type { CollectionItemId } from '@base-ui/react/types';
import { useDragAndDrop } from '@base-ui/react/use-drag-and-drop';
import styles from './index.module.css';
import { BASE_UI_FILES, type FileItem } from '../baseUIFiles';
import { ChevronIcon, FileIcon } from './icons';
import { FileExplorerContextMenu } from './context-menu';

// ---------------------------------------------------------------------------
// Tree mutation helpers
// ---------------------------------------------------------------------------

let nextId = 0;

function cloneItemWithNewIds(item: FileItem): FileItem {
  nextId += 1;
  const newId = `copy-${nextId}-${item.id}`;
  return {
    ...item,
    id: newId,
    children: item.children ? (item.children as FileItem[]).map(cloneItemWithNewIds) : undefined,
  };
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

interface ClipboardState {
  itemId: CollectionItemId;
  operation: 'cut' | 'copy';
}

export default function ExampleFileExplorer() {
  const [items, setItems] = React.useState<FileItem[]>(BASE_UI_FILES);
  const [expandedItems, setExpandedItems] = React.useState<CollectionItemId[]>([
    'packages',
    'packages/react',
    'packages/react/src',
  ]);
  const [contextMenuItemId, setContextMenuItemId] = React.useState<CollectionItemId | null>(null);
  const [clipboard, setClipboard] = React.useState<ClipboardState | null>(null);
  const actionsRef = React.useRef<Tree.Root.Actions<FileItem>>(null);

  const getTargetFolderId = React.useCallback(
    (itemId: CollectionItemId): CollectionItemId | null => {
      const actions = actionsRef.current;
      if (!actions) {
        return null;
      }
      if (actions.isItemExpandable(itemId)) {
        return itemId;
      }
      return actions.getParentId(itemId);
    },
    [],
  );

  const dragAndDrop = useDragAndDrop<FileItem>({
    getAllowedDropOperations: () => ['move', 'copy'],
    onItemDrop: ({ itemIds, target, dropOperation }) => {
      const actions = actionsRef.current;
      if (!actions) {
        return;
      }

      // Resolve the target folder
      const folderId = getTargetFolderId(target.itemId);
      if (folderId == null) {
        return;
      }

      if (dropOperation === 'copy') {
        // Clone items and add to target folder
        const clonedItems = [...itemIds]
          .map((id) => actions.getItemModel(id) as FileItem | undefined)
          .filter((model): model is FileItem => model != null)
          .map(cloneItemWithNewIds);
        const childCount = actions.getItemOrderedChildrenIds(folderId).length;
        actions.addItems(clonedItems, folderId, childCount);
      } else {
        // Compute sorted insertion index
        const childIds = actions.getItemOrderedChildrenIds(folderId);
        const firstDragged = actions.getItemModel([...itemIds][0]!) as FileItem | undefined;
        const label = firstDragged?.label ?? '';
        const filteredChildIds = childIds.filter((id: CollectionItemId) => !itemIds.has(id));
        const sortedIndex = filteredChildIds.findIndex((id: CollectionItemId) => {
          const child = actions.getItemModel(id) as FileItem | undefined;
          return (child?.label ?? '').localeCompare(label) > 0;
        });
        const insertIndex = sortedIndex === -1 ? filteredChildIds.length : sortedIndex;

        actions.moveItems(itemIds, folderId, insertIndex);
      }
    },
    renderDragPreview: ({ itemIds, draggedItem }) => {
      return (
        <div className={styles.DragPreview}>
          {itemIds.size === 1 ? (draggedItem?.label ?? '') : `${itemIds.size} items`}
        </div>
      );
    },
  });

  const isContextMenuItemFolder =
    contextMenuItemId != null && (actionsRef.current?.isItemExpandable(contextMenuItemId) ?? false);

  const deleteItem = React.useCallback(
    (itemId: CollectionItemId) => {
      actionsRef.current?.removeItems(new Set([itemId]));
      setClipboard((prev) => (prev?.itemId === itemId ? null : prev));
    },
    [],
  );

  const addItem = React.useCallback(
    (parentId: CollectionItemId, type: 'file' | 'folder') => {
      nextId += 1;
      const newId = `new-${type}-${nextId}`;
      const newItem: FileItem =
        type === 'folder'
          ? { id: newId, label: 'New folder', children: [] }
          : { id: newId, label: 'New file' };
      const childCount = actionsRef.current?.getItemOrderedChildrenIds(parentId).length ?? 0;
      actionsRef.current?.addItems([newItem], parentId, childCount);
      actionsRef.current?.setItemExpansion(parentId, true);
      actionsRef.current?.startEditing(newId);
    },
    [],
  );

  const cutItem = React.useCallback((itemId: CollectionItemId) => {
    setClipboard({ itemId, operation: 'cut' });
  }, []);

  const copyItem = React.useCallback((itemId: CollectionItemId) => {
    setClipboard({ itemId, operation: 'copy' });
  }, []);

  const pasteItem = React.useCallback(
    (targetId: CollectionItemId) => {
      const actions = actionsRef.current;
      if (!clipboard || !actions) {
        return;
      }

      const folderId = getTargetFolderId(targetId);
      if (folderId == null) {
        return;
      }

      if (clipboard.operation === 'copy') {
        const sourceItem = actions.getItemModel(clipboard.itemId) as FileItem | undefined;
        if (!sourceItem) {
          return;
        }
        const cloned = cloneItemWithNewIds(sourceItem);
        const childCount = actions.getItemOrderedChildrenIds(folderId).length;
        actions.addItems([cloned], folderId, childCount);
      } else {
        const childCount = actions.getItemOrderedChildrenIds(folderId).length;
        actions.moveItems(new Set([clipboard.itemId]), folderId, childCount);
        setClipboard(null);
      }
      actions.setItemExpansion(folderId, true);
    },
    [clipboard, getTargetFolderId],
  );

  const renameItem = React.useCallback((itemId: CollectionItemId) => {
    actionsRef.current?.startEditing(itemId);
  }, []);

  return (
    <FileExplorerContextMenu
      classes={styles}
      contextMenuItemId={contextMenuItemId}
      isContextMenuItemFolder={isContextMenuItemFolder}
      clipboard={clipboard}
      onAddItem={addItem}
      onCutItem={cutItem}
      onCopyItem={copyItem}
      onPasteItem={pasteItem}
      onRenameItem={renameItem}
      onDeleteItem={deleteItem}
    >
      <Tree.Root
        items={items}
        onItemsChange={setItems}
        isItemEditable
        actionsRef={actionsRef}
        expandedItems={expandedItems}
        onExpandedItemsChange={(newExpanded) => setExpandedItems(newExpanded)}
        expandOnClick
        selectionMode="multiple"
        dragAndDrop={dragAndDrop}
        resolveDropTargetGroup={getTargetFolderId}
        className={styles.Tree}
        onKeyDown={(event) => {
          const focused = (event.currentTarget as HTMLElement).querySelector<HTMLElement>(
            '[data-focused]',
          );
          const itemId = focused?.getAttribute('data-item-id');
          if (!itemId) {
            return;
          }
          if (event.key === 'Delete') {
            event.preventDefault();
            deleteItem(itemId);
          }
        }}
      >
        <Tree.VirtualizedItemList itemHeight={22}>
          {(item) => {
            const fileItem = item as FileItem;
            const isFolder = fileItem.children !== undefined;
            const isCut = clipboard?.itemId === fileItem.id && clipboard?.operation === 'cut';

            return (
              <Tree.Item
                itemId={fileItem.id}
                className={styles.Item}
                style={isCut ? { opacity: 0.4 } : undefined}
                onContextMenu={() => setContextMenuItemId(fileItem.id)}
              >
                <Tree.ItemIndentGuide className={styles.IndentGuide} />
                <Tree.ItemExpansionTrigger className={styles.ExpansionTrigger}>
                  <ChevronIcon />
                </Tree.ItemExpansionTrigger>
                {!isFolder && <FileIcon label={fileItem.label} className={styles.FileIcon} />}
                <Tree.ItemLabel className={styles.Label} />
                <Tree.ItemLabelEditing>
                  <Tree.ItemLabelEditingInput className={styles.LabelInput} />
                </Tree.ItemLabelEditing>
              </Tree.Item>
            );
          }}
        </Tree.VirtualizedItemList>
      </Tree.Root>
    </FileExplorerContextMenu>
  );
}

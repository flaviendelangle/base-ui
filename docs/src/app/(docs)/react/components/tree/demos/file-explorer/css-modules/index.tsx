'use client';
import * as React from 'react';
import { Tree } from '@base-ui/react/tree';
import type { CollectionItemId } from '@base-ui/react/types';
import { useDragAndDrop } from '@base-ui/react/use-drag-and-drop';
import { ContextMenu } from '@base-ui/react/context-menu';
import styles from './index.module.css';
import { BASE_UI_FILES, type FileItem } from '../baseUIFiles';

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

interface ClipboardState {
  itemId: CollectionItemId;
  operation: 'cut' | 'copy';
}

interface FileExplorerContextValue {
  clipboard: ClipboardState | null;
  deleteItem: (itemId: CollectionItemId) => void;
  addItem: (parentId: CollectionItemId, type: 'file' | 'folder') => void;
  cutItem: (itemId: CollectionItemId) => void;
  copyItem: (itemId: CollectionItemId) => void;
  pasteItem: (targetId: CollectionItemId) => void;
}

const FileExplorerContext = React.createContext<FileExplorerContextValue>({
  clipboard: null,
  deleteItem: () => {},
  addItem: () => {},
  cutItem: () => {},
  copyItem: () => {},
  pasteItem: () => {},
});

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

  const explorerContext = React.useMemo<FileExplorerContextValue>(
    () => ({
      clipboard,
      deleteItem: (itemId: CollectionItemId) => {
        actionsRef.current?.removeItems(new Set([itemId]));
        if (clipboard?.itemId === itemId) {
          setClipboard(null);
        }
      },
      addItem: (parentId: CollectionItemId, type: 'file' | 'folder') => {
        nextId += 1;
        const newId = `new-${type}-${nextId}`;
        const newItem: FileItem =
          type === 'folder'
            ? { id: newId, label: 'New folder', fileType: 'folder', children: [] }
            : { id: newId, label: 'New file', fileType: 'ts' };
        const childCount = actionsRef.current?.getItemOrderedChildrenIds(parentId).length ?? 0;
        actionsRef.current?.addItems([newItem], parentId, childCount);
        actionsRef.current?.setItemExpansion(parentId, true);
        actionsRef.current?.startEditing(newId);
      },
      cutItem: (itemId: CollectionItemId) => {
        setClipboard({ itemId, operation: 'cut' });
      },
      copyItem: (itemId: CollectionItemId) => {
        setClipboard({ itemId, operation: 'copy' });
      },
      pasteItem: (targetId: CollectionItemId) => {
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
    }),
    [clipboard, getTargetFolderId],
  );

  return (
    <FileExplorerContext.Provider value={explorerContext}>
      <ContextMenu.Root>
        <ContextMenu.Trigger render={<div />}>
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
                explorerContext.deleteItem(itemId);
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
                    <Tree.ItemExpansionTrigger className={styles.ExpansionTrigger}>
                      <ChevronIcon />
                    </Tree.ItemExpansionTrigger>
                    {!isFolder && <FileIcon fileType={fileItem.fileType} />}
                    <Tree.ItemLabel className={styles.Label} />
                    <Tree.ItemLabelEditing>
                      <Tree.ItemLabelEditingInput className={styles.LabelInput} />
                    </Tree.ItemLabelEditing>
                  </Tree.Item>
                );
              }}
            </Tree.VirtualizedItemList>
          </Tree.Root>
        </ContextMenu.Trigger>
        <ContextMenu.Portal>
          <ContextMenu.Positioner className={styles.Positioner}>
            <ContextMenu.Popup className={styles.ContextMenuPopup}>
              {isContextMenuItemFolder && (
                <ContextMenu.Item
                  className={styles.ContextMenuItem}
                  onClick={() =>
                    contextMenuItemId && explorerContext.addItem(contextMenuItemId, 'file')
                  }
                >
                  <NewFileIcon />
                  New File
                </ContextMenu.Item>
              )}
              {isContextMenuItemFolder && (
                <ContextMenu.Item
                  className={styles.ContextMenuItem}
                  onClick={() =>
                    contextMenuItemId && explorerContext.addItem(contextMenuItemId, 'folder')
                  }
                >
                  <NewFolderIcon />
                  New Folder
                </ContextMenu.Item>
              )}
              {isContextMenuItemFolder && (
                <ContextMenu.Separator className={styles.ContextMenuSeparator} />
              )}
              <ContextMenu.Item
                className={styles.ContextMenuItem}
                onClick={() => contextMenuItemId && explorerContext.cutItem(contextMenuItemId)}
              >
                <CutIcon />
                Cut
                <span className={styles.Shortcut}>Ctrl+X</span>
              </ContextMenu.Item>
              <ContextMenu.Item
                className={styles.ContextMenuItem}
                onClick={() => contextMenuItemId && explorerContext.copyItem(contextMenuItemId)}
              >
                <CopyIcon />
                Copy
                <span className={styles.Shortcut}>Ctrl+C</span>
              </ContextMenu.Item>
              <ContextMenu.Item
                className={styles.ContextMenuItem}
                disabled={clipboard === null}
                onClick={() => contextMenuItemId && explorerContext.pasteItem(contextMenuItemId)}
              >
                <PasteIcon />
                Paste
                <span className={styles.Shortcut}>Ctrl+V</span>
              </ContextMenu.Item>
              <ContextMenu.Separator className={styles.ContextMenuSeparator} />
              <ContextMenu.Item
                className={styles.ContextMenuItem}
                onClick={() =>
                  contextMenuItemId && actionsRef.current?.startEditing(contextMenuItemId)
                }
              >
                <RenameIcon />
                Rename
                <span className={styles.Shortcut}>F2</span>
              </ContextMenu.Item>
              <ContextMenu.Item
                className={styles.ContextMenuItem}
                onClick={() => contextMenuItemId && explorerContext.deleteItem(contextMenuItemId)}
              >
                <DeleteIcon />
                Delete
                <span className={styles.Shortcut}>Del</span>
              </ContextMenu.Item>
            </ContextMenu.Popup>
          </ContextMenu.Positioner>
        </ContextMenu.Portal>
      </ContextMenu.Root>
    </FileExplorerContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// SVG icons
// ---------------------------------------------------------------------------

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

function NewFileIcon() {
  return (
    <svg className={styles.MenuIcon} viewBox="0 0 16 16" fill="none">
      <path
        d="M4 1h5.586a1 1 0 01.707.293l2.414 2.414a1 1 0 01.293.707V14a1 1 0 01-1 1H4a1 1 0 01-1-1V2a1 1 0 011-1z"
        stroke="currentColor"
        strokeWidth="1.25"
      />
      <path d="M8 6v4M6 8h4" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
    </svg>
  );
}

function NewFolderIcon() {
  return (
    <svg className={styles.MenuIcon} viewBox="0 0 16 16" fill="none">
      <path
        d="M2 4.5C2 3.67 2.67 3 3.5 3H6.38a1 1 0 01.7.29l1.13 1.13a1 1 0 00.7.29H12.5c.83 0 1.5.67 1.5 1.5V12c0 .83-.67 1.5-1.5 1.5h-9A1.5 1.5 0 012 12V4.5z"
        stroke="currentColor"
        strokeWidth="1.25"
      />
      <path d="M8 7v4M6 9h4" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
    </svg>
  );
}

function CutIcon() {
  return (
    <svg className={styles.MenuIcon} viewBox="0 0 16 16" fill="none">
      <circle cx="5" cy="4" r="2" stroke="currentColor" strokeWidth="1.25" />
      <circle cx="5" cy="12" r="2" stroke="currentColor" strokeWidth="1.25" />
      <path
        d="M6.5 5.5L12 14M6.5 10.5L12 2"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg className={styles.MenuIcon} viewBox="0 0 16 16" fill="none">
      <rect x="5" y="5" width="8" height="8" rx="1" stroke="currentColor" strokeWidth="1.25" />
      <path
        d="M3 11V3a1 1 0 011-1h8"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
      />
    </svg>
  );
}

function PasteIcon() {
  return (
    <svg className={styles.MenuIcon} viewBox="0 0 16 16" fill="none">
      <rect x="3" y="3" width="10" height="11" rx="1" stroke="currentColor" strokeWidth="1.25" />
      <path d="M6 3V2a1 1 0 011-1h2a1 1 0 011 1v1" stroke="currentColor" strokeWidth="1.25" />
    </svg>
  );
}

function RenameIcon() {
  return (
    <svg className={styles.MenuIcon} viewBox="0 0 16 16" fill="none">
      <path
        d="M11.5 1.5l3 3-9 9H2.5v-3l9-9z"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function DeleteIcon() {
  return (
    <svg className={styles.MenuIcon} viewBox="0 0 16 16" fill="none">
      <path
        d="M2 4h12M5 4V2.5a.5.5 0 01.5-.5h5a.5.5 0 01.5.5V4M6 7v4M10 7v4"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
      />
      <path d="M3 4l1 10a1 1 0 001 1h6a1 1 0 001-1l1-10" stroke="currentColor" strokeWidth="1.25" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// File-type icons — Seti-style monochrome glyphs, each in its signature color
// ---------------------------------------------------------------------------

// Shared file page silhouette used as a base for most icons
const FILE_PATH = 'M4.5 1H10l3.5 3.5V14a1 1 0 01-1 1h-8a1 1 0 01-1-1V2a1 1 0 011-1z';
const FOLD_PATH = 'M10 1v2.5a1 1 0 001 1h2.5';

function TypeScriptIcon() {
  // Blue file with a "TS" badge
  return (
    <svg className={styles.FileIcon} viewBox="0 0 16 16" fill="none">
      <path d={FILE_PATH} fill="#3178C6" fillOpacity={0.15} stroke="#3178C6" strokeWidth="1" />
      <path d={FOLD_PATH} stroke="#3178C6" strokeWidth="1" strokeLinecap="round" />
      <path d="M4.5 9h3M6 9v3.5" stroke="#3178C6" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

function TypeScriptReactIcon() {
  // Blue file with a small React atom
  return (
    <svg className={styles.FileIcon} viewBox="0 0 16 16" fill="none">
      <path d={FILE_PATH} fill="#3178C6" fillOpacity={0.15} stroke="#3178C6" strokeWidth="1" />
      <path d={FOLD_PATH} stroke="#3178C6" strokeWidth="1" strokeLinecap="round" />
      <ellipse cx="7" cy="10.5" rx="3.5" ry="1.3" stroke="#3178C6" strokeWidth="0.75" />
      <ellipse
        cx="7"
        cy="10.5"
        rx="3.5"
        ry="1.3"
        stroke="#3178C6"
        strokeWidth="0.75"
        transform="rotate(60 7 10.5)"
      />
      <ellipse
        cx="7"
        cy="10.5"
        rx="3.5"
        ry="1.3"
        stroke="#3178C6"
        strokeWidth="0.75"
        transform="rotate(120 7 10.5)"
      />
      <circle cx="7" cy="10.5" r="0.7" fill="#3178C6" />
    </svg>
  );
}

function JavaScriptIcon() {
  // Yellow file with "JS" badge
  return (
    <svg className={styles.FileIcon} viewBox="0 0 16 16" fill="none">
      <path d={FILE_PATH} fill="#E8D44D" fillOpacity={0.15} stroke="#B8A62E" strokeWidth="1" />
      <path d={FOLD_PATH} stroke="#B8A62E" strokeWidth="1" strokeLinecap="round" />
      <path d="M5.5 9v2.5a1 1 0 01-2 0" stroke="#B8A62E" strokeWidth="1.3" strokeLinecap="round" />
      <path
        d="M8.5 9.5a1.2 1.2 0 012 .2.9.9 0 01-.4 1l-1.2.7a.9.9 0 00-.4 1 1.2 1.2 0 002 .2"
        stroke="#B8A62E"
        strokeWidth="1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function JsonIcon() {
  // Yellow file with curly braces
  return (
    <svg className={styles.FileIcon} viewBox="0 0 16 16" fill="none">
      <path d={FILE_PATH} fill="#E8D44D" fillOpacity={0.15} stroke="#B8A62E" strokeWidth="1" />
      <path d={FOLD_PATH} stroke="#B8A62E" strokeWidth="1" strokeLinecap="round" />
      <path
        d="M5.5 8C5 8 4.5 8.2 4.5 8.8v.7c0 .6-.5.9-1 1 .5.1 1 .4 1 1v.7c0 .6.5.8 1 .8M9.5 8c.5 0 1 .2 1 .8v.7c0 .6.5.9 1 1-.5.1-1 .4-1 1v.7c0 .6-.5.8-1 .8"
        stroke="#B8A62E"
        strokeWidth="1"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CssIcon() {
  // Purple file with # (selector)
  return (
    <svg className={styles.FileIcon} viewBox="0 0 16 16" fill="none">
      <path d={FILE_PATH} fill="#663399" fillOpacity={0.15} stroke="#663399" strokeWidth="1" />
      <path d={FOLD_PATH} stroke="#663399" strokeWidth="1" strokeLinecap="round" />
      <path
        d="M5 9.5h5M5 11.5h5M6.5 8l-1 5M8.5 8l-1 5"
        stroke="#663399"
        strokeWidth="1"
        strokeLinecap="round"
      />
    </svg>
  );
}

function MarkdownIcon() {
  // Gray file with M↓ glyph
  return (
    <svg className={styles.FileIcon} viewBox="0 0 16 16" fill="none">
      <path
        d={FILE_PATH}
        fill="var(--color-gray-300)"
        fillOpacity={0.3}
        stroke="var(--color-gray-400)"
        strokeWidth="1"
      />
      <path d={FOLD_PATH} stroke="var(--color-gray-400)" strokeWidth="1" strokeLinecap="round" />
      <path
        d="M4 13V8.5l1.75 2 1.75-2V13"
        stroke="var(--color-gray-500)"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M10 10v2.5M10 12.5l1.25-1.5M10 12.5l-1.25-1.5"
        stroke="var(--color-gray-500)"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function YamlIcon() {
  // Red file with indented lines (config-like)
  return (
    <svg className={styles.FileIcon} viewBox="0 0 16 16" fill="none">
      <path d={FILE_PATH} fill="#E34F26" fillOpacity={0.15} stroke="#E34F26" strokeWidth="1" />
      <path d={FOLD_PATH} stroke="#E34F26" strokeWidth="1" strokeLinecap="round" />
      <path
        d="M4.5 8.5h4M4.5 10.5h6M6 12.5h4.5"
        stroke="#E34F26"
        strokeWidth="1"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ConfigIcon() {
  // Gray file with a gear
  return (
    <svg className={styles.FileIcon} viewBox="0 0 16 16" fill="none">
      <path
        d={FILE_PATH}
        fill="var(--color-gray-300)"
        fillOpacity={0.3}
        stroke="var(--color-gray-400)"
        strokeWidth="1"
      />
      <path d={FOLD_PATH} stroke="var(--color-gray-400)" strokeWidth="1" strokeLinecap="round" />
      <circle cx="7.5" cy="10.5" r="1.5" stroke="var(--color-gray-500)" strokeWidth="1" />
      <path
        d="M7.5 7.5v1.2M7.5 12v1.2M5 10.5H4M11 10.5h-1M5.5 8.5l.8.8M9.2 12.2l.8.8M9.5 8.5l-.8.8M5.8 12.2l-.8.8"
        stroke="var(--color-gray-500)"
        strokeWidth="0.9"
        strokeLinecap="round"
      />
    </svg>
  );
}

function DefaultFileIcon() {
  // Plain file outline
  return (
    <svg className={styles.FileIcon} viewBox="0 0 16 16" fill="none">
      <path d={FILE_PATH} stroke="var(--color-gray-400)" strokeWidth="1" />
      <path d={FOLD_PATH} stroke="var(--color-gray-400)" strokeWidth="1" strokeLinecap="round" />
    </svg>
  );
}

function FileIcon({ fileType }: { fileType: string }) {
  switch (fileType) {
    case 'ts':
    case 'mts':
      return <TypeScriptIcon />;
    case 'tsx':
      return <TypeScriptReactIcon />;
    case 'js':
    case 'mjs':
      return <JavaScriptIcon />;
    case 'json':
      return <JsonIcon />;
    case 'css':
      return <CssIcon />;
    case 'md':
      return <MarkdownIcon />;
    case 'yaml':
      return <YamlIcon />;
    case 'toml':
      return <ConfigIcon />;
    default:
      return <DefaultFileIcon />;
  }
}

'use client';
import * as React from 'react';
import { Tree } from '@base-ui/react/tree';
import { ContextMenu } from '@base-ui/react/context-menu';
import styles from './index.module.css';
import { BASE_UI_FILES, type FileItem } from '../baseUIFiles';

// ---------------------------------------------------------------------------
// File-type icons
// ---------------------------------------------------------------------------

const FILE_TYPE_COLORS: Record<string, string> = {
  ts: '#3178C6',
  tsx: '#3178C6',
  js: '#F0DB4F',
  mjs: '#F0DB4F',
  json: '#F0DB4F',
  css: '#A855F7',
  md: '#9CA3AF',
  yaml: '#E34F26',
  mts: '#3178C6',
  toml: '#9CA3AF',
  other: '#9CA3AF',
};

function FileIcon({ fileType }: { fileType: string }) {
  const color = FILE_TYPE_COLORS[fileType] ?? '#9CA3AF';
  return (
    <svg className={styles.FileIcon} viewBox="0 0 16 16" style={{ color }}>
      <path
        d="M4 1h5.586a1 1 0 01.707.293l2.414 2.414a1 1 0 01.293.707V14a1 1 0 01-1 1H4a1 1 0 01-1-1V2a1 1 0 011-1z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.25"
      />
    </svg>
  );
}

function FolderClosedIcon() {
  return (
    <svg className={styles.FolderIcon} viewBox="0 0 16 16">
      <path
        d="M1.5 13h12a.5.5 0 00.5-.5V4.5a.5.5 0 00-.5-.5H7L5.5 2.5h-4a.5.5 0 00-.5.5v9.5a.5.5 0 00.5.5z"
        fill="#C09553"
      />
    </svg>
  );
}

function FolderOpenIcon() {
  return (
    <svg className={styles.FolderIcon} viewBox="0 0 16 16">
      <path
        d="M1.5 14h11l2-6H4.5l-2 6H1V3h4l1.5 1.5H13v3h1V3.5a.5.5 0 00-.5-.5H7L5.5 1.5h-4A.5.5 0 001 2v11.5a.5.5 0 00.5.5z"
        fill="#DCAD5A"
      />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

interface ClipboardState {
  itemId: string;
  operation: 'cut' | 'copy';
}

interface FileExplorerContextValue {
  editingItemId: string | null;
  clipboard: ClipboardState | null;
  startEditing: (itemId: string) => void;
  stopEditing: () => void;
  saveEdit: (itemId: string, newLabel: string) => void;
  deleteItem: (itemId: string) => void;
  addItem: (parentId: string, type: 'file' | 'folder') => void;
  cutItem: (itemId: string) => void;
  copyItem: (itemId: string) => void;
  pasteItem: (targetId: string) => void;
}

const FileExplorerContext = React.createContext<FileExplorerContextValue>({
  editingItemId: null,
  clipboard: null,
  startEditing: () => {},
  stopEditing: () => {},
  saveEdit: () => {},
  deleteItem: () => {},
  addItem: () => {},
  cutItem: () => {},
  copyItem: () => {},
  pasteItem: () => {},
});

// ---------------------------------------------------------------------------
// Editable label
// ---------------------------------------------------------------------------

function EditableLabel({ itemId, label }: { itemId: string; label: string }) {
  const { editingItemId, startEditing, stopEditing, saveEdit } =
    React.useContext(FileExplorerContext);
  const isEditing = editingItemId === itemId;
  const inputRef = React.useRef<HTMLInputElement>(null);
  const wasEditingRef = React.useRef(false);

  React.useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
      inputRef.current?.select();
      wasEditingRef.current = true;
    } else if (wasEditingRef.current) {
      wasEditingRef.current = false;
      document.querySelector<HTMLElement>(`[data-item-id="${itemId}"]`)?.focus();
    }
  }, [isEditing, itemId]);

  return (
    <Tree.ItemLabel
      className={styles.Label}
      onDoubleClick={(event) => {
        event.stopPropagation();
        startEditing(itemId);
      }}
    >
      {isEditing ? (
        <input
          ref={inputRef}
          className={styles.LabelInput}
          defaultValue={label}
          onKeyDown={(event) => {
            event.stopPropagation();
            if (event.key === 'Enter') {
              saveEdit(itemId, event.currentTarget.value);
            } else if (event.key === 'Escape') {
              stopEditing();
            }
          }}
          onBlur={(event) => {
            if (event.currentTarget.value) {
              saveEdit(itemId, event.currentTarget.value);
            } else {
              stopEditing();
            }
          }}
          onClick={(event) => event.stopPropagation()}
        />
      ) : undefined}
    </Tree.ItemLabel>
  );
}

// ---------------------------------------------------------------------------
// Tree mutation helpers
// ---------------------------------------------------------------------------

function findItem(items: FileItem[], targetId: string): FileItem | null {
  for (const item of items) {
    if (item.id === targetId) {
      return item;
    }
    if (item.children) {
      const found = findItem(item.children as FileItem[], targetId);
      if (found) {
        return found;
      }
    }
  }
  return null;
}

function findParentId(
  items: FileItem[],
  targetId: string,
  parentId: string | null = null,
): string | null {
  for (const item of items) {
    if (item.id === targetId) {
      return parentId;
    }
    if (item.children) {
      const found = findParentId(item.children as FileItem[], targetId, item.id);
      if (found !== null) {
        return found;
      }
    }
  }
  return null;
}

function updateLabel(items: FileItem[], targetId: string, newLabel: string): FileItem[] {
  return items.map((item) => {
    if (item.id === targetId) {
      return { ...item, label: newLabel };
    }
    if (item.children) {
      return {
        ...item,
        children: updateLabel(item.children as FileItem[], targetId, newLabel),
      };
    }
    return item;
  });
}

function removeItem(items: FileItem[], targetId: string): FileItem[] {
  return items
    .filter((item) => item.id !== targetId)
    .map((item) => {
      if (item.children) {
        return {
          ...item,
          children: removeItem(item.children as FileItem[], targetId),
        };
      }
      return item;
    });
}

function addChildItem(items: FileItem[], parentId: string, newItem: FileItem): FileItem[] {
  return items.map((item) => {
    if (item.id === parentId) {
      return { ...item, children: [...(item.children ?? []), newItem] };
    }
    if (item.children) {
      return {
        ...item,
        children: addChildItem(item.children as FileItem[], parentId, newItem),
      };
    }
    return item;
  });
}

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
  const [editingItemId, setEditingItemId] = React.useState<string | null>(null);
  const [expandedItems, setExpandedItems] = React.useState<string[]>([
    'packages',
    'packages/react',
    'packages/react/src',
  ]);
  const [contextMenuItemId, setContextMenuItemId] = React.useState<string | null>(null);
  const [clipboard, setClipboard] = React.useState<ClipboardState | null>(null);

  const contextMenuItem = contextMenuItemId ? findItem(items, contextMenuItemId) : null;
  const isContextMenuItemFolder = contextMenuItem?.children !== undefined;

  const getTargetFolderId = React.useCallback(
    (itemId: string): string => {
      const item = findItem(items, itemId);
      if (item?.children !== undefined) {
        return itemId;
      }
      return findParentId(items, itemId) ?? itemId;
    },
    [items],
  );

  const explorerContext = React.useMemo<FileExplorerContextValue>(
    () => ({
      editingItemId,
      clipboard,
      startEditing: (itemId: string) => setEditingItemId(itemId),
      stopEditing: () => setEditingItemId(null),
      saveEdit: (itemId: string, newLabel: string) => {
        if (newLabel.trim()) {
          setItems((prev) => updateLabel(prev, itemId, newLabel.trim()));
        }
        setEditingItemId(null);
      },
      deleteItem: (itemId: string) => {
        setItems((prev) => removeItem(prev, itemId));
        if (clipboard?.itemId === itemId) {
          setClipboard(null);
        }
      },
      addItem: (parentId: string, type: 'file' | 'folder') => {
        nextId += 1;
        const newId = `new-${type}-${nextId}`;
        const newItem: FileItem =
          type === 'folder'
            ? { id: newId, label: 'New folder', fileType: 'folder', children: [] }
            : { id: newId, label: 'New file', fileType: 'ts' };
        setItems((prev) => addChildItem(prev, parentId, newItem));
        setExpandedItems((prev) => (prev.includes(parentId) ? prev : [...prev, parentId]));
        setEditingItemId(newId);
      },
      cutItem: (itemId: string) => {
        setClipboard({ itemId, operation: 'cut' });
      },
      copyItem: (itemId: string) => {
        setClipboard({ itemId, operation: 'copy' });
      },
      pasteItem: (targetId: string) => {
        if (!clipboard) {
          return;
        }
        const folderId = getTargetFolderId(targetId);
        const sourceItem = findItem(items, clipboard.itemId);
        if (!sourceItem) {
          return;
        }
        if (clipboard.operation === 'copy') {
          const cloned = cloneItemWithNewIds(sourceItem);
          setItems((prev) => addChildItem(prev, folderId, cloned));
        } else {
          setItems((prev) => {
            const afterRemoval = removeItem(prev, clipboard.itemId);
            return addChildItem(afterRemoval, folderId, sourceItem);
          });
          setClipboard(null);
        }
        setExpandedItems((prev) => (prev.includes(folderId) ? prev : [...prev, folderId]));
      },
    }),
    [editingItemId, clipboard, items, getTargetFolderId],
  );

  return (
    <FileExplorerContext.Provider value={explorerContext}>
      <ContextMenu.Root>
        <ContextMenu.Trigger render={<div />}>
          <Tree.Root
            items={items}
            expandedItems={expandedItems}
            onExpandedItemsChange={(newExpanded) => setExpandedItems(newExpanded)}
            className={styles.Tree}
            onKeyDown={(event) => {
              const focused = (event.currentTarget as HTMLElement).querySelector<HTMLElement>(
                '[data-focused]',
              );
              const itemId = focused?.getAttribute('data-item-id');
              if (!itemId || editingItemId) {
                return;
              }
              if (event.key === 'F2') {
                event.preventDefault();
                setEditingItemId(itemId);
              } else if (event.key === 'Delete') {
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
                    <Tree.ItemGroupIndicator className={styles.GroupIndicator}>
                      <FolderClosedIcon />
                      <FolderOpenIcon />
                    </Tree.ItemGroupIndicator>
                    {!isFolder && <FileIcon fileType={fileItem.fileType} />}
                    <EditableLabel itemId={fileItem.id} label={fileItem.label} />
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
                onClick={() => contextMenuItemId && explorerContext.startEditing(contextMenuItemId)}
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

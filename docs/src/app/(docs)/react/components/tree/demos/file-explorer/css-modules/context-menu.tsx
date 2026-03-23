import * as React from 'react';
import type { CollectionItemId } from '@base-ui/react/types';
import { ContextMenu } from '@base-ui/react/context-menu';

// ---------------------------------------------------------------------------
// Context menu icons
// ---------------------------------------------------------------------------

function NewFileIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none">
      <path
        d="M4 1h5.586a1 1 0 01.707.293l2.414 2.414a1 1 0 01.293.707V14a1 1 0 01-1 1H4a1 1 0 01-1-1V2a1 1 0 011-1z"
        stroke="currentColor"
        strokeWidth="1.25"
      />
      <path d="M8 6v4M6 8h4" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
    </svg>
  );
}

function NewFolderIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none">
      <path
        d="M2 4.5C2 3.67 2.67 3 3.5 3H6.38a1 1 0 01.7.29l1.13 1.13a1 1 0 00.7.29H12.5c.83 0 1.5.67 1.5 1.5V12c0 .83-.67 1.5-1.5 1.5h-9A1.5 1.5 0 012 12V4.5z"
        stroke="currentColor"
        strokeWidth="1.25"
      />
      <path d="M8 7v4M6 9h4" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
    </svg>
  );
}

function CutIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none">
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

function CopyIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none">
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

function PasteIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none">
      <rect x="3" y="3" width="10" height="11" rx="1" stroke="currentColor" strokeWidth="1.25" />
      <path d="M6 3V2a1 1 0 011-1h2a1 1 0 011 1v1" stroke="currentColor" strokeWidth="1.25" />
    </svg>
  );
}

function RenameIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none">
      <path
        d="M11.5 1.5l3 3-9 9H2.5v-3l9-9z"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function DeleteIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none">
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
// Context menu component
// ---------------------------------------------------------------------------

interface ClipboardState {
  itemId: CollectionItemId;
  operation: 'cut' | 'copy';
}

interface FileExplorerContextMenuProps {
  children: React.ReactNode;
  classes: {
    Positioner: string;
    ContextMenuPopup: string;
    ContextMenuItem: string;
    ContextMenuSeparator: string;
    Shortcut: string;
    MenuIcon: string;
  };
  contextMenuItemId: CollectionItemId | null;
  isContextMenuItemFolder: boolean;
  clipboard: ClipboardState | null;
  onAddItem: (parentId: CollectionItemId, type: 'file' | 'folder') => void;
  onCutItem: (itemId: CollectionItemId) => void;
  onCopyItem: (itemId: CollectionItemId) => void;
  onPasteItem: (targetId: CollectionItemId) => void;
  onRenameItem: (itemId: CollectionItemId) => void;
  onDeleteItem: (itemId: CollectionItemId) => void;
}

export function FileExplorerContextMenu(props: FileExplorerContextMenuProps) {
  const {
    children,
    classes,
    contextMenuItemId,
    isContextMenuItemFolder,
    clipboard,
    onAddItem,
    onCutItem,
    onCopyItem,
    onPasteItem,
    onRenameItem,
    onDeleteItem,
  } = props;

  return (
    <ContextMenu.Root>
      <ContextMenu.Trigger render={<div />}>{children}</ContextMenu.Trigger>
      <ContextMenu.Portal>
        <ContextMenu.Positioner className={classes.Positioner}>
          <ContextMenu.Popup className={classes.ContextMenuPopup}>
            {isContextMenuItemFolder && (
              <ContextMenu.Item
                className={classes.ContextMenuItem}
                onClick={() => contextMenuItemId && onAddItem(contextMenuItemId, 'file')}
              >
                <NewFileIcon className={classes.MenuIcon} />
                New File
              </ContextMenu.Item>
            )}
            {isContextMenuItemFolder && (
              <ContextMenu.Item
                className={classes.ContextMenuItem}
                onClick={() => contextMenuItemId && onAddItem(contextMenuItemId, 'folder')}
              >
                <NewFolderIcon className={classes.MenuIcon} />
                New Folder
              </ContextMenu.Item>
            )}
            {isContextMenuItemFolder && (
              <ContextMenu.Separator className={classes.ContextMenuSeparator} />
            )}
            <ContextMenu.Item
              className={classes.ContextMenuItem}
              onClick={() => contextMenuItemId && onCutItem(contextMenuItemId)}
            >
              <CutIcon className={classes.MenuIcon} />
              Cut
              <span className={classes.Shortcut}>Ctrl+X</span>
            </ContextMenu.Item>
            <ContextMenu.Item
              className={classes.ContextMenuItem}
              onClick={() => contextMenuItemId && onCopyItem(contextMenuItemId)}
            >
              <CopyIcon className={classes.MenuIcon} />
              Copy
              <span className={classes.Shortcut}>Ctrl+C</span>
            </ContextMenu.Item>
            <ContextMenu.Item
              className={classes.ContextMenuItem}
              disabled={clipboard === null}
              onClick={() => contextMenuItemId && onPasteItem(contextMenuItemId)}
            >
              <PasteIcon className={classes.MenuIcon} />
              Paste
              <span className={classes.Shortcut}>Ctrl+V</span>
            </ContextMenu.Item>
            <ContextMenu.Separator className={classes.ContextMenuSeparator} />
            <ContextMenu.Item
              className={classes.ContextMenuItem}
              onClick={() => contextMenuItemId && onRenameItem(contextMenuItemId)}
            >
              <RenameIcon className={classes.MenuIcon} />
              Rename
              <span className={classes.Shortcut}>F2</span>
            </ContextMenu.Item>
            <ContextMenu.Item
              className={classes.ContextMenuItem}
              onClick={() => contextMenuItemId && onDeleteItem(contextMenuItemId)}
            >
              <DeleteIcon className={classes.MenuIcon} />
              Delete
              <span className={classes.Shortcut}>Del</span>
            </ContextMenu.Item>
          </ContextMenu.Popup>
        </ContextMenu.Positioner>
      </ContextMenu.Portal>
    </ContextMenu.Root>
  );
}

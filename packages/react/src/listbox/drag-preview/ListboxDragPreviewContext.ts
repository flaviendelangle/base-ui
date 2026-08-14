'use client';
import * as React from 'react';
import { warn } from '@base-ui/utils/warn';
import type { DragPreviewSettings } from '../../types/drag';
import type { ListboxDragItem } from '../drag-provider/ListboxDragProviderContext';

export interface ListboxDragPreviewDeclaration extends DragPreviewSettings {
  render: (items: ListboxDragItem[]) => React.ReactNode;
}

export interface ListboxDragPreviewRegistry {
  register: (declaration: ListboxDragPreviewDeclaration) => () => void;
}

export function createListboxDragPreviewRegistry(
  onChange: (declaration: ListboxDragPreviewDeclaration | null) => void,
): ListboxDragPreviewRegistry {
  let current: ListboxDragPreviewDeclaration | null = null;

  return {
    register(declaration) {
      if (current !== null && process.env.NODE_ENV !== 'production') {
        warn(
          'a <Listbox.DragProvider> contains more than one <Listbox.DragPreview>. ' +
            'A listbox has one drag preview, so the last one mounted wins. ' +
            'Render a single <Listbox.DragPreview> inside <Listbox.DragProvider>.',
        );
      }

      current = declaration;
      onChange(declaration);

      return () => {
        if (current === declaration) {
          current = null;
          onChange(null);
        }
      };
    },
  };
}

export const ListboxDragPreviewContext = React.createContext<ListboxDragPreviewRegistry | null>(
  null,
);

export function useListboxDragPreviewRegistry(): ListboxDragPreviewRegistry | null {
  return React.useContext(ListboxDragPreviewContext);
}

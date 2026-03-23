import type { CollectionItemId } from '../../types/collection';

export const defaultItemToId = (item: any): CollectionItemId => item.id;
export const defaultItemToStringLabel = (item: any): string => item.label;
export const defaultItemToChildren = (item: any): any[] | undefined => item.children;
export const defaultSetItemChildren = (item: any, children: any): any => ({ ...item, children });
export const defaultIsItemDisabled = (item: any): boolean => !!item.disabled;
export const defaultSetIsItemDisabled = (item: any, isDisabled: boolean): any => ({
  ...item,
  disabled: isDisabled,
});
export const defaultIsItemSelectionDisabled = (item: any): boolean => !!item.disabled;
export const defaultSetItemLabel = (item: any, label: string): any => ({ ...item, label });

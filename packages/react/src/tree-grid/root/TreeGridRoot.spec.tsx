import * as React from 'react';
import { expectType } from '#test-utils';
import { TreeGrid } from '..';

interface FileItem {
  id: string;
  label: string;
  size: number;
  children?: FileItem[];
}

const list = <TreeGrid.List>{() => null}</TreeGrid.List>;

// ---------------------------------------------------------------------------
// Direct use keeps the narrow inference
// ---------------------------------------------------------------------------

// Without `multiple`, selection is the single-select scalar shape.
<TreeGrid.Root
  items={[] as FileItem[]}
  onSelectedItemsChange={(selected) => {
    expectType<string | number | null, typeof selected>(selected);
  }}
>
  {list}
</TreeGrid.Root>;

// With `multiple` it is the array shape (plus the select-all sentinel, which is
// part of the multiple selection model).
<TreeGrid.Root
  items={[] as FileItem[]}
  multiple
  onSelectedItemsChange={(selected) => {
    expectType<(string | number)[] | typeof TreeGrid.SELECTION_ALL, typeof selected>(selected);
  }}
>
  {list}
</TreeGrid.Root>;

// The handlers receive mutable arrays, so a `useState` setter can be passed as is.
function StateSetterHandlers() {
  const [expandedItems, setExpandedItems] = React.useState<TreeGrid.ItemId[]>([]);
  const [selectedItems, setSelectedItems] = React.useState<
    TreeGrid.ItemId[] | typeof TreeGrid.SELECTION_ALL
  >([]);
  return (
    <TreeGrid.Root
      items={[] as FileItem[]}
      multiple
      expandedItems={expandedItems}
      onExpandedItemsChange={setExpandedItems}
      selectedItems={selectedItems}
      onSelectedItemsChange={setSelectedItems}
    >
      {list}
    </TreeGrid.Root>
  );
}
void StateSetterHandlers;

// The item model flows into collection accessors and render callbacks.
const fileCollection = TreeGrid.createItems([] as FileItem[], {
  getId: (item) => {
    expectType<FileItem, typeof item>(item);
    return item.id;
  },
  getLabel: (item) => item.label,
  getChildren: (item) => item.children,
});

<TreeGrid.Root items={fileCollection}>{list}</TreeGrid.Root>;

interface CustomItem {
  key: number;
  name: string;
  nodes?: CustomItem[];
}

const customItems: CustomItem[] = [];
const customCollection: TreeGrid.ItemCollection<CustomItem> = TreeGrid.createItems(customItems, {
  getId: (item) => item.key,
  getLabel: (item) => item.name,
  getChildren: (item) => item.nodes,
  setChildren: (item, children) => ({ ...item, nodes: [...children] }),
});

// @ts-expect-error Collections are opaque and expose no data methods.
customCollection.data;

<TreeGrid.Root
  items={customCollection}
  onItemsChange={(items) => {
    expectType<CustomItem[], typeof items>(items);
  }}
>
  <TreeGrid.List<CustomItem>>{(item) => item.name}</TreeGrid.List>
</TreeGrid.Root>;

// @ts-expect-error Arbitrary custom models must be wrapped with TreeGrid.createItems().
<TreeGrid.Root items={customItems}>{list}</TreeGrid.Root>;

TreeGrid.createItems(customItems, {
  // @ts-expect-error TreeGrid IDs must be strings or numbers.
  getId: () => Symbol('item'),
  getLabel: (item) => item.name,
});

// @ts-expect-error getLabel is required.
TreeGrid.createItems(customItems, { getId: (item) => item.key });

// @ts-expect-error getId is required.
TreeGrid.createItems(customItems, { getLabel: (item) => item.name });

const deeplyReadonlyStandardItems = [
  { id: 'parent', label: 'Parent', disabled: true, children: [{ id: 'child', label: 'Child' }] },
] as const;
<TreeGrid.Root items={deeplyReadonlyStandardItems}>{list}</TreeGrid.Root>;
const standardItemWithDisabled: TreeGrid.DefaultItem = {
  id: 'disabled',
  label: 'Disabled',
  disabled: true,
};
void standardItemWithDisabled;

// @ts-expect-error Root item accessors were replaced by TreeGrid.createItems().
<TreeGrid.Root items={[] as FileItem[]} itemToId={(item: FileItem) => item.id}>
  {list}
</TreeGrid.Root>;

const removedRootAccessors = {
  itemToStringLabel: (item: FileItem) => item.label,
  itemToChildren: (item: FileItem) => item.children,
  setItemChildren: (item: FileItem, children: readonly FileItem[]) => ({
    ...item,
    children: [...children],
  }),
  isItemDisabled: () => false,
  isItemSelectionDisabled: () => false,
  setItemLabel: (item: FileItem) => item,
};

type AssertNever<Value extends never> = Value;
type RemovedRootAccessorKeys = AssertNever<
  Extract<keyof TreeGrid.Root.Props<FileItem>, keyof typeof removedRootAccessors>
>;
void (null! as RemovedRootAccessorKeys);

// ---------------------------------------------------------------------------
// A wrapper typed on the public alias accepts either selection
// ---------------------------------------------------------------------------

// `Props<TItem>` deliberately leaves `multiple` broad: a wrapper is written once
// and has to accept whatever its own consumer passes through. Narrowing the
// default to `undefined` made this reject `multiple` outright.
function FileTreeGrid(props: TreeGrid.Root.Props<FileItem>) {
  return <TreeGrid.Root {...props} />;
}

<FileTreeGrid items={[]}>{list}</FileTreeGrid>;
<FileTreeGrid items={[]} multiple selectedItems={['a']}>
  {list}
</FileTreeGrid>;
<FileTreeGrid items={[]} selectedItems="a">
  {list}
</FileTreeGrid>;

// Narrowing it explicitly still works for a wrapper that wants one kind of selection only.
function MultiFileTreeGrid(props: TreeGrid.Root.Props<FileItem, true>) {
  return <TreeGrid.Root {...props} />;
}

<MultiFileTreeGrid items={[]} multiple selectedItems={['a']}>
  {list}
</MultiFileTreeGrid>;

// @ts-expect-error single selection accepts one item id, not an array.
<FileTreeGrid items={[]} selectedItems={['a', 'b']}>
  {list}
</FileTreeGrid>;

// @ts-expect-error multiple selection accepts an array or TreeGrid.SELECTION_ALL.
<FileTreeGrid items={[]} multiple selectedItems="a">
  {list}
</FileTreeGrid>;

<MultiFileTreeGrid
  items={[]}
  // @ts-expect-error the narrowed wrapper only accepts its declared selection.
  multiple={false}
>
  {list}
</MultiFileTreeGrid>;

// ---------------------------------------------------------------------------
// Parts infer the item type from their own props, or type the item as `any`
// ---------------------------------------------------------------------------

const customActionsRef = React.createRef<TreeGrid.Root.Actions<CustomItem> | null>();
<TreeGrid.Root items={customCollection} actionsRef={customActionsRef}>
  <TreeGrid.List<CustomItem>>{(item) => item.name}</TreeGrid.List>
</TreeGrid.Root>;

// Item renderers expose the model passed as a type argument.
<TreeGrid.Root items={[] as FileItem[]}>
  <TreeGrid.List<FileItem>>
    {(item) => {
      expectType<FileItem, typeof item>(item);
      return item.size;
    }}
  </TreeGrid.List>
</TreeGrid.Root>;

// Without one, the item is `any`, like `Combobox.List`'s: the list can't see the root's items.
<TreeGrid.Root items={[] as FileItem[]}>
  <TreeGrid.List>
    {(item) => {
      expectType<any, typeof item>(item);
      return item.size;
    }}
  </TreeGrid.List>
</TreeGrid.Root>;

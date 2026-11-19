import * as React from 'react';
import { describe } from 'vitest';
import { createRenderer, describeConformance } from '#test-utils';
import { TreeGrid } from '.';

/**
 * Conformance for every rendering `TreeGrid.*` part: `render`-prop merging, the
 * `className` callback, ref forwarding and prop spreading. One file rather than
 * one per part, because almost every part needs the same `TreeGrid.Root` +
 * `TreeGrid.List` + `TreeGrid.Item` scaffolding around it.
 *
 * `TreeGrid.Root` and `TreeGrid.FilterProvider` are absent on purpose:
 * they render no element of their own.
 */
// A single root row, so a part rendered through the list callback appears
// exactly once — conformance looks the element up by a shared test id.
const ITEMS = [{ id: 'a', label: 'A', children: [{ id: 'a1', label: 'A1' }] }];

/** The list callback that renders `node` for the one root row and nothing else. */
function onlyRootRow(node: React.ReactNode) {
  return (item: { id: string }) => (item.id === 'a' ? node : null);
}

describe('TreeGrid conformance', () => {
  const { render } = createRenderer();

  /** Render `node` as the only child of an item row. */
  function renderInItem(node: React.ReactNode, rootProps?: object) {
    return render(
      <TreeGrid.Root items={ITEMS} {...rootProps}>
        <TreeGrid.List>
          {onlyRootRow(
            <TreeGrid.Item itemId="a">
              <TreeGrid.ItemContent>{node}</TreeGrid.ItemContent>
            </TreeGrid.Item>,
          )}
        </TreeGrid.List>
      </TreeGrid.Root>,
    );
  }

  describe('<TreeGrid.List />', () => {
    describeConformance(<TreeGrid.List>{() => null}</TreeGrid.List>, () => ({
      refInstanceof: window.HTMLDivElement,
      render(node) {
        return render(<TreeGrid.Root items={ITEMS}>{node}</TreeGrid.Root>);
      },
    }));
  });

  describe('<TreeGrid.Label />', () => {
    describeConformance(<TreeGrid.Label />, () => ({
      refInstanceof: window.HTMLDivElement,
      render(node) {
        return render(
          <TreeGrid.Root items={[]}>
            {node}
            <TreeGrid.List>{() => null}</TreeGrid.List>
          </TreeGrid.Root>,
        );
      },
    }));
  });

  describe('<TreeGrid.Empty />', () => {
    describeConformance(<TreeGrid.Empty />, () => ({
      refInstanceof: window.HTMLDivElement,
      render(node) {
        // Rendered only when the tree has no items.
        return render(
          <TreeGrid.Root items={[]}>
            <TreeGrid.List>{() => null}</TreeGrid.List>
            {node}
          </TreeGrid.Root>,
        );
      },
    }));
  });

  describe('<TreeGrid.Status />', () => {
    describeConformance(<TreeGrid.Status />, () => ({
      refInstanceof: window.HTMLDivElement,
      render(node) {
        return render(<TreeGrid.Root items={ITEMS}>{node}</TreeGrid.Root>);
      },
    }));
  });

  describe('<TreeGrid.Input />', () => {
    describeConformance(<TreeGrid.Input />, () => ({
      refInstanceof: window.HTMLInputElement,
      render(node) {
        return render(
          <TreeGrid.FilterProvider>
            <TreeGrid.Root items={ITEMS}>{node}</TreeGrid.Root>
          </TreeGrid.FilterProvider>,
        );
      },
    }));
  });

  describe('<TreeGrid.Clear />', () => {
    describeConformance(<TreeGrid.Clear />, () => ({
      refInstanceof: window.HTMLButtonElement,
      button: true,
      render(node) {
        // Rendered only while the query is not empty.
        return render(
          <TreeGrid.FilterProvider defaultValue="a">
            <TreeGrid.Root items={ITEMS}>{node}</TreeGrid.Root>
          </TreeGrid.FilterProvider>,
        );
      },
    }));
  });

  describe('<TreeGrid.Item />', () => {
    describeConformance(
      <TreeGrid.Item itemId="a">
        <TreeGrid.ItemContent />
      </TreeGrid.Item>,
      () => ({
        refInstanceof: window.HTMLDivElement,
        render(node) {
          return render(
            <TreeGrid.Root items={ITEMS}>
              <TreeGrid.List>{onlyRootRow(node)}</TreeGrid.List>
            </TreeGrid.Root>,
          );
        },
      }),
    );
  });

  describe('<TreeGrid.ItemExpansionTrigger />', () => {
    describeConformance(<TreeGrid.ItemExpansionTrigger />, () => ({
      refInstanceof: window.HTMLButtonElement,
      testRenderPropWith: 'button',
      button: true,
      render(node) {
        return renderInItem(node);
      },
    }));
  });

  describe('<TreeGrid.ItemButton />', () => {
    describeConformance(<TreeGrid.ItemButton />, () => ({
      refInstanceof: window.HTMLButtonElement,
      testRenderPropWith: 'button',
      render(node) {
        return renderInItem(node);
      },
    }));
  });

  describe('<TreeGrid.ItemInput />', () => {
    describeConformance(<TreeGrid.ItemInput />, () => ({
      refInstanceof: window.HTMLInputElement,
      testRenderPropWith: 'input',
      render(node) {
        return renderInItem(node);
      },
    }));
  });

  describe('<TreeGrid.ItemLink />', () => {
    describeConformance(<TreeGrid.ItemLink />, () => ({
      refInstanceof: window.HTMLAnchorElement,
      testRenderPropWith: 'a',
      render(node) {
        return renderInItem(node);
      },
    }));
  });

  describe('<TreeGrid.ItemControl />', () => {
    describeConformance(<TreeGrid.ItemControl />, () => ({
      refInstanceof: window.HTMLDivElement,
      render(node) {
        return renderInItem(node);
      },
    }));
  });

  describe('<TreeGrid.ItemGroupIndicator />', () => {
    describeConformance(<TreeGrid.ItemGroupIndicator />, () => ({
      refInstanceof: window.HTMLSpanElement,
      testRenderPropWith: 'span',
      render(node) {
        return renderInItem(node);
      },
    }));
  });

  describe('<TreeGrid.ItemIndentGuide />', () => {
    describeConformance(<TreeGrid.ItemIndentGuide />, () => ({
      refInstanceof: window.HTMLSpanElement,
      testRenderPropWith: 'span',
      // One guide per ancestor level, so a root row renders none: put it on the
      // nested child instead.
      render(node) {
        return render(
          <TreeGrid.Root items={ITEMS} defaultExpandedItems={['a']}>
            <TreeGrid.List>
              {(item: { id: string }) =>
                item.id === 'a1' ? (
                  <TreeGrid.Item itemId="a1">
                    <TreeGrid.ItemContent>{node}</TreeGrid.ItemContent>
                  </TreeGrid.Item>
                ) : null
              }
            </TreeGrid.List>
          </TreeGrid.Root>,
        );
      },
    }));
  });

  describe('<TreeGrid.ItemContent />', () => {
    describeConformance(<TreeGrid.ItemContent />, () => ({
      refInstanceof: window.HTMLDivElement,
      testRenderPropWith: 'div',
      render(node) {
        return render(
          <TreeGrid.Root items={ITEMS}>
            <TreeGrid.List>
              {() => (
                <TreeGrid.Item itemId="a">
                  <TreeGrid.ItemContent>{node}</TreeGrid.ItemContent>
                </TreeGrid.Item>
              )}
            </TreeGrid.List>
          </TreeGrid.Root>,
        );
      },
    }));
  });

  describe('<TreeGrid.ItemCheckbox />', () => {
    describeConformance(<TreeGrid.ItemCheckbox />, () => ({
      refInstanceof: window.HTMLSpanElement,
      testRenderPropWith: 'span',
      render(node) {
        return renderInItem(node, { multiple: true });
      },
    }));
  });

  describe('<TreeGrid.ItemCheckboxIndicator />', () => {
    describeConformance(<TreeGrid.ItemCheckboxIndicator keepMounted />, () => ({
      refInstanceof: window.HTMLSpanElement,
      testRenderPropWith: 'span',
      render(node) {
        return renderInItem(<TreeGrid.ItemCheckbox>{node}</TreeGrid.ItemCheckbox>, {
          multiple: true,
        });
      },
    }));
  });
});

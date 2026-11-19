import * as React from 'react';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { screen, fireEvent, waitFor, act } from '@mui/internal-test-utils';
import { createRenderer, isJSDOM, waitSingleFrame } from '#test-utils';
import { TreeGrid } from '..';

const { render } = createRenderer();

interface Item {
  id: string;
  label: string;
  children?: Item[];
}

const ITEMS: Item[] = [
  {
    id: 'parent',
    label: 'Parent',
    children: Array.from({ length: 5 }, (_, i) => ({
      id: `child-${i + 1}`,
      label: `Child ${i + 1}`,
    })),
  },
  { id: 'sibling', label: 'Sibling' },
];

function AnimatedTreeGrid(props: {
  actionsRef: React.RefObject<TreeGrid.Root.Actions | null>;
  defaultExpandedItems?: string[];
  groupRef?: React.Ref<HTMLDivElement>;
}) {
  return (
    <TreeGrid.Root
      items={ITEMS}
      actionsRef={props.actionsRef}
      defaultExpandedItems={props.defaultExpandedItems}
    >
      <TreeGrid.List aria-label="Files">
        {(item: Item) => (
          <React.Fragment>
            <TreeGrid.Item itemId={item.id} data-testid={`item-${item.id}`}>
              <TreeGrid.ItemContent>
                <TreeGrid.ItemExpansionTrigger data-testid={`trigger-${item.id}`} />
                {item.label}
                <button type="button" data-testid={`action-${item.id}`}>
                  Action
                </button>
              </TreeGrid.ItemContent>
            </TreeGrid.Item>
            <TreeGrid.GroupTransition
              ref={props.groupRef}
              className="TestGroupTransition"
              data-testid={`gt-${item.id}`}
            />
          </React.Fragment>
        )}
      </TreeGrid.List>
    </TreeGrid.Root>
  );
}

// The focus loss happens as the group-transition wrapper mounts/unmounts and
// the focused row is re-parented between the list and the wrapper — a real CSS
// transition and real focus tracking are only faithful in Chromium.
describe.skipIf(isJSDOM)('<TreeGrid.GroupTransition /> focus preservation', () => {
  let style: HTMLStyleElement;
  let animationsDisabled: boolean;

  beforeEach(() => {
    // The test setup disables animations globally; these tests need the real
    // 500ms transition to observe the group mid-flight.
    animationsDisabled = globalThis.BASE_UI_ANIMATIONS_DISABLED;
    globalThis.BASE_UI_ANIMATIONS_DISABLED = false;
    style = document.createElement('style');
    style.textContent = `
      .TestGroupTransition {
        overflow: hidden;
        height: var(--tree-grid-group-transition-height);
        transition: height 500ms linear;
      }
      .TestGroupTransition[data-starting-style],
      .TestGroupTransition[data-ending-style] {
        height: 0;
      }
    `;
    document.head.appendChild(style);
  });

  afterEach(() => {
    globalThis.BASE_UI_ANIMATIONS_DISABLED = animationsDisabled;
    style.remove();
  });

  it('forwards its ref to the animated group element', async () => {
    const actionsRef = React.createRef<TreeGrid.Root.Actions>();
    const groupRef = React.createRef<HTMLDivElement>();
    await render(<AnimatedTreeGrid actionsRef={actionsRef} groupRef={groupRef} />);

    act(() => actionsRef.current!.setItemExpansion('parent', true));

    expect(groupRef.current).toBe(screen.getByTestId('gt-parent'));
    await act(async () => {
      await waitSingleFrame();
      await waitSingleFrame();
    });
    // Still mid-transition: the wrapper waits for the real animation to finish.
    expect(screen.getByTestId('gt-parent')).toBe(groupRef.current);
    await waitFor(() => expect(screen.queryByTestId('gt-parent')).toBeNull());
    expect(groupRef.current).toBe(null);
  });

  it('moves focus to the collapsing ancestor when a collapse hides the focused row', async () => {
    const actionsRef = React.createRef<TreeGrid.Root.Actions>();
    await render(<AnimatedTreeGrid actionsRef={actionsRef} defaultExpandedItems={['parent']} />);

    // Focus a child that is currently a top-level row of the list.
    const child = screen.getByTestId('item-child-2') as HTMLElement;
    await act(async () => {
      child.focus();
    });
    expect(document.activeElement).toBe(child);

    // Collapse the parent programmatically (as e.g. a "collapse all" control
    // would). The child is hidden and its row unmounts as the group animates
    // out; before the fix this dropped focus to <body> and left `focusedItemId`
    // pointing at the now-hidden child, killing keyboard navigation.
    act(() => {
      actionsRef.current!.setItemExpansion('parent', false);
    });
    // The collapse animates out. React 18 defers the work scheduled inside an
    // async `act` until it resolves, so wait on the DOM rather than on frames.
    await waitFor(() =>
      expect(screen.getByTestId('gt-parent')).toHaveAttribute('data-ending-style'),
    );

    await waitFor(() => expect(screen.queryByTestId('gt-parent')).toBeNull());
    expect(document.activeElement).toBe(screen.getByTestId('item-parent'));
    expect(actionsRef.current!.getFocusedItemId()).toBe('parent');
  });

  it('immediately removes collapsing descendants from focus and the accessibility tree', async () => {
    const actionsRef = React.createRef<TreeGrid.Root.Actions>();
    await render(<AnimatedTreeGrid actionsRef={actionsRef} defaultExpandedItems={['parent']} />);

    const parent = screen.getByTestId('item-parent');
    const childAction = screen.getByTestId('action-child-1');
    act(() => {
      parent.focus();
      actionsRef.current!.setItemExpansion('parent', false);
    });

    const transition = screen.getByTestId('gt-parent');
    expect(transition).toHaveAttribute('aria-hidden', 'true');
    expect(transition).toHaveAttribute('inert');

    childAction.focus();
    expect(document.activeElement).toBe(parent);
  });

  it('keeps focus on a child navigated to while the expand animation is running', async () => {
    const actionsRef = React.createRef<TreeGrid.Root.Actions>();
    await render(<AnimatedTreeGrid actionsRef={actionsRef} />);

    // Focus the collapsed parent, then expand it with the keyboard.
    const parent = screen.getByTestId('item-parent') as HTMLElement;
    await act(async () => {
      parent.focus();
    });
    fireEvent.keyDown(parent, { key: 'ArrowRight' });

    // The children render inside the transition wrapper while the group animates
    // in (500ms). Move focus into the first child while it still lives in the
    // wrapper, then verify the store registered the focus.
    const gt = await screen.findByTestId('gt-parent');
    const child = screen.getByTestId('item-child-1') as HTMLElement;
    expect(gt.contains(child)).toBe(true);
    await act(async () => {
      child.focus();
    });
    expect(actionsRef.current!.getFocusedItemId()).toBe('child-1');

    // When the animation completes the wrapper unmounts and the child remounts
    // as a top-level row; before the fix its DOM node was destroyed and focus
    // fell to <body>.
    await waitFor(() => expect(screen.queryByTestId('gt-parent')).toBeNull());
    expect(document.activeElement).toBe(screen.getByTestId('item-child-1'));
    expect(actionsRef.current!.getFocusedItemId()).toBe('child-1');
  });
});

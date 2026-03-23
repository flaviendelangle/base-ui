'use client';
import * as React from 'react';
import { Tree } from '@base-ui/react/tree';
import styles from './tree.module.css';

interface TeamMember {
  id: string;
  name: string;
  role: 'developer' | 'designer' | 'manager';
  label: string;
  children?: TeamMember[];
}

function makeLabel(name: string, role: string) {
  return `${name} — ${role}`;
}

const initialItems: TeamMember[] = [
  {
    id: 'engineering',
    name: 'Engineering',
    role: 'manager',
    label: makeLabel('Engineering', 'manager'),
    children: [
      { id: 'alice', name: 'Alice', role: 'developer', label: makeLabel('Alice', 'developer') },
      { id: 'bob', name: 'Bob', role: 'developer', label: makeLabel('Bob', 'developer') },
      { id: 'carol', name: 'Carol', role: 'designer', label: makeLabel('Carol', 'designer') },
    ],
  },
  {
    id: 'design',
    name: 'Design',
    role: 'manager',
    label: makeLabel('Design', 'manager'),
    children: [
      { id: 'dave', name: 'Dave', role: 'designer', label: makeLabel('Dave', 'designer') },
      { id: 'eve', name: 'Eve', role: 'designer', label: makeLabel('Eve', 'designer') },
    ],
  },
  {
    id: 'frank',
    name: 'Frank',
    role: 'developer',
    label: makeLabel('Frank', 'developer'),
  },
];

const ROLES = ['developer', 'designer', 'manager'] as const;

function MultiFieldForm({ item, cancel }: { item: TeamMember; cancel: () => void }) {
  const [localName, setLocalName] = React.useState(item.name);
  const [localRole, setLocalRole] = React.useState<TeamMember['role']>(item.role);
  const nameRef = React.useRef<HTMLInputElement>(null);
  const actionsRef = React.useContext(ActionsRefContext);

  React.useEffect(() => {
    nameRef.current?.focus();
    nameRef.current?.select();
  }, []);

  const handleSave = () => {
    actionsRef.current?.setItemLabel(item.id, makeLabel(localName, localRole));
    // Also update custom fields via items mutation
    actionsRef.current?.cancelEditing();
  };

  return (
    <React.Fragment>
      <input
        ref={nameRef}
        value={localName}
        onChange={(event) => setLocalName(event.currentTarget.value)}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            cancel();
          } else if (event.key === 'Enter') {
            handleSave();
          }
        }}
        placeholder="Name"
      />
      <select
        value={localRole}
        onChange={(event) => setLocalRole(event.currentTarget.value as TeamMember['role'])}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            cancel();
          } else if (event.key === 'Enter') {
            handleSave();
          }
        }}
      >
        {ROLES.map((r) => (
          <option key={r} value={r}>
            {r}
          </option>
        ))}
      </select>
      <button type="button" data-primary="" onClick={() => handleSave()}>
        Save
      </button>
      <button type="button" onClick={() => cancel()}>
        Cancel
      </button>
    </React.Fragment>
  );
}

const ActionsRefContext = React.createContext<
  React.RefObject<Tree.Root.Actions<TeamMember> | null>
>({
  current: null,
});

export default function MultiFieldEditingTree() {
  const [items, setItems] = React.useState(initialItems);
  const actionsRef = React.useRef<Tree.Root.Actions<TeamMember>>(null);

  const itemToStringLabel = React.useCallback((item: TeamMember) => item.label, []);

  return (
    <div className={styles.wrapper}>
      <div>
        <h3 className={styles.heading}>Multi-field editing</h3>
        <p className={styles.description}>
          Double-click to edit both name and role. Press Enter or Save to confirm, Escape or Cancel
          to discard.
        </p>
      </div>
      <ActionsRefContext.Provider value={actionsRef}>
        <Tree.Root
          items={items}
          onItemsChange={setItems}
          isItemEditable
          defaultExpandedItems={['engineering', 'design']}
          className={styles.tree}
          itemToStringLabel={itemToStringLabel}
          actionsRef={actionsRef}
        >
          {(item) => (
            <Tree.Item itemId={item.id} className={styles.item}>
              <Tree.ItemExpansionTrigger className={styles.expansionTrigger}>
                <ChevronIcon />
              </Tree.ItemExpansionTrigger>
              <Tree.ItemLabel className={styles.label} />
              <Tree.ItemLabelEditing>
                {({ cancel }) => <MultiFieldForm item={item} cancel={cancel} />}
              </Tree.ItemLabelEditing>
            </Tree.Item>
          )}
        </Tree.Root>
      </ActionsRefContext.Provider>
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

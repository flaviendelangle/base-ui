'use client';
import { Draggable } from '@base-ui/react/draggable';

interface Task {
  id: string;
  title: string;
}

const taskKind = Draggable.createKind<number>('sortable-task');
const INITIAL_TASKS: Task[] = [
  { id: 'spec', title: 'Write the spec' },
  { id: 'ui', title: 'Sketch the UI' },
  { id: 'repo', title: 'Set up the repo' },
  { id: 'api', title: 'Wire the API' },
];

const itemClass =
  'box-border border border-neutral-950 bg-white px-3 py-2 text-sm leading-5 text-neutral-950 shadow-sm outline-none transition data-[dragging]:cursor-grabbing data-[dragging]:opacity-40 hover:bg-neutral-100 focus-visible:outline-2 focus-visible:-outline-offset-1 focus-visible:outline-neutral-950 dark:border-white dark:bg-neutral-950 dark:text-white dark:hover:bg-neutral-800 dark:focus-visible:outline-white';

export default function SortableList() {
  return (
    <Draggable.Provider>
      <p className="m-0 text-sm text-neutral-500 dark:text-neutral-400">
        Collision-based sorting will be implemented here.
      </p>
      <div className="flex flex-col gap-2" role="list">
        <Draggable.CollisionProvider>
          {INITIAL_TASKS.map((task, index) => (
            <Draggable.Root
              key={task.id}
              kind={taskKind}
              payload={index}
              role="listitem"
              className={itemClass}
            >
              {task.title}
            </Draggable.Root>
          ))}
        </Draggable.CollisionProvider>
      </div>
    </Draggable.Provider>
  );
}

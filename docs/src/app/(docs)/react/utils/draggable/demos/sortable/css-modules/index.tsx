'use client';
import { Draggable } from '@base-ui/react/draggable';
import styles from '../sortable.module.css';

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

export default function SortableList() {
  return (
    <Draggable.Provider>
      <p className={styles.Hint}>Collision-based sorting will be implemented here.</p>
      <div className={`${styles.Root} ${styles.List}`} role="list">
        <Draggable.CollisionProvider>
          {INITIAL_TASKS.map((task, index) => (
            <Draggable.Root
              key={task.id}
              kind={taskKind}
              payload={index}
              role="listitem"
              className={styles.Item}
            >
              {task.title}
            </Draggable.Root>
          ))}
        </Draggable.CollisionProvider>
      </div>
    </Draggable.Provider>
  );
}

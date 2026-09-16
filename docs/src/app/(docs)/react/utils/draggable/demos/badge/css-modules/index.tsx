'use client';
import * as React from 'react';
import { Draggable } from '@base-ui/react/draggable';
import styles from '../../badge.module.css';

type SlotId = 'left' | 'center' | 'right';

interface WidgetData {
  id: string;
  title: string;
  value: string;
  detail: string;
}

const widgetKind = Draggable.createKind<string>('draggable/preview-widget');

const SLOTS: { id: SlotId; label: string }[] = [
  { id: 'left', label: 'Left dashboard slot' },
  { id: 'center', label: 'Center dashboard slot' },
  { id: 'right', label: 'Right dashboard slot' },
];

const WIDGETS: WidgetData[] = [
  { id: 'visitors', title: 'Visitors', value: '2,420', detail: 'Last 7 days' },
  { id: 'conversion', title: 'Conversion', value: '3.8%', detail: 'Up 0.4%' },
];

const WIDGETS_BY_ID = new Map(WIDGETS.map((widget) => [widget.id, widget]));

function Widget({ payload, children }: { payload: string; children: React.ReactNode }) {
  return (
    <Draggable.Root kind={widgetKind} payload={payload} role="button" className={styles.Widget}>
      {children}
    </Draggable.Root>
  );
}

function WidgetHeader({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.WidgetHeader}>
      <svg className={styles.Grip} width="8" height="14" viewBox="0 0 8 14" aria-hidden="true">
        <g fill="currentColor">
          <circle cx="2" cy="2" r="1.2" />
          <circle cx="6" cy="2" r="1.2" />
          <circle cx="2" cy="7" r="1.2" />
          <circle cx="6" cy="7" r="1.2" />
          <circle cx="2" cy="12" r="1.2" />
          <circle cx="6" cy="12" r="1.2" />
        </g>
      </svg>
      {children}
    </div>
  );
}

function WidgetContent({ children }: { children: React.ReactNode }) {
  return <div className={styles.WidgetBody}>{children}</div>;
}

export default function CustomPreviewDashboard() {
  const [widgetSlots, setWidgetSlots] = React.useState(() => {
    return new Map<SlotId, string>([
      ['left', 'visitors'],
      ['center', 'conversion'],
    ]);
  });

  function moveWidget(widgetId: string, slot: SlotId) {
    setWidgetSlots((current) => {
      const next = new Map(current);
      for (const [slotId, id] of next) {
        if (id === widgetId) {
          next.delete(slotId);
          break;
        }
      }
      next.set(slot, widgetId);
      return next;
    });
  }

  return (
    <Draggable.Provider>
      <div className={styles.Root}>
        <div className={styles.Grid}>
          {SLOTS.map((slot) => {
            const widget = WIDGETS_BY_ID.get(widgetSlots.get(slot.id));
            return (
              <Draggable.Target
                key={slot.id}
                className={styles.Slot}
                data-empty={widget ? undefined : ''}
                accept={widgetKind}
                canDrop={() => widget === undefined}
                onDraggableDrop={({ source }) => moveWidget(source.payload, slot.id)}
              >
                {widget ? (
                  <Widget payload={widget.id}>
                    <WidgetHeader>{widget.title}</WidgetHeader>
                    <WidgetContent>
                      <strong>{widget.value}</strong>
                      <span>{widget.detail}</span>
                    </WidgetContent>
                    <Draggable.Preview className={styles.Badge} offset="pointer">
                      <span className={styles.BadgeValue}>{widget.value}</span>
                      {widget.title}
                    </Draggable.Preview>
                  </Widget>
                ) : (
                  <span className={styles.Empty}>Drop widget</span>
                )}
              </Draggable.Target>
            );
          })}
        </div>
      </div>
    </Draggable.Provider>
  );
}

'use client';
import * as React from 'react';
import { Draggable } from '@base-ui/react/draggable';

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

const WIDGET_CLASS =
  'box-border flex min-h-32 w-full data-[dragging]:cursor-grabbing cursor-grab flex-col border border-neutral-950 bg-white text-neutral-950 transition data-[dragging]:opacity-40 hover:bg-neutral-100 focus-visible:outline-2 focus-visible:-outline-offset-1 focus-visible:outline-neutral-950 dark:border-white dark:bg-neutral-950 dark:text-white dark:hover:bg-neutral-800 dark:focus-visible:outline-white';
const BADGE_CLASS =
  'inline-flex items-center gap-1.5 whitespace-nowrap border border-neutral-950 bg-white px-2 py-1 text-xs leading-4 font-semibold text-neutral-950 shadow-[0.25rem_0.25rem_0_rgb(0_0_0_/_12%)] dark:border-white dark:bg-neutral-950 dark:text-white dark:shadow-none';
const BADGE_VALUE_CLASS = 'bg-neutral-950 px-1 text-white dark:bg-white dark:text-neutral-950';

function Widget({ payload, children }: { payload: string; children: React.ReactNode }) {
  return (
    <Draggable.Root kind={widgetKind} payload={payload} role="button" className={WIDGET_CLASS}>
      {children}
    </Draggable.Root>
  );
}

function WidgetHeader({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 border-b border-neutral-200 px-3 py-2 text-xs leading-4 font-semibold dark:border-neutral-700">
      <svg
        className="shrink-0 text-neutral-400 dark:text-neutral-500"
        width="8"
        height="14"
        viewBox="0 0 8 14"
        aria-hidden="true"
      >
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
  return <div className="flex flex-1 flex-col justify-center px-3 py-2.5">{children}</div>;
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
      <div className="w-full select-none">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {SLOTS.map((slot) => {
            const widget = WIDGETS_BY_ID.get(widgetSlots.get(slot.id));
            return (
              <Draggable.Target
                key={slot.id}
                className="box-border flex min-h-32 items-stretch data-[empty]:items-center data-[empty]:justify-center data-[empty]:border data-[empty]:border-dashed data-[empty]:border-neutral-300 data-[drag-over]:border-solid data-[drag-over]:border-neutral-950 data-[drag-over]:bg-neutral-100 dark:data-[empty]:border-neutral-700 dark:data-[drag-over]:border-white dark:data-[drag-over]:bg-neutral-800"
                data-empty={widget ? undefined : ''}
                accept={widgetKind}
                canDrop={() => widget === undefined}
                onDraggableDrop={({ source }) => moveWidget(source.payload, slot.id)}
              >
                {widget ? (
                  <Widget payload={widget.id}>
                    <WidgetHeader>{widget.title}</WidgetHeader>
                    <WidgetContent>
                      <strong className="text-xl leading-6 font-medium">{widget.value}</strong>
                      <span className="text-xs leading-4 text-neutral-500 dark:text-neutral-400">
                        {widget.detail}
                      </span>
                    </WidgetContent>
                    <Draggable.Preview className={BADGE_CLASS} offset="pointer">
                      <span className={BADGE_VALUE_CLASS}>{widget.value}</span>
                      {widget.title}
                    </Draggable.Preview>
                  </Widget>
                ) : (
                  <span className="text-xs leading-4 font-medium text-neutral-500 dark:text-neutral-400">
                    Drop widget
                  </span>
                )}
              </Draggable.Target>
            );
          })}
        </div>
      </div>
    </Draggable.Provider>
  );
}

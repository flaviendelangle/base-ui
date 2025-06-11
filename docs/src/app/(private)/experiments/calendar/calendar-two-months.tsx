'use client';
import * as React from 'react';
import clsx from 'clsx';
import { TemporalAdapterProvider } from '@base-ui-components/react/temporal-adapter-provider';
import { TemporalAdapterLuxon } from '@base-ui-components/react/temporal-adapter-luxon';
import { Calendar } from '@base-ui-components/react/calendar';
import { Separator } from '@base-ui-components/react/separator';
import styles from './calendar.module.css';

const adapter = new TemporalAdapterLuxon();

function Header() {
  const { visibleDate } = Calendar.useContext();

  return (
    <header className={styles.Header}>
      <div className={styles.HeaderPanel}>
        <Calendar.SetPreviousMonth className={clsx(styles.SetPreviousMonth)}>
          ◀
        </Calendar.SetPreviousMonth>
        <span className={styles.HeaderLabel}>
          {visibleDate.toFormat('MMMM yyyy')}
        </span>
        <span />
      </div>
      <div className={styles.HeaderPanel}>
        <span />
        <span className={styles.HeaderLabel}>
          {visibleDate.plus({ month: 1 }).toFormat('MMMM yyyy')}
        </span>
        <Calendar.SetNextMonth className={clsx(styles.SetNextMonth)}>
          ▶
        </Calendar.SetNextMonth>
      </div>
    </header>
  );
}

function DayGrid(props: { offset: 0 | 1 }) {
  const { offset } = props;

  return (
    <Calendar.DayGrid className={styles.DayGrid}>
      <Calendar.DayGridHeader className={styles.DayGridHeader}>
        <Calendar.DayGridHeaderRow className={styles.DayGridHeaderRow}>
          {(day) => (
            <Calendar.DayGridHeaderCell
              value={day}
              key={day.toString()}
              className={styles.DayGridHeaderCell}
            />
          )}
        </Calendar.DayGridHeaderRow>
      </Calendar.DayGridHeader>
      <Calendar.DayGridBody className={styles.DayGridBody} offset={offset}>
        {(week) => (
          <Calendar.DayGridRow
            value={week}
            key={week.toString()}
            className={styles.DayGridRow}
          >
            {(day) => (
              <Calendar.DayGridCell
                value={day}
                key={day.toString()}
                className={styles.DayGridCell}
              >
                <Calendar.DayButton className={styles.DayButton} />
              </Calendar.DayGridCell>
            )}
          </Calendar.DayGridRow>
        )}
      </Calendar.DayGridBody>
    </Calendar.DayGrid>
  );
}

export default function CalendarTwoMonths() {
  return (
    <TemporalAdapterProvider adapter={adapter}>
      <Calendar.Root
        monthPageSize={2}
        className={clsx(styles.Root, styles.RootWithTwoPanels)}
      >
        <Header />
        <div className={styles.RootWithTwoPanelsContent}>
          <DayGrid offset={0} />
          <Separator className={styles.DayGridSeparator} />
          <DayGrid offset={1} />
        </div>
      </Calendar.Root>
    </TemporalAdapterProvider>
  );
}

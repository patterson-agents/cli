import * as React from 'react';

export interface StatProps {
  /** The headline figure, e.g. "86M" or "98%". */
  value: React.ReactNode;
  /** Supporting label beneath the number. */
  label: React.ReactNode;
  /** @default "sky" */
  tone?: 'sky' | 'navy' | 'teal' | 'green';
  /** @default "left" */
  align?: 'left' | 'center';
  style?: React.CSSProperties;
}

/** Big-number statistic block used across Patterson marketing surfaces. */
export function Stat(props: StatProps): JSX.Element;

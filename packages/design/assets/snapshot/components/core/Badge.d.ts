import * as React from 'react';

export interface BadgeProps {
  children?: React.ReactNode;
  /** @default "navy" */
  tone?: 'navy' | 'sky' | 'green' | 'teal' | 'purple' | 'gray' | 'warning' | 'danger';
  /** Filled instead of soft-tint. @default false */
  solid?: boolean;
  style?: React.CSSProperties;
}

/** Small uppercase status/label badge in brand & semantic tones. */
export function Badge(props: BadgeProps): JSX.Element;

import * as React from 'react';

export interface CardProps {
  children?: React.ReactNode;
  /** Drop shadow depth. @default "sm" */
  elevation?: 'none' | 'xs' | 'sm' | 'md' | 'lg';
  /** Top accent stripe in a brand color (or any CSS color). */
  accent?: 'navy' | 'sky' | 'green' | 'teal' | 'purple' | string | null;
  /** CSS padding. @default "var(--space-5)" */
  padding?: string;
  /** Lift + deepen shadow on hover. @default false */
  interactive?: boolean;
  style?: React.CSSProperties;
}

/**
 * White surface container with soft navy-tinted shadow, subtle border and an
 * optional top accent stripe.
 *
 * @startingPoint section="Core" subtitle="White card — soft shadow, optional accent stripe" viewport="700x260"
 */
export function Card(props: CardProps): JSX.Element;

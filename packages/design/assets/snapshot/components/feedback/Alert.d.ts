import * as React from 'react';

export interface AlertProps {
  children?: React.ReactNode;
  /** @default "info" */
  tone?: 'info' | 'success' | 'warning' | 'danger' | 'brand';
  title?: React.ReactNode;
  /** Renders a dismiss button when provided. */
  onClose?: () => void;
  icon?: React.ReactNode;
  style?: React.CSSProperties;
}

/** Inline message banner with a left accent bar in the tone color. */
export function Alert(props: AlertProps): JSX.Element;

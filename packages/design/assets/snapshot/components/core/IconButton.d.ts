import * as React from 'react';

export interface IconButtonProps {
  children?: React.ReactNode;
  /** @default "ghost" */
  variant?: 'solid' | 'sky' | 'ghost' | 'subtle';
  /** @default "md" */
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  /** Accessible label (required — icon-only control). */
  label: string;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  style?: React.CSSProperties;
}

/** Circular icon-only button; md meets the 44px hit-target minimum. */
export function IconButton(props: IconButtonProps): JSX.Element;

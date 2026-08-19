/**
 * Status chip. The four kinds are the app's whole vocabulary of certainty —
 * do not add colours or invent new states.
 */
export interface BadgeProps {
  /** planned = from a roster · overdue = not clocked in · received = money confirmed · ocr = machine-read, unverified */
  kind?: 'planned' | 'overdue' | 'received' | 'ocr' | 'neutral';
  children?: React.ReactNode;
  style?: React.CSSProperties;
}
export declare function Badge(props: BadgeProps): JSX.Element;

/**
 * Muted, centred, one-sentence empty state. Says what to do next; never
 * illustrated and never cheerful.
 */
export interface EmptyStateProps {
  children?: React.ReactNode;
  /** Optional single button. */
  action?: React.ReactNode;
  style?: React.CSSProperties;
}
export declare function EmptyState(props: EmptyStateProps): JSX.Element;

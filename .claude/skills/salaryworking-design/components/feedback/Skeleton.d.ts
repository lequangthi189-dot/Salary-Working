/**
 * Loading placeholder. Use it to hold the exact shape of incoming content —
 * never as a decorative shimmer across a whole page.
 */
export interface SkeletonProps {
  variant?: 'block' | 'text' | 'circle';
  width?: string | number;
  height?: string | number;
  /** text variant: >1 renders a paragraph with a short last line. */
  lines?: number;
  /** circle variant diameter. */
  size?: string | number;
  radius?: string | number;
  style?: React.CSSProperties;
}
export declare function Skeleton(props: SkeletonProps): JSX.Element;

/**
 * Small value-over-label tile for summary grids (period totals, reconcile results).
 */
export interface StatTileProps {
  label: string;
  value: React.ReactNode;
  /** total = accent border+value · pay = green value · negative = danger value */
  variant?: 'default' | 'total' | 'pay' | 'negative';
  style?: React.CSSProperties;
}
export declare function StatTile(props: StatTileProps): JSX.Element;

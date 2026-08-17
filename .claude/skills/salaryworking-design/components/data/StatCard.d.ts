/**
 * One figure from the month block. Rows of 3–4 of these sit under the SalaryHero.
 * Tone maps to a fixed meaning; do not recolour for variety.
 */
export interface StatCardProps {
  /** Title-cased label; the component appends the colon. */
  title: string;
  /** Pre-formatted value, e.g. "182.50 (h)" or a shift count. */
  value: React.ReactNode;
  /** orange = totals/day shifts · green = day hours · blue = night · red = late */
  tone?: 'orange' | 'green' | 'blue' | 'red' | 'none';
  style?: React.CSSProperties;
}
export declare function StatCard(props: StatCardProps): JSX.Element;

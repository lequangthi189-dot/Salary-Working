/**
 * Row in the pay-period list. Tapping it drills into that period.
 */
export interface PeriodCardProps {
  /** e.g. "Period 26/7 → 25/8". */
  label: string;
  /** Actual day span of the period. */
  dateRange: string;
  /** Middle line: hours, shift count, deductions… */
  meta?: React.ReactNode;
  pay: number;
  /** Marked by the user after checking the company payslip. */
  received?: boolean;
  receivedOn?: string;
  currencyLocale?: string;
  onClick?: () => void;
  style?: React.CSSProperties;
}
export declare function PeriodCard(props: PeriodCardProps): JSX.Element;

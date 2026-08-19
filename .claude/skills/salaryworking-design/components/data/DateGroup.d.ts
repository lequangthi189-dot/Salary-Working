/**
 * Day card wrapping one or more ShiftCards, with the day's totals in the header.
 */
export interface DateGroupProps {
  /** ISO date as stored ("2026-08-14") or the short d/m the app shows. */
  date: string;
  totalHours: number;
  dayHours?: number;
  nightHours?: number;
  lostHours?: number;
  pay: number;
  currencyLocale?: string;
  children?: React.ReactNode;
  style?: React.CSSProperties;
}
export declare function DateGroup(props: DateGroupProps): JSX.Element;

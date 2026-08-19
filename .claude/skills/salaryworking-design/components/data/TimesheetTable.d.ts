/**
 * Read-only Excel-style timesheet for a pay period. Lists clocked-in shifts only.
 *
 * @startingPoint section="Timesheet" subtitle="Excel-style read-only period timesheet" viewport="700x260"
 */
export interface TimesheetRow {
  id?: string | number;
  /** Short date as the app shows it, e.g. "14/8". */
  date: string;
  start: string;
  end?: string;
  pay: number;
}
export interface TimesheetTableProps {
  rows?: TimesheetRow[];
  totalHours: number;
  totalPay: number;
  currencyLocale?: string;
  style?: React.CSSProperties;
}
export declare function TimesheetTable(props: TimesheetTableProps): JSX.Element;

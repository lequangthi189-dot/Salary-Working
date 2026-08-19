/**
 * A single shift row inside a DateGroup.
 *
 */
export interface ShiftCardProps {
  /** Actual clock-in "HH:MM". Omit both actual times for a roster-only row. */
  start?: string;
  end?: string;
  /** Planned times — shown muted when there is no actual time yet. */
  scheduledStart?: string;
  scheduledEnd?: string;
  /** Pay for the intersection of plan and actual, integer VND. */
  pay: number;
  /** Total hours not paid because of late-in / early-out. */
  lostHours?: number;
  lateInHours?: number;
  earlyOutHours?: number;
  /** planned = future roster row (amber) · missing = past day, never clocked in (red) */
  state?: 'normal' | 'planned' | 'missing';
  currencyLocale?: string;
  onEdit?: () => void;
  onDelete?: () => void;
  style?: React.CSSProperties;
}
export declare function ShiftCard(props: ShiftCardProps): JSX.Element;

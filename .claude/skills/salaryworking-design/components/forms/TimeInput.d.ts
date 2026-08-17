/**
 * 24-hour "HH:MM" text input — masked while typing, clamped on blur.
 * Colour-codes itself by role: amber in, blue out, dashed grey for the planned
 * reference. Never swap this for `<input type="time">`.
 */
export interface TimeInputProps {
  value?: string;
  onChange?: (value: string) => void;
  /** in = check-in (amber) · out = check-out (blue) · scheduled = planned reference (dashed) */
  kind?: 'actual' | 'in' | 'out' | 'scheduled';
  /** Tiny caption above the field (used in the inline shift editor). */
  label?: React.ReactNode;
  title?: string;
  required?: boolean;
  style?: React.CSSProperties;
}
export declare function TimeInput(props: TimeInputProps): JSX.Element;

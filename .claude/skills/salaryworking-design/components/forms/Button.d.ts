/**
 * Flat action button. Variants mirror src/styles.css exactly; `received` is
 * reserved for the payday-only action and must never be used decoratively.
 *
 */
export interface ButtonProps {
  /** primary = add shift · received = payday only · save/cancel = inline row edit · link = text · filter = chip */
  variant?: 'primary' | 'received' | 'save' | 'cancel' | 'link' | 'filter';
  children?: React.ReactNode;
  /** Stretch to the form column (default for submit buttons in .shift-form). */
  fullWidth?: boolean;
  /** filter variant only — selected chip. */
  active?: boolean;
  disabled?: boolean;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  style?: React.CSSProperties;
}
export declare function Button(props: ButtonProps): JSX.Element;

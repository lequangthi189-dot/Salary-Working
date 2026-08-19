/**
 * 20px drawn checkbox with an accent fill when ticked. Used for "Holiday" on the
 * shift form, row selection in Extra income, and the planned-schedule "Off" cells.
 */
export interface CheckboxProps {
  checked?: boolean;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  label?: React.ReactNode;
  disabled?: boolean;
  style?: React.CSSProperties;
}
export declare function Checkbox(props: CheckboxProps): JSX.Element;

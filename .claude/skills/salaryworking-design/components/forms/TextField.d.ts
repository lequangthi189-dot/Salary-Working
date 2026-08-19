/**
 * Stacked label + input. The app has no floating labels, no placeholders as
 * labels and no inline field icons other than search.
 */
export interface TextFieldProps {
  label: React.ReactNode;
  type?: 'text' | 'email' | 'password' | 'tel' | 'date' | 'number';
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  /** Muted helper under the field. */
  hint?: React.ReactNode;
  /** Danger-coloured message; also reddens the border. */
  error?: React.ReactNode;
  /** true for money/hours — switches the field to tabular figures. */
  numeric?: boolean;
  required?: boolean;
  placeholder?: string;
  style?: React.CSSProperties;
  inputStyle?: React.CSSProperties;
}
export declare function TextField(props: TextFieldProps): JSX.Element;

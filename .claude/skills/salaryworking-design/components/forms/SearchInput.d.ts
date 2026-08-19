/**
 * Search field for the shift list. Sits on the same row as FilterTabs and
 * narrows the list together with them (AND, not OR).
 */
export interface SearchInputProps {
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  /** Shown as a × inside the field once there is a query. */
  onClear?: () => void;
  placeholder?: string;
  style?: React.CSSProperties;
}
export declare function SearchInput(props: SearchInputProps): JSX.Element;

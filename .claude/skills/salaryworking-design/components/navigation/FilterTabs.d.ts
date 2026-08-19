/**
 * Filter chips. Used for day/night filtering and week selection; combines with
 * SearchInput as an AND, never as an OR.
 */
export interface FilterOption { value: string; label: string }
export interface FilterTabsProps {
  options?: (FilterOption | string)[];
  value?: string;
  onChange?: (value: string) => void;
  style?: React.CSSProperties;
}
export declare function FilterTabs(props: FilterTabsProps): JSX.Element;

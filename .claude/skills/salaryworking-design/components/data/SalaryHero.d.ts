/**
 * The period's headline figure with its arithmetic underneath. Only one per screen.
 *
 */
export interface SalaryHeroProps {
  /** Uppercase caption, e.g. "Salary this month:" / "Lương tháng này:" */
  label?: string;
  /** Sub-line wording — pass the translated strings for vi. */
  expectedLabel?: string;
  lateLabel?: string;
  deductionLabel?: string;
  /** Net figure = shift pay − deductions. Integer VND (no currency decimals). */
  net: number;
  /** What the schedule would have paid if nothing were lost. */
  expected: number;
  /** Money lost to late-in / early-out. Rendered in danger with a minus. */
  latePenalty?: number;
  /** Period deductions ("Compensation"). */
  deduction?: number;
  /** FX line for the en/us/au locales, e.g. "£1 = 31,000 VND · updated 14:20". */
  fxNote?: string;
  /** Intl locale for grouping separators: vi-VN default, en-GB/en-US/en-AU. */
  currencyLocale?: string;
  style?: React.CSSProperties;
}
export declare function SalaryHero(props: SalaryHeroProps): JSX.Element;

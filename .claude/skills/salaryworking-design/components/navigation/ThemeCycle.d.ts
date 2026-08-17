/**
 * Single-knob cycler for theme or language. Shows a preview swatch plus the name
 * of the CURRENT value (not the next one).
 */
export interface ThemeCycleProps {
  value?: string;
  onChange?: (next: string) => void;
  /** Cycle order; default ['dark','glass','neumorph']. */
  order?: string[];
  /** Override the visible name (used for languages: "Tiếng Việt", "English (UK)"…). */
  label?: string;
  /** Override the swatch with inline styles. */
  swatch?: React.CSSProperties;
  /** Replace the swatch entirely — pass <Flag code={lang} /> for languages. */
  icon?: React.ReactNode;
  /** false = icon-only square button; the name stays in the title/aria-label. */
  showLabel?: boolean;
  style?: React.CSSProperties;
}
export declare function ThemeCycle(props: ThemeCycleProps): JSX.Element;

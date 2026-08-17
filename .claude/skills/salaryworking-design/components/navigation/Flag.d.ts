/**
 * SVG country flag for the four locale codes. Never use flag emoji — Windows
 * renders nothing for them.
 *
 * Locales: vi (₫, Vietnamese) · en (£) · us ($) · au (A$). The three English
 * codes share one dictionary and differ only in currency and number format.
 */
export interface FlagProps {
  code?: 'vi' | 'en' | 'us' | 'au';
  /** Rendered width in px; height follows the flag's own ratio. */
  width?: number;
  style?: React.CSSProperties;
}
export declare function Flag(props: FlagProps): JSX.Element;
export declare const LANGUAGES: string[];
export declare const LANG_NAMES: Record<string, string>;
export declare const LANG_CURRENCY: Record<string, string>;

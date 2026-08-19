/**
 * Bottom dock — the product's whole navigation. Four destinations maximum;
 * everything else lives behind Tools.
 *
 * @startingPoint section="Navigation" subtitle="Bottom dock with magnifying icons and labels" viewport="700x150"
 */
export interface DockItem {
  key: string;
  label: string;
  /** One of the built-in glyphs, or your own SVG element. */
  icon: 'payPeriod' | 'tools' | 'account' | 'guide' | React.ReactNode;
  /** Account item only: uploaded photo URL — replaces the icon with an Avatar. */
  avatarUrl?: string;
  /** Account item only: name used for the initials fallback avatar. */
  initials?: string;
}
export interface DockProps {
  items?: DockItem[];
  /** Index of the open destination; -1 for none. */
  active?: number;
  onSelect?: (index: number) => void;
  /** false to place it inline (specimen cards, docs). */
  fixed?: boolean;
  /** Labels are permanent on touch; keep them on unless space forbids. */
  showLabels?: boolean;
  style?: React.CSSProperties;
}
export declare function Dock(props: DockProps): JSX.Element;
export declare const DOCK_ICONS: Record<string, React.ReactNode>;

/**
 * Bouncing-ball loader for app boot / session restore. Requires the `sw-ball`
 * and `sw-shadow` keyframes (shipped with the cards and UI kit).
 */
export interface LoaderProps {
  label?: string;
  /** true = fixed full-screen scrim at z-index 9999. */
  overlay?: boolean;
  style?: React.CSSProperties;
}
export declare function Loader(props: LoaderProps): JSX.Element;

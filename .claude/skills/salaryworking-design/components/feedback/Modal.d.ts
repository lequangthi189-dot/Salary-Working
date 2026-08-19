/**
 * The app's only overlay pattern. Everything modal — confirm, compensation,
 * extra income, schedule import, reconcile — is this card at 360 or 480px.
 */
export interface ModalProps {
  title?: React.ReactNode;
  children?: React.ReactNode;
  /** Called by the × and by clicking the scrim. */
  onClose?: () => void;
  /** 'wide' (480px) for tables and image previews. */
  width?: 'default' | 'wide';
  /** Action row rendered at the bottom of the content. */
  footer?: React.ReactNode;
  style?: React.CSSProperties;
}
export declare function Modal(props: ModalProps): JSX.Element;

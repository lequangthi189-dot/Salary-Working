/**
 * Inline message under a form. Two tones only, no icons, no coloured box.
 */
export interface MessageProps {
  tone?: 'error' | 'info';
  children?: React.ReactNode;
  style?: React.CSSProperties;
}
export declare function Message(props: MessageProps): JSX.Element;

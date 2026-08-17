/**
 * Determinate/indeterminate progress for the multi-step image-reading and
 * reconcile flows. It is always disabled — it is a status, not a control.
 */
export interface ProgressButtonProps {
  /** 0–100; ignored when indeterminate. */
  value?: number;
  /** Step wording, e.g. "Reading schedule…", "Cross-checking with OCR…". */
  label?: string;
  /** For steps with no measurable percentage. */
  indeterminate?: boolean;
  style?: React.CSSProperties;
}
export declare function ProgressButton(props: ProgressButtonProps): JSX.Element;

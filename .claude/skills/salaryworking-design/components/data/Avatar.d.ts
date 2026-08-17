/**
 * Profile photo with an initials fallback. Used in the Account sheet, in the chat
 * header, and as the dock's Account button once the user has uploaded a photo.
 *
 * Upload constraints from the product: JPG, PNG or WEBP, up to 5MB
 * ("Choose photo" / "JPG, PNG, WEBP — up to 5MB").
 */
export interface AvatarProps {
  /** Public URL of the uploaded photo; omit to show initials. */
  src?: string;
  /** Full name — initials are derived from the first and last word. */
  name?: string;
  /** Diameter in px: 26 in the dock, 40–48 in sheets. */
  size?: number;
  /** true = accent border (the dock item for this account is open). */
  active?: boolean;
  alt?: string;
  style?: React.CSSProperties;
}
export declare function Avatar(props: AvatarProps): JSX.Element;

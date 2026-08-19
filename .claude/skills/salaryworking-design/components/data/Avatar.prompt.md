One-line: profile photo, or the user's initials when there is no photo.

```jsx
<Avatar name="Lê Quang Thi" size={48} />
<Avatar src={profile.avatar_url} name={profile.full_name} size={26} active />
```

Never fall back to a stock person icon — in the dock the avatar is the Account button, and a silhouette reads as "signed out". Upload copy, verbatim: "Choose photo", "JPG, PNG, WEBP — up to 5MB", "Image is too large (max 5MB).", "Unsupported format. Use JPG, PNG or WEBP."

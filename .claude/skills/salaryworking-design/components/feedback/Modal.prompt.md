One-line: scrim + centred card overlay, 360px default / 480px wide.

```jsx
<Modal title="Delete this shift?" onClose={close} footer={<><Button variant="save">Yes</Button><Button variant="cancel">No</Button></>}>
  <p style={{margin:0,fontSize:'var(--text-base)'}}>This action cannot be undone.</p>
</Modal>
```

Body scroll is locked while a modal is open. Confirmation copy is a plain question — no "Are you sure you want to…?" padding and no emoji.

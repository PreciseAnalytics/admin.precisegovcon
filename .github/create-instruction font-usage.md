# Font Usage Instruction: Aptos

## Purpose
Enforce consistent use of the Aptos font in all UI components for improved readability and brand alignment.

## Scope
- Applies to all React components in `components/` and UI code in `app/`.
- Applies to all MUI and Tailwind-styled elements.

## Guidelines
- Always apply the Aptos font via Tailwind (`font-[Aptos]` or custom class) or MUI `sx`/`style` props.
- Import `public/fonts/fonts.css` in your root layout or global CSS if not already present.
- Do not override Aptos with other fonts unless explicitly required.
- For new components, ensure the font is set at the top-level container.

## Example
```tsx
// In a React component
return (
  <div className="font-aptos ...">
    ...
  </div>
);
```

## Pitfalls
- Forgetting to import `fonts.css` will cause fallback fonts to be used.
- MUI components may require `sx={{ fontFamily: 'Aptos, sans-serif' }}`.

## Verification
- Check rendered UI in browser dev tools for `font-family: Aptos`.

## Related
- See `.github/copilot-instructions.md` for workspace conventions.

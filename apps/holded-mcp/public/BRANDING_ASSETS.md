# Branding Assets

## Canonical Source

`holded-diamond-logo.png` is the single canonical source for all icon variants.

## Generated Compatibility Files

These files are generated from the canonical source and should not be edited directly:

| File                 | Size                          | Purpose                           |
| -------------------- | ----------------------------- | --------------------------------- |
| favicon.ico          | 16×16 + 32×32 + 48×48 + 64×64 | Browser tab icon (multi-size ICO) |
| favicon.png          | 64×64                         | Modern browser favicon            |
| icon.png             | 64×64                         | General-purpose icon              |
| logo.png             | 256×256                       | Full-size logo for listings       |
| apple-touch-icon.png | 180×180                       | iOS home screen icon              |

## Dynamic Routes

`src/app.ts` serves dynamic icon routes (`/favicon.ico`, `/icon.png`, etc.) with
proper cache-busting headers and Claude.ai compatibility. The physical files in
`public/` serve as fallbacks for direct static access.

## Regenerating

Re-run the generation script with `holded-diamond-logo.png` as the source.

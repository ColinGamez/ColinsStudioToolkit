# Toolkit development and releases

The current Marketplace identity is `ColinGamez.colins-developer-toolkit`. Internal `my-vsc-themes` command, view, and settings IDs remain for compatibility. This repository includes all built-in tools; there is no extension-pack dependency.

Use Node.js 24, `npm ci`, `npm run check`, `npm run check:themes`, and `npm run package`. The package command stages an isolated copy and strips static theme assets and contributions from the public VSIX. Do not use a direct `vsce package` on the development source manifest for commercial distribution.

Generated color themes, file icons, and image previews are checked in. `npm run build` regenerates them for development. Theme delivery uses a separate licensed add-on served by the billing service; update that package and its signed checksum together when changing delivered theme assets.

The public configuration in `src/billing-config.json` contains only the HTTPS billing origin, public verification key, and payment mode. No Stripe secret key or license-signing private key is needed to build this repository. Never commit `.env` files, private signing keys, purchase keys, or private service configuration.

Toolkit CI packages commits and pull requests as a downloadable workflow artifact. Toolkit Release is manually dispatched with the package version and creates a GitHub release. It does not publish to Marketplace. Upload the resulting VSIX to the existing Developer Toolkit listing through the publisher dashboard.

Original MIT notices are preserved. Client-side license checks are not tamper-proof DRM, and previously published MIT rights remain in effect.

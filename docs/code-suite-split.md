# Toolkit organization

Colin's Developer Toolkit is one self-contained extension, published as `ColinGamez.colins-developer-toolkit`.

All developer tools are registered by extension.js and implemented in src/: Bug Report Builder, Project Command Center, Launch Pad, README Studio, Snippet Forge, and theme automation. suiteRuntime.js provides guarded commands and searchable Quick Actions. suiteLicense.js handles purchase activation and licensed theme delivery.

There are no standalone extension dependencies. Historical command and configuration IDs using my-vsc-themes remain for compatibility. The older standalone repositories are not required to build or use this toolkit.

Use npm run package for commercial installers. Theme contributions stay in the source manifest for asset development and are removed from the staged public installer; licensed themes and matching icons install through the authenticated billing service.

See DEVELOPMENT.md for build and release instructions.

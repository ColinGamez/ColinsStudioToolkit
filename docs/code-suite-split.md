# Code Suite Split Plan

Colin's VS Code Themes should stay a theme-first Marketplace extension. The developer tools that were incubated here will move into focused standalone extensions under the same `ColinGamez` publisher.

## Current Repo Role

This repository remains the home for:

- Colin's VS Code Themes.
- Colin's Color Icons.
- Theme screenshots, previews, sampler, and theme quality checks.
- Temporary preview copies of the Code Suite tools until their standalone extensions are live.

## Standalone Extension Map

| Tool | GitHub repository | Marketplace extension ID | Status |
| --- | --- | --- | --- |
| Project Command Center | `ColinGamez/Project-Command-Center` | `ColinGamez.project-command-center` | `v0.1.0` GitHub release live, Marketplace pending `VSCE_PAT` |
| Theme Reactor | `ColinGamez/ThemeReactor` | `ColinGamez.theme-reactor` | `v0.1.0` GitHub release live, Marketplace pending `VSCE_PAT` |
| README Studio | `ColinGamez/ColinsReadMeStudio` | `ColinGamez.colins-readme-studio` | `v0.1.0` GitHub release live, Marketplace pending `VSCE_PAT` |
| Snippet Forge | `ColinGamez/SnippetForge` | `ColinGamez.snippet-forge` | `v0.1.0` GitHub release live, Marketplace pending `VSCE_PAT` |
| Launch Pad | `ColinGamez/ColinsLaunchPad` | `ColinGamez.colins-launch-pad` | `v0.1.0` GitHub release live, Marketplace pending `VSCE_PAT` |
| Bug Report Builder | `ColinGamez/bug-report-builder` | `ColinGamez.bug-report-builder` | `v0.1.0` GitHub release live, Marketplace pending `VSCE_PAT` |
| Repo Time Machine | `ColinGamez/colins-repo-time-machine` | `ColinGamez.colins-repo-time-machine` | Future standalone extension |
| Code Mood Board | `ColinGamez/colins-code-mood-board` | `ColinGamez.colins-code-mood-board` | Future standalone extension |
| Code Suite Pack | `ColinGamez/colins-code-suite` | `ColinGamez.colins-code-suite` | Future extension pack manifest |

## Live GitHub Releases

- Bug Report Builder: https://github.com/ColinGamez/bug-report-builder/releases/tag/v0.1.0
- Launch Pad: https://github.com/ColinGamez/ColinsLaunchPad/releases/tag/v0.1.0
- README Studio: https://github.com/ColinGamez/ColinsReadMeStudio/releases/tag/v0.1.0
- Project Command Center: https://github.com/ColinGamez/Project-Command-Center/releases/tag/v0.1.0
- Snippet Forge: https://github.com/ColinGamez/SnippetForge/releases/tag/v0.1.0
- Theme Reactor: https://github.com/ColinGamez/ThemeReactor/releases/tag/v0.1.0

## Migration Order

1. Create each standalone GitHub repository. Done for the first six tools.
2. Scaffold each extension with its own `package.json`, `README.md`, `CHANGELOG.md`, `LICENSE`, `.vscodeignore`, and release workflow. Done for the first six tools.
3. Copy the relevant module from this repo and trim command IDs/settings to the standalone extension name. Done for the first six tools.
4. Publish each tool under the `ColinGamez` Marketplace publisher after each repo has a `VSCE_PAT` secret.
5. Create `colins-code-suite` as an extension pack that installs the standalone tools.
6. Update this theme extension to link to the standalone tool pages.
7. After the standalone tools are stable, remove or deprecate the preview tool commands from this theme extension in a major release.

## Naming Rules

- GitHub repository names follow the names Colin created.
- Marketplace package names use lowercase kebab case, even when the GitHub repository uses PascalCase.
- Command IDs use the standalone package name as the prefix.
- Each tool README explains one job clearly instead of describing the whole suite.

## Transition Rule

Do not remove the preview tools from Colin's VS Code Themes until the replacement standalone extension is published and linked. This keeps current users from losing commands while the suite is split out.

# Code Suite Split Plan

Colin's VS Code Themes should stay a theme-first Marketplace extension. The developer tools that were incubated here will move into focused standalone extensions under the same `ColinGamez` publisher.

## Current Repo Role

This repository remains the home for:

- Colin's VS Code Themes.
- Colin's Color Icons.
- Theme screenshots, previews, sampler, and theme quality checks.
- Temporary preview copies of the Code Suite tools until their standalone extensions are live.

## Standalone Extension Map

| Tool | GitHub repository | Marketplace extension ID | Starting source |
| --- | --- | --- | --- |
| Project Command Center | `ColinGamez/Project-Command-Center` | `ColinGamez.project-command-center` | `src/commandCenter.js`, `src/project.js` |
| Theme Reactor | `ColinGamez/ThemeReactor` | `ColinGamez.theme-reactor` | `src/themeReactor.js`, `src/themeData.js` |
| README Studio | `ColinGamez/ColinsReadMeStudio` | `ColinGamez.colins-readme-studio` | `src/readmeStudio.js`, `src/project.js` |
| Snippet Forge | `ColinGamez/SnippetForge` | `ColinGamez.snippet-forge` | `src/snippetForge.js`, `src/project.js` |
| Launch Pad | `ColinGamez/ColinsLaunchPad` | `ColinGamez.colins-launch-pad` | `src/launchPad.js`, `src/project.js` |
| Bug Report Builder | `ColinGamez/bug-report-builder` | `ColinGamez.bug-report-builder` | `src/bugReportBuilder.js`, `src/project.js` |
| Repo Time Machine | `ColinGamez/colins-repo-time-machine` | `ColinGamez.colins-repo-time-machine` | New standalone extension |
| Code Mood Board | `ColinGamez/colins-code-mood-board` | `ColinGamez.colins-code-mood-board` | New standalone extension |
| Code Suite Pack | `ColinGamez/colins-code-suite` | `ColinGamez.colins-code-suite` | Extension pack manifest |

## Migration Order

1. Create each standalone GitHub repository.
2. Scaffold each extension with its own `package.json`, `README.md`, `CHANGELOG.md`, `LICENSE`, `.vscodeignore`, and release workflow.
3. Copy the relevant module from this repo and trim command IDs/settings to the standalone extension name.
4. Publish each tool under the `ColinGamez` Marketplace publisher.
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

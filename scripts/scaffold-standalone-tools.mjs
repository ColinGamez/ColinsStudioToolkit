import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const desktopRoot = path.dirname(repoRoot);

function lines(parts) {
  return `${parts.join("\n")}\n`;
}

function read(relativePath) {
  return readFileSync(path.join(repoRoot, relativePath), "utf8");
}

function write(root, relativePath, content) {
  const target = path.join(root, relativePath);
  mkdirSync(path.dirname(target), { recursive: true });
  writeFileSync(target, content, "utf8");
}

function copy(root, sourceRelativePath, targetRelativePath = sourceRelativePath) {
  const target = path.join(root, targetRelativePath);
  mkdirSync(path.dirname(target), { recursive: true });
  copyFileSync(path.join(repoRoot, sourceRelativePath), target);
}

function replaceMany(value, replacements) {
  return replacements.reduce((text, [from, to]) => text.split(from).join(to), value);
}

function packageJson(tool) {
  const contributes = {
    commands: tool.commands
  };

  if (tool.configuration) {
    contributes.configuration = tool.configuration;
  }

  if (tool.viewsContainers) {
    contributes.viewsContainers = tool.viewsContainers;
  }

  if (tool.views) {
    contributes.views = tool.views;
  }

  if (tool.menus) {
    contributes.menus = tool.menus;
  }

  return `${JSON.stringify(
    {
      name: tool.packageName,
      displayName: tool.displayName,
      description: tool.description,
      version: "0.1.0",
      publisher: "ColinGamez",
      license: "MIT",
      main: "./extension.js",
      activationEvents: tool.activationEvents,
      extensionKind: ["ui"],
      icon: "assets/icon.png",
      galleryBanner: {
        color: "#180602",
        theme: "dark"
      },
      pricing: "Free",
      repository: {
        type: "git",
        url: `https://github.com/ColinGamez/${tool.repoName}.git`
      },
      homepage: `https://github.com/ColinGamez/${tool.repoName}#readme`,
      bugs: {
        url: `https://github.com/ColinGamez/${tool.repoName}/issues`
      },
      scripts: {
        build: "node scripts/check-package.mjs"
      },
      engines: {
        vscode: "^1.90.0"
      },
      categories: tool.categories,
      keywords: tool.keywords,
      contributes
    },
    null,
    2
  )}\n`;
}

function extensionEntry(registerName, moduleName) {
  return lines([
    `const { ${registerName} } = require("./src/${moduleName}");`,
    "",
    "function activate(context) {",
    `  ${registerName}(context);`,
    "}",
    "",
    "function deactivate() {}",
    "",
    "module.exports = { activate, deactivate };"
  ]);
}

function checkPackage(tool) {
  const commands = JSON.stringify(tool.expectedCommands);
  const files = JSON.stringify(tool.syntaxFiles);

  return lines([
    'import { execFileSync } from "node:child_process";',
    'import { readFileSync } from "node:fs";',
    "",
    'const pkg = JSON.parse(readFileSync("package.json", "utf8"));',
    `const expectedName = ${JSON.stringify(tool.packageName)};`,
    `const expectedCommands = ${commands};`,
    `const files = ${files};`,
    "",
    "if (pkg.name !== expectedName) {",
    '  throw new Error(`package name must be ${expectedName}`);',
    "}",
    "",
    "const contributedCommands = new Set((pkg.contributes?.commands ?? []).map((item) => item.command));",
    "for (const command of expectedCommands) {",
    "  if (!contributedCommands.has(command)) {",
    '    throw new Error(`missing contributed command: ${command}`);',
    "  }",
    "}",
    "",
    "for (const file of files) {",
    '  execFileSync(process.execPath, ["--check", file], { stdio: "inherit" });',
    "}",
    "",
    `console.log(${JSON.stringify(`${tool.displayName} package check passed.`)});`
  ]);
}

function ciWorkflow(tool) {
  return lines([
    "name: CI",
    "",
    "on:",
    "  push:",
    "    branches:",
    "      - main",
    "  pull_request:",
    "  workflow_dispatch:",
    "",
    "env:",
    "  FORCE_JAVASCRIPT_ACTIONS_TO_NODE24: true",
    "",
    "jobs:",
    "  build:",
    "    name: Build and package",
    "    runs-on: ubuntu-latest",
    "",
    "    steps:",
    "      - name: Checkout",
    "        uses: actions/checkout@v4",
    "",
    "      - name: Setup Node",
    "        uses: actions/setup-node@v4",
    "        with:",
    "          node-version: 22",
    "          cache: npm",
    "",
    "      - name: Install dependencies",
    "        run: npm ci",
    "",
    "      - name: Build",
    "        run: npm run build",
    "",
    "      - name: Package VSIX",
    "        run: npx @vscode/vsce package --allow-missing-repository",
    "",
    "      - name: Upload VSIX artifact",
    "        uses: actions/upload-artifact@v4",
    "        with:",
    `          name: ${tool.packageName}-vsix`,
    '          path: "*.vsix"'
  ]);
}

function releaseWorkflow(tool) {
  return lines([
    "name: Release",
    "",
    "on:",
    "  workflow_dispatch:",
    "    inputs:",
    "      version:",
    '        description: "Version to release, matching package.json. Example: 0.1.0"',
    "        required: true",
    "        type: string",
    "      publish_marketplace:",
    '        description: "Publish to VS Code Marketplace using the VSCE_PAT secret"',
    "        required: true",
    "        default: false",
    "        type: boolean",
    "",
    "permissions:",
    "  contents: write",
    "",
    "env:",
    "  FORCE_JAVASCRIPT_ACTIONS_TO_NODE24: true",
    "",
    "jobs:",
    "  release:",
    "    name: Package and release",
    "    runs-on: ubuntu-latest",
    "",
    "    steps:",
    "      - name: Checkout",
    "        uses: actions/checkout@v4",
    "",
    "      - name: Setup Node",
    "        uses: actions/setup-node@v4",
    "        with:",
    "          node-version: 22",
    "          cache: npm",
    "",
    "      - name: Install dependencies",
    "        run: npm ci",
    "",
    "      - name: Validate package version",
    "        shell: bash",
    "        run: |",
    '          ACTUAL_VERSION="$(node -p "require(\'./package.json\').version")"',
    '          if [ "$ACTUAL_VERSION" != "${{ inputs.version }}" ]; then',
    '            echo "package.json version is $ACTUAL_VERSION, expected ${{ inputs.version }}"',
    "            exit 1",
    "          fi",
    "",
    "      - name: Build",
    "        run: npm run build",
    "",
    "      - name: Package VSIX",
    "        run: npx @vscode/vsce package --allow-missing-repository",
    "",
    "      - name: Create GitHub release",
    "        env:",
    "          GH_TOKEN: ${{ github.token }}",
    "        run: |",
    `          gh release create "v\${{ inputs.version }}" "${tool.packageName}-\${{ inputs.version }}.vsix" \\`,
    '            --target "${{ github.sha }}" \\',
    '            --title "v${{ inputs.version }}" \\',
    "            --generate-notes",
    "",
    "      - name: Publish Marketplace",
    "        if: ${{ inputs.publish_marketplace }}",
    "        env:",
    "          VSCE_PAT: ${{ secrets.VSCE_PAT }}",
    `        run: npx @vscode/vsce publish --packagePath "${tool.packageName}-\${{ inputs.version }}.vsix" -p "$VSCE_PAT"`
  ]);
}

function vscodeIgnore() {
  return lines([
    ".vscode/**",
    ".github/**",
    "scripts/**",
    ".gitignore",
    "package-lock.json",
    "*.vsix"
  ]);
}

function gitIgnore() {
  return lines([
    "node_modules/",
    "*.vsix",
    ".vscode-test/",
    ".DS_Store",
    "*.log"
  ]);
}

function support(tool) {
  return lines([
    `# Support`,
    "",
    `Thanks for using ${tool.displayName}.`,
    "",
    `- Issues: https://github.com/ColinGamez/${tool.repoName}/issues`,
    `- Releases: https://github.com/ColinGamez/${tool.repoName}/releases`,
    "- Publisher: ColinGamez"
  ]);
}

function changelog(tool) {
  return lines([
    "# Changelog",
    "",
    "## 0.1.0",
    "",
    `- Initial standalone release of ${tool.displayName}.`,
    "- Added focused VS Code command wiring, package checks, CI, and release packaging."
  ]);
}

function commonFiles(tool) {
  const root = path.join(desktopRoot, tool.localDir);

  if (!existsSync(root)) {
    throw new Error(`Missing cloned repo folder: ${root}`);
  }

  write(root, "package.json", packageJson(tool));
  write(root, "extension.js", extensionEntry(tool.registerName, tool.moduleName));
  write(root, "README.md", tool.readme);
  write(root, "CHANGELOG.md", changelog(tool));
  write(root, "SUPPORT.md", support(tool));
  write(root, ".gitignore", gitIgnore());
  write(root, ".vscodeignore", vscodeIgnore());
  write(root, "scripts/check-package.mjs", checkPackage(tool));
  write(root, ".github/workflows/ci.yml", ciWorkflow(tool));
  write(root, ".github/workflows/release.yml", releaseWorkflow(tool));
  copy(root, "LICENSE");
  copy(root, "assets/icon.png");

  if (tool.copyLogo) {
    copy(root, "assets/logo-mark.png");
  }

  for (const [relativePath, content] of Object.entries(tool.sources)) {
    write(root, relativePath, content);
  }
}

const launchPadSource = (() => {
  let source = read("src/launchPad.js");
  source = replaceMany(source, [
    ['const LAUNCH_PAD_VIEW_TYPE = "my-vsc-themes.launchPad";', 'const LAUNCH_PAD_VIEW_TYPE = "colins-launch-pad.view";'],
    ["my-vsc-themes.bugReportBuilder.create", "bug-report-builder.create"],
    ["my-vsc-themes.readmeStudio.open", "colins-readme-studio.open"],
    ["my-vsc-themes.snippetForge.createFromSelection", "snippet-forge.createFromSelection"],
    ["my-vsc-themes.commandCenter.createMissingBasics", "project-command-center.createMissingBasics"],
    ["my-vsc-themes.commandCenter.runScript", "project-command-center.runScript"],
    ["my-vsc-themes.commandCenter.open", "project-command-center.open"],
    ["my-vsc-themes.applyThemeReactorNow", "theme-reactor.applyThemeReactorNow"],
    ["my-vsc-themes.launchPad.open", "colins-launch-pad.open"]
  ]);
  source = source.replace(
    lines([
      '  if (item.type === "script") {',
      '    await vscode.commands.executeCommand("project-command-center.runScript", item.target);',
      "    return;",
      "  }"
    ]).trimEnd(),
    lines([
      '  if (item.type === "script") {',
      "    const terminal = vscode.window.createTerminal({",
      '      name: `Launch Pad: ${item.target}`,',
      "      cwd: snapshot.root",
      "    });",
      "    terminal.show();",
      "    terminal.sendText(scriptCommand(snapshot.packageManager, item.target));",
      "    return;",
      "  }"
    ]).trimEnd()
  );
  return source;
})();

const readmeStudioSource = replaceMany(read("src/readmeStudio.js"), [
  ['const README_STUDIO_VIEW_TYPE = "my-vsc-themes.readmeStudio";', 'const README_STUDIO_VIEW_TYPE = "colins-readme-studio.view";'],
  ["my-vsc-themes.readmeStudio.open", "colins-readme-studio.open"]
]);

const snippetForgeSource = replaceMany(read("src/snippetForge.js"), [
  ["my-vsc-themes.snippetForge.createFromSelection", "snippet-forge.createFromSelection"],
  ["my-vsc-themes.snippetForge.openWorkspaceSnippets", "snippet-forge.openWorkspaceSnippets"]
]);

const commandCenterSource = replaceMany(read("src/commandCenter.js"), [
  ["my-vsc-themes.commandCenter.focus", "project-command-center.view.focus"],
  ['createTreeView("my-vsc-themes.commandCenter"', 'createTreeView("project-command-center.view"'],
  ["my-vsc-themes.commandCenter.", "project-command-center."],
  ["my-vsc-themes.bugReportBuilder.create", "bug-report-builder.create"],
  ["my-vsc-themes.launchPad.open", "colins-launch-pad.open"],
  ["my-vsc-themes.readmeStudio.open", "colins-readme-studio.open"],
  ["my-vsc-themes.snippetForge.createFromSelection", "snippet-forge.createFromSelection"],
  ["my-vsc-themes.applyThemeReactorNow", "theme-reactor.applyThemeReactorNow"],
  ["my-vsc-themes.randomReactorFavorite", "theme-reactor.randomReactorFavorite"],
  ["my-vsc-themes.setReactorWorkspaceTheme", "theme-reactor.setReactorWorkspaceTheme"],
  ["myVscThemes", "themeReactor"]
]);

const themeReactorSource = replaceMany(read("src/themeReactor.js"), [
  ["my-vsc-themes.", "theme-reactor."],
  ["myVscThemes", "themeReactor"],
  ["Colin's Themes:", "Colin's Theme Reactor:"],
  ["Colin's Themes", "Colin's Theme Reactor"]
]);

const themeReactorConfiguration = {
  title: "Colin's Theme Reactor",
  properties: {
    "themeReactor.autoApplyOnStartup": {
      type: "boolean",
      default: false,
      description: "Apply a seasonal or holiday theme when VS Code starts."
    },
    "themeReactor.autoMode": {
      type: "string",
      enum: ["seasonal", "holiday"],
      default: "seasonal",
      description: "Controls which automatic theme rotation is used on startup."
    },
    "themeReactor.reactor.enabled": {
      type: "boolean",
      default: false,
      description: "Automatically apply Theme Reactor when VS Code starts and while VS Code is open."
    },
    "themeReactor.reactor.mode": {
      type: "string",
      enum: ["hybrid", "timeOfDay", "seasonal", "holiday"],
      enumDescriptions: [
        "Use holiday themes in holiday months and time-of-day themes otherwise.",
        "Use the morning, day, evening, and night schedule.",
        "Use Spring Bloom, Summer Sunset, Autumn Ember, or Winter Aurora by month.",
        "Use holiday themes when available, with seasonal fallback."
      ],
      default: "hybrid",
      description: "Controls how Theme Reactor chooses a theme."
    },
    "themeReactor.reactor.schedule": {
      type: "object",
      default: {
        morning: "Spring Bloom",
        day: "Peach Soda",
        evening: "Summer Sunset",
        night: "All Orange"
      },
      additionalProperties: {
        type: "string"
      },
      description: "Theme Reactor time-of-day schedule. Supported keys: morning, day, evening, night."
    },
    "themeReactor.reactor.favorites": {
      type: "array",
      items: {
        type: "string"
      },
      default: [
        "All Orange",
        "All Orange High Contrast",
        "Summer Sunset",
        "Autumn Ember",
        "Winter Aurora",
        "Starfighter HUD"
      ],
      description: "Themes used by Theme Reactor favorite and random commands."
    },
    "themeReactor.reactor.workspaceTheme": {
      type: "string",
      default: "",
      description: "Workspace-specific Theme Reactor override. Leave empty to use the normal Theme Reactor mode."
    }
  }
};

const themeReactorCommands = [
  ["theme-reactor.applySeasonalTheme", "Apply Current Seasonal Theme"],
  ["theme-reactor.applyHolidayTheme", "Apply Current Holiday Theme"],
  ["theme-reactor.pickGamingTheme", "Pick Gaming Theme"],
  ["theme-reactor.pickThemeByPack", "Pick Theme By Pack"],
  ["theme-reactor.enableLightDarkAutoSwitch", "Enable Light/Dark Auto Switch"],
  ["theme-reactor.enableMonthlyAutoTheme", "Enable Startup Seasonal Auto Theme"],
  ["theme-reactor.disableMonthlyAutoTheme", "Disable Startup Seasonal Auto Theme"],
  ["theme-reactor.applyOrangePreset", "Apply Orange Coding Preset"],
  ["theme-reactor.applyFocusPreset", "Apply Focus Preset"],
  ["theme-reactor.applyLightPreset", "Apply Light Coding Preset"],
  ["theme-reactor.applyGamingPreset", "Apply Gaming Preset"],
  ["theme-reactor.enableThemeReactor", "Enable Theme Reactor"],
  ["theme-reactor.disableThemeReactor", "Disable Theme Reactor"],
  ["theme-reactor.applyThemeReactorNow", "Apply Theme Reactor Now"],
  ["theme-reactor.pickReactorFavorite", "Pick Theme Reactor Favorite"],
  ["theme-reactor.randomReactorFavorite", "Random Theme Reactor Favorite"],
  ["theme-reactor.configureReactorFavorites", "Configure Theme Reactor Favorites"],
  ["theme-reactor.setReactorWorkspaceTheme", "Set Theme Reactor Workspace Theme"]
].map(([command, title]) => ({ command, title, category: "Colin's Theme Reactor" }));

const tools = [
  {
    localDir: "ColinsLaunchPad",
    repoName: "ColinsLaunchPad",
    packageName: "colins-launch-pad",
    displayName: "Colin's Launch Pad",
    description: "Open scripts, files, links, terminal actions, and Colin's tools from one fast VS Code dashboard.",
    registerName: "registerLaunchPad",
    moduleName: "launchPad",
    activationEvents: ["onCommand:colins-launch-pad.open"],
    categories: ["Other"],
    keywords: ["launch pad", "dashboard", "workspace", "scripts", "terminal", "links", "developer tools", "productivity", "vs code"],
    commands: [{ command: "colins-launch-pad.open", title: "Open Launch Pad", category: "Colin's Launch Pad" }],
    expectedCommands: ["colins-launch-pad.open"],
    syntaxFiles: ["extension.js", "src/launchPad.js", "src/project.js"],
    readme: lines([
      "# Colin's Launch Pad",
      "",
      "A fast workspace launcher for VS Code. Pin scripts, files, links, terminal commands, and companion tool actions in one searchable webview.",
      "",
      "## Features",
      "",
      "- Search and run package scripts without leaving VS Code.",
      "- Open README files, repository remotes, terminals, and workspace config.",
      "- Pin favorite launch items per workspace.",
      "- Add custom links and terminal commands saved in `.vscode/colins-launch-pad.json`.",
      "- Integrates with Colin's standalone tools when they are installed.",
      "",
      "## Usage",
      "",
      "Run **Colin's Launch Pad: Open Launch Pad** from the Command Palette.",
      "",
      "## Local Development",
      "",
      "```sh",
      "npm install",
      "npm run build",
      "npx @vscode/vsce package --allow-missing-repository",
      "```"
    ]),
    sources: {
      "src/launchPad.js": launchPadSource,
      "src/project.js": read("src/project.js")
    }
  },
  {
    localDir: "ColinsReadMeStudio",
    repoName: "ColinsReadMeStudio",
    packageName: "colins-readme-studio",
    displayName: "Colin's README Studio",
    description: "Generate, preview, copy, and save polished README files from live VS Code workspace context.",
    registerName: "registerReadmeStudio",
    moduleName: "readmeStudio",
    activationEvents: ["onCommand:colins-readme-studio.open"],
    categories: ["Other"],
    keywords: ["readme", "markdown", "documentation", "docs", "preview", "generator", "developer tools", "github", "vs code"],
    commands: [{ command: "colins-readme-studio.open", title: "Open README Studio", category: "Colin's README Studio" }],
    expectedCommands: ["colins-readme-studio.open"],
    syntaxFiles: ["extension.js", "src/readmeStudio.js", "src/project.js"],
    readme: lines([
      "# Colin's README Studio",
      "",
      "Build a clean README from the project VS Code already has open. README Studio detects scripts, package metadata, repository links, Marketplace IDs, and project health, then gives you a live Markdown editor and preview.",
      "",
      "## Features",
      "",
      "- Generate README structure from workspace context.",
      "- Preview headings, badges, links, images, tables, lists, code blocks, and blockquotes.",
      "- Reuse an existing README, copy generated Markdown, open README.md, or save the draft.",
      "- Include install commands, usage commands, support links, and roadmap notes.",
      "",
      "## Usage",
      "",
      "Open a workspace, then run **Colin's README Studio: Open README Studio** from the Command Palette.",
      "",
      "## Local Development",
      "",
      "```sh",
      "npm install",
      "npm run build",
      "npx @vscode/vsce package --allow-missing-repository",
      "```"
    ]),
    sources: {
      "src/readmeStudio.js": readmeStudioSource,
      "src/project.js": read("src/project.js")
    }
  },
  {
    localDir: "Project-Command-Center",
    repoName: "Project-Command-Center",
    packageName: "project-command-center",
    displayName: "Colin's Project Command Center",
    description: "A VS Code sidebar for project scripts, Git context, health checks, quick actions, and workspace shortcuts.",
    registerName: "registerCommandCenter",
    moduleName: "commandCenter",
    activationEvents: [
      "onView:project-command-center.view",
      "onCommand:project-command-center.open",
      "onCommand:project-command-center.refresh",
      "onCommand:project-command-center.runScript",
      "onCommand:project-command-center.runBestScript",
      "onCommand:project-command-center.openTerminal",
      "onCommand:project-command-center.openFile",
      "onCommand:project-command-center.openOrCreateFile",
      "onCommand:project-command-center.openRepository",
      "onCommand:project-command-center.createMissingBasics"
    ],
    categories: ["Other"],
    keywords: ["command center", "sidebar", "scripts", "project health", "git", "terminal", "workspace", "developer tools", "vs code"],
    copyLogo: true,
    commands: [
      { command: "project-command-center.open", title: "Open Project Command Center", category: "Colin's Project Command Center" },
      { command: "project-command-center.refresh", title: "Refresh Project Command Center", category: "Colin's Project Command Center" },
      { command: "project-command-center.runBestScript", title: "Run Best Project Script", category: "Colin's Project Command Center" },
      { command: "project-command-center.openTerminal", title: "Open Project Terminal", category: "Colin's Project Command Center" },
      { command: "project-command-center.openRepository", title: "Open Project Repository", category: "Colin's Project Command Center" },
      { command: "project-command-center.createMissingBasics", title: "Create Missing Project Basics", category: "Colin's Project Command Center" }
    ],
    viewsContainers: {
      activitybar: [
        {
          id: "project-command-center",
          title: "Command Center",
          icon: "assets/logo-mark.png"
        }
      ]
    },
    views: {
      "project-command-center": [
        {
          id: "project-command-center.view",
          name: "Command Center"
        }
      ]
    },
    menus: {
      "view/title": [
        {
          command: "project-command-center.refresh",
          when: "view == project-command-center.view",
          group: "navigation"
        }
      ]
    },
    expectedCommands: [
      "project-command-center.open",
      "project-command-center.refresh",
      "project-command-center.runBestScript",
      "project-command-center.openTerminal",
      "project-command-center.openRepository",
      "project-command-center.createMissingBasics"
    ],
    syntaxFiles: ["extension.js", "src/commandCenter.js", "src/project.js"],
    readme: lines([
      "# Colin's Project Command Center",
      "",
      "A focused VS Code sidebar for quickly understanding and operating the workspace you have open.",
      "",
      "## Features",
      "",
      "- Detect project type, package manager, package scripts, Git branch, remote URL, and working tree state.",
      "- Run the best available script or any package script from the sidebar.",
      "- Open a terminal, README, repository remote, or starter project files.",
      "- Surface basic project health checks for README, .gitignore, license, CI, build, test, and lint coverage.",
      "- Link into Colin's standalone tools when they are installed.",
      "",
      "## Usage",
      "",
      "Open the **Command Center** activity bar view, or run **Colin's Project Command Center: Open Project Command Center** from the Command Palette.",
      "",
      "## Local Development",
      "",
      "```sh",
      "npm install",
      "npm run build",
      "npx @vscode/vsce package --allow-missing-repository",
      "```"
    ]),
    sources: {
      "src/commandCenter.js": commandCenterSource,
      "src/project.js": read("src/project.js")
    }
  },
  {
    localDir: "SnippetForge",
    repoName: "SnippetForge",
    packageName: "snippet-forge",
    displayName: "Colin's Snippet Forge",
    description: "Turn selected code into reusable VS Code workspace snippets with smart placeholder suggestions.",
    registerName: "registerSnippetForge",
    moduleName: "snippetForge",
    activationEvents: [
      "onCommand:snippet-forge.createFromSelection",
      "onCommand:snippet-forge.openWorkspaceSnippets"
    ],
    categories: ["Snippets", "Other"],
    keywords: ["snippets", "snippet generator", "workspace snippets", "code snippets", "placeholders", "selection", "developer tools", "vs code"],
    commands: [
      { command: "snippet-forge.createFromSelection", title: "Forge Snippet From Selection", category: "Colin's Snippet Forge" },
      { command: "snippet-forge.openWorkspaceSnippets", title: "Open Snippet Forge Workspace Snippets", category: "Colin's Snippet Forge" }
    ],
    menus: {
      "editor/context": [
        {
          command: "snippet-forge.createFromSelection",
          when: "editorHasSelection",
          group: "navigation"
        }
      ]
    },
    expectedCommands: ["snippet-forge.createFromSelection", "snippet-forge.openWorkspaceSnippets"],
    syntaxFiles: ["extension.js", "src/snippetForge.js", "src/project.js"],
    readme: lines([
      "# Colin's Snippet Forge",
      "",
      "Turn selected code into a clean VS Code workspace snippet without manually escaping JSON or rebuilding tab stops by hand.",
      "",
      "## Features",
      "",
      "- Suggest snippet prefixes from the selected code and current language.",
      "- Detect repeated identifiers and offer them as snippet placeholders.",
      "- Preview generated snippet JSON in an unsaved editor.",
      "- Save snippets to `.vscode/colins-snippets.code-snippets` or copy the JSON.",
      "- Open the workspace snippet file whenever you need to review it.",
      "",
      "## Usage",
      "",
      "Select code in an editor, then run **Colin's Snippet Forge: Forge Snippet From Selection** from the Command Palette or editor context menu.",
      "",
      "## Local Development",
      "",
      "```sh",
      "npm install",
      "npm run build",
      "npx @vscode/vsce package --allow-missing-repository",
      "```"
    ]),
    sources: {
      "src/snippetForge.js": snippetForgeSource,
      "src/project.js": read("src/project.js")
    }
  },
  {
    localDir: "ThemeReactor",
    repoName: "ThemeReactor",
    packageName: "theme-reactor",
    displayName: "Colin's Theme Reactor",
    description: "Automatically switch VS Code themes by season, holiday, time of day, favorites, and workspace.",
    registerName: "registerThemeReactor",
    moduleName: "themeReactor",
    activationEvents: ["onStartupFinished", ...themeReactorCommands.map((item) => `onCommand:${item.command}`)],
    categories: ["Themes", "Other"],
    keywords: ["theme switcher", "auto theme", "seasonal themes", "holiday themes", "time of day", "favorites", "workspace theme", "vs code"],
    commands: themeReactorCommands,
    configuration: themeReactorConfiguration,
    expectedCommands: themeReactorCommands.map((item) => item.command),
    syntaxFiles: ["extension.js", "src/themeReactor.js", "src/themeData.js", "src/utils.js"],
    readme: lines([
      "# Colin's Theme Reactor",
      "",
      "Theme Reactor automatically switches VS Code themes by season, holiday month, time of day, random favorites, and workspace overrides.",
      "",
      "It works with any installed VS Code theme names. It is tuned out of the box for **Colin's VS Code Themes**, so install that theme pack too if you want the default rotations to light up exactly as designed.",
      "",
      "## Features",
      "",
      "- Apply current seasonal or holiday themes.",
      "- Enable startup auto-theme switching.",
      "- Enable a hybrid Theme Reactor that changes while VS Code is open.",
      "- Pick, randomize, and configure favorite themes.",
      "- Set a workspace-specific theme override.",
      "- Apply coding presets for orange, focus, light, and gaming setups.",
      "",
      "## Usage",
      "",
      "Run **Colin's Theme Reactor: Enable Theme Reactor** from the Command Palette, then adjust settings under `themeReactor.*` if you want custom theme names.",
      "",
      "## Local Development",
      "",
      "```sh",
      "npm install",
      "npm run build",
      "npx @vscode/vsce package --allow-missing-repository",
      "```"
    ]),
    sources: {
      "src/themeReactor.js": themeReactorSource,
      "src/themeData.js": read("src/themeData.js"),
      "src/utils.js": read("src/utils.js").replace("[Colin's VS Code Themes]", "[Colin's Theme Reactor]")
    }
  }
];

for (const tool of tools) {
  commonFiles(tool);
  console.log(`Scaffolded ${tool.displayName} in ${tool.localDir}`);
}

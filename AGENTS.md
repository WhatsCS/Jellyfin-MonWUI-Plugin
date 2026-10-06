# Repository guide for coding agents

## Scope and project

- This guide applies to the whole repository. Preserve unrelated local changes; inspect `git status --short` before editing.
- JMSFusionV2 / MonWUI is a Jellyfin plugin: an ASP.NET Core backend plus JavaScript ES modules injected into Jellyfin Web. GMMP is the browser music player. This is not a standalone web application.
- [README.md](README.md) identifies the project as archived. Do not imply ongoing support or compatibility with newer Jellyfin versions.
- [JMSFusion.csproj](JMSFusion.csproj) targets .NET 9 and references Jellyfin 10.11.0. Assembly and root namespace are `Jellyfin.Plugin.JMSFusionV2`; retain legacy names in routes and storage keys unless a migration is intended.

## Build and validation

Run commands from the repository root:

| Purpose | Command |
| --- | --- |
| Install pinned frontend build dependencies | `npm ci --ignore-scripts --no-audit --no-fund` |
| Validate/minify frontend assets and build browser bundles | `npm run minify:assets` |
| Build the plugin, including frontend assets | `dotnet build JMSFusion.csproj --configuration Release` |
| Check whitespace problems in tracked changes | `git diff --check` |

- Prerequisites: a .NET SDK supporting `net9.0`, Node.js/npm, Bash, and Unix utilities. The metadata script uses GNU-style `date`/`sed`; `jq` is preferred but has a `sed` fallback.
- The .NET build installs npm dependencies if esbuild or Terser is missing, then runs the asset pipeline automatically. A separate `npm run minify:assets` is useful for frontend validation, not a prerequisite to every .NET build.
- The Release assembly is produced under `bin/Release/net9.0/` with the assembly name above.
- **Build side effect:** [update_meta.sh](update_meta.sh) rewrites tracked [meta.json](meta.json), updating its timestamp and, when passed the project version, its version and platform icon paths. Inspect this diff after building; do not include incidental release changes or discard pre-existing edits.
- [package.json](package.json) defines only the asset-minification script. No automated test project or lint/test script was found. A successful build is not proof of runtime behavior.
- For UI changes, validate in a Jellyfin Web instance when available: inspect console/network errors, verify the served bundle, navigate away and back, switch users, and test settings persistence. Report when runtime validation was unavailable.
- For documentation-only changes, check links and diffs; a full build is unnecessary and dirties metadata.

## Architecture map

| Area | Starting points |
| --- | --- |
| Plugin identity, configuration updates, script injection markup | [JMSFusionPlugin.cs](JMSFusionPlugin.cs), [JMSFusionConfiguration.cs](JMSFusionConfiguration.cs) |
| Dependency injection and active HTTP startup pipeline | [JMSFusionServiceRegistrator.cs](JMSFusionServiceRegistrator.cs), [Hosting/JMSStartupFilter.cs](Hosting/JMSStartupFilter.cs) |
| URL rewriting and asset cache/version handling | [Core/PathRewriteMiddleware.cs](Core/PathRewriteMiddleware.cs), [AssetVersioning.cs](AssetVersioning.cs) |
| Optional physical index patch | [IndexPatcher.cs](IndexPatcher.cs) |
| Server APIs | Controllers directory; e.g. [Controllers/UserSettingsController.cs](Controllers/UserSettingsController.cs), [Controllers/SerrController.cs](Controllers/SerrController.cs), [Controllers/ArrController.cs](Controllers/ArrController.cs) |
| Background jobs and persistent caches | [Core/TrailerAutomationService.cs](Core/TrailerAutomationService.cs), [Core/CinemaPreRollCacheService.cs](Core/CinemaPreRollCacheService.cs), [Core/ScopedCacheJsonService.cs](Core/ScopedCacheJsonService.cs) |
| Main frontend and music player entry points | [Resources/slider/main.js](Resources/slider/main.js), [Resources/slider/modules/player/main.js](Resources/slider/modules/player/main.js) |
| Authentication, API access, managed settings bridge | [RuntimeModules/auth.js](RuntimeModules/auth.js), [RuntimeModules/api.js](RuntimeModules/api.js), [RuntimeModules/storagePreload.js](RuntimeModules/storagePreload.js) |
| Browser settings | [Resources/slider/modules/config.js](Resources/slider/modules/config.js), [Resources/slider/modules/configPersistence.js](Resources/slider/modules/configPersistence.js), [Resources/slider/modules/settingsPage.js](Resources/slider/modules/settingsPage.js) |
| Jellyfin dashboard UI | [Web/configuration.html](Web/configuration.html), [Web/settings.js](Web/settings.js), [Web/ui.js](Web/ui.js) |
| Asset build | [tools/minify-assets.mjs](tools/minify-assets.mjs), [JMSFusion.csproj](JMSFusion.csproj) |

Read [docs/technical-overview.md](docs/technical-overview.md) for the detailed implementation walkthrough and [docs/seerr-arr-integration.md](docs/seerr-arr-integration.md) for external request integrations. Confirm behavior against current code when documentation differs.

## Asset and injection pitfalls

- Edit source assets, not generated files under `obj/`, `bin/`, or installed dependencies under `node_modules/`.
- The build script copies/minifies the Resources, RuntimeModules, and Web trees using Terser, then bundles three browser entry points with esbuild and ES-module code splitting. Generated bundles are embedded alongside the source resource trees.
- Standalone asset builds default to `obj/minified-assets/`. MSBuild instead passes its configuration-specific intermediate directory. Do not assume these output locations are interchangeable.
- Bundle entry names are `main`, `player`, and `storage-preload`; shared chunks have content hashes. Source imports using plugin runtime URLs are resolved by the custom esbuild resolver. Preserve that mapping when changing imports.
- `JMSStartupFilter` is the actively registered injection mechanism. File-provider rewriting classes also exist, but do not assume they are registered. Physical patching is separately controlled by `EnablePhysicalIndexHtmlPatchFallback`, disabled by default.
- Injection uses the `SL-INJECT BEGIN` marker to avoid duplication and caches transformed HTML. Preserve cache invalidation when changing configuration or injection behavior.
- Embedded `/slider` static middleware runs before the physical web-root slider fallback. The asset controller checks `ScriptDirectory` before its own embedded fallback, but cannot override requests already handled by middleware.
- Script URLs are versioned through `AssetVersioning`; hashed chunks also have separate cache behavior. When an edit appears ineffective, inspect the response URL, cache headers, and contents rather than assuming a source module is loaded directly.

## Editing conventions

- Follow the surrounding style; C# generally uses four-space indentation and block namespaces, while JavaScript generally uses two-space indentation and ES-module imports. Avoid broad formatting churn in this mixed-style codebase.
- Reuse the runtime auth/API helpers. Preserve server base-path handling and server/user scoping of caches and persisted data; do not assume a root-mounted, single-user server.
- Jellyfin Web is an SPA. Initialization must tolerate repeated route/view events. Clean up timers, observers, listeners, and media resources when views or users change.
- Settings span server configuration, browser defaults, persistence helpers, and settings UI. Trace all affected layers before adding or renaming a setting; keep language modules under Resources/slider/language consistent when adding UI text.
- `JMSFusionV2Plugin.UpdateConfiguration()` preserves existing non-default values for some incoming default-valued properties. Read its merge behavior before implementing reset or partial-update semantics.
- Keep credential/session fields out of managed-storage snapshots, logs, exports, and committed configuration. Preserve endpoint authorization and validate user-supplied paths and external integration inputs.
- Do not change plugin identity, release versions, [manifest.json](manifest.json), or metadata unless required by the task. Do not deploy a build or modify an installed Jellyfin instance without a request to do so.
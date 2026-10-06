# Repository guide for coding agents

## Scope and project

- This guide applies to the whole repository. Preserve unrelated local changes; inspect `git status --short` before editing.
- JMSFusionV2 / MonWUI is a Jellyfin plugin: an ASP.NET Core backend plus JavaScript ES modules injected into Jellyfin Web. GMMP is the browser music player. This is not a standalone web application.
- This repository is the WhatsCS fork of [G-grbz's original MonWUI / JMSFusion project](https://github.com/G-grbz/Jellyfin-MonWUI-Plugin). Preserve original-author and contributor credit, distinguish fork changes from upstream work, and retain GPLv3 licensing and existing notices. Do not imply upstream endorsement or unverified compatibility with newer Jellyfin versions.
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
- **Build side effect:** [update_meta.sh](update_meta.sh) rewrites tracked [meta.json](meta.json), updating its timestamp and, when passed the project version, its version and platform icon paths. It also prepends that version to [manifest.json](manifest.json) without duplicates and calculates its MD5 checksum when the matching release ZIP exists. Inspect both diffs after building; do not include incidental release changes or discard pre-existing edits.
- [package.json](package.json) defines only the asset-minification script. No automated test project or lint/test script was found. A successful build is not proof of runtime behavior.
- For UI changes, validate in a Jellyfin Web instance when available: inspect console/network errors, verify the served bundle, navigate away and back, switch users, and test settings persistence. Report when runtime validation was unavailable.
- For documentation-only changes, check links and diffs; a full build is unnecessary and dirties metadata.

## Shipping a build with GitHub CLI

- Create or publish a GitHub release only when the user requests it. A build or commit request alone does not authorize publishing. An explicit release request authorizes the release workflow; do not ask again unless a required choice is unresolved.
- Use `gh auth status`, inspect `git status --short`, and check `gh release list --repo WhatsCS/Jellyfin-MonWUI-Plugin` before publishing. Network restrictions can make authentication appear invalid; retry with the required sandbox approval before concluding credentials are broken. Never print tokens.
- Read the version from [JMSFusion.csproj](JMSFusion.csproj). Development releases currently use `v<version>-dev` tags and `--prerelease`; do not silently publish a development build as stable. The existing `v3.7.0.3-dev` release demonstrates this workflow.
- Release archives live at `bin/Release/JMSFusionV2-<version>-server.zip`. Build first unless the user explicitly wants to ship an existing archive. Verify that the ZIP contains the intended assembly and `meta.json`, and that its assembly version and contents correspond to the intended source commit. A matching filename alone is insufficient; never imply an older archive contains newer changes.
- After packaging the final ZIP, run `bash ./update_meta.sh "<version>"` again. The build invokes this script before a fresh archive may exist, so it may leave the checksum empty or hash an older ZIP. Compare the resulting manifest checksum with `md5sum bin/Release/JMSFusionV2-<version>-server.zip`. Do not modify the ZIP after hashing without recalculating the checksum.
- The script inherits the prior download URL pattern, including `-dev`. Check that `manifest.json` points to the exact intended release tag and asset name. Use `MANIFEST_SOURCE_URL`, `MANIFEST_CHANGELOG`, and `MANIFEST_TARGET_ABI` for explicit release details; `MANIFEST_CHECKSUM` is a fallback only when no local ZIP exists. Preserve version history and author credits, and describe validation limits accurately.
- Review and commit intended release metadata, then ensure the target commit is pushed before creating the release. Check for an existing tag/release; do not overwrite published assets or move tags without authorization. Write release notes to a temporary file and pass `--notes-file` to preserve formatting.

Example development release command (replace every placeholder with verified values):

```bash
gh release create "v<version>-dev" \
  "bin/Release/JMSFusionV2-<version>-server.zip" \
  --repo WhatsCS/Jellyfin-MonWUI-Plugin \
  --target "<pushed-commit-sha>" \
  --title "<release-title>" \
  --notes-file "<release-notes-file>" \
  --prerelease
```

After creation, verify the release tag, target commit, asset name, and download URL using `gh release view`, and report the release link to the user.

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

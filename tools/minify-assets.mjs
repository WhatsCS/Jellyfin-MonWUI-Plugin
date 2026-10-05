import { cp, mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join, relative } from "node:path";
import { build } from "esbuild";
import { minify } from "terser";

const projectRoot = process.argv[2] || process.cwd();
const outputRoot = process.argv[3] || join(projectRoot, "obj", "minified-assets");
const assetRoots = ["Resources", "RuntimeModules", "Web"];

async function filesUnder(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(entries.map(async (entry) => {
    const fullPath = join(directory, entry.name);
    if (entry.isDirectory()) return filesUnder(fullPath);
    return entry.isFile() ? [fullPath] : [];
  }));
  return files.flat();
}

await rm(outputRoot, { recursive: true, force: true });
await mkdir(outputRoot, { recursive: true });

for (const root of assetRoots) {
  const sourceRoot = join(projectRoot, root);
  const files = (await filesUnder(sourceRoot)).sort();

  for (const sourcePath of files) {
    const outputPath = join(outputRoot, relative(projectRoot, sourcePath));
    await mkdir(dirname(outputPath), { recursive: true });

    if (!sourcePath.endsWith(".js") || sourcePath.endsWith(".min.js")) {
      await cp(sourcePath, outputPath);
      continue;
    }

    const result = await minify(await readFile(sourcePath, "utf8"), {
      module: true,
      compress: { passes: 2 },
      mangle: true,
      format: { comments: false }
    });
    if (!result.code) throw new Error(`Terser produced no output for ${sourcePath}`);
    await writeFile(outputPath, result.code, "utf8");
  }
}

const runtimeImportPrefix = /^(?:\.\.\/)+Plugins\/JMSFusionV2\/runtime\//;
const legacyRuntimeImportPrefix = /^(?:\.\.\/)+Plugins\/JMSFusion\/runtime\//;
const sliderImportPrefix = /^\.\.\/\.\.\/\.\.\/slider\//;

await build({
  entryPoints: {
    main: join(projectRoot, "Resources", "slider", "main.js"),
    player: join(projectRoot, "Resources", "slider", "modules", "player", "main.js"),
    "storage-preload": join(projectRoot, "RuntimeModules", "storagePreload.js")
  },
  outdir: join(outputRoot, "Resources", "slider", "dist"),
  entryNames: "[name]",
  chunkNames: "chunks/[name]-[hash]",
  bundle: true,
  splitting: true,
  format: "esm",
  platform: "browser",
  target: "esnext",
  minify: true,
  sourcemap: false,
  legalComments: "none",
  plugins: [{
    name: "resolve-jellyfin-web-imports",
    setup(plugin) {
      plugin.onResolve({ filter: /.*/ }, (args) => {
        if (runtimeImportPrefix.test(args.path) || legacyRuntimeImportPrefix.test(args.path)) {
          return { path: join(projectRoot, "RuntimeModules", args.path.replace(runtimeImportPrefix, "").replace(legacyRuntimeImportPrefix, "")) };
        }
        if (sliderImportPrefix.test(args.path)) {
          return { path: join(projectRoot, "Resources", "slider", args.path.replace(sliderImportPrefix, "")) };
        }
        return null;
      });
    }
  }]
});

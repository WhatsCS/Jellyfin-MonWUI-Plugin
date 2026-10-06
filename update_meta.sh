#!/bin/bash
set -euo pipefail

FILE="meta.json"
if [ ! -f "$FILE" ]; then
  echo "❌ $FILE not found!"
  exit 1
fi

TS=$(date -u +"%Y-%m-%dT%H:%M:%S.%7NZ")
NEWVER="${1:-}"
# Optional release details: MANIFEST_SOURCE_URL, MANIFEST_CHECKSUM,
# MANIFEST_CHANGELOG, and MANIFEST_TARGET_ABI. Node.js is a build prerequisite.
if [ -n "$NEWVER" ]; then
  command -v node >/dev/null 2>&1 || { echo "❌ Node.js is required to update manifest.json."; exit 1; }
  [ -f manifest.json ] || { echo "❌ manifest.json not found!"; exit 1; }
fi
CLEAN="$(mktemp)"
grep -vE '^\s*//' "$FILE" > "$CLEAN"

if command -v jq >/dev/null 2>&1; then
  if [ -n "$NEWVER" ]; then
    jq --arg ts "$TS" --arg ver "$NEWVER" \
      '.timestamp = $ts
       | .version = $ver
       | .imagePathLinux   = ("/var/lib/jellyfin/plugins/JMSFusionV2_" + $ver + "/icon.png")
       | .imagePathWindows = ("%ProgramData%/Jellyfin/Server/plugins/JMSFusionV2_" + $ver + "/icon.png")' \
      "$CLEAN" > "${FILE}.tmp"
  else
    jq --arg ts "$TS" '.timestamp = $ts' "$CLEAN" > "${FILE}.tmp"
  fi
  mv "${FILE}.tmp" "$FILE"
else
  echo "⚠️ jq is unavailable; updating with sed."
  sed -E -i "s#\"timestamp\"\\s*:\\s*\"[^\"]*\"#\"timestamp\": \"$TS\"#g" "$FILE"

  if [ -n "$NEWVER" ]; then
    sed -E -i "s#\"version\"\\s*:\\s*\"[^\"]*\"#\"version\": \"$NEWVER\"#g" "$FILE" || true
    if grep -qE "\"imagePathLinux\"" "$FILE"; then
      sed -E -i \
        "s#(\"imagePathLinux\"\\s*:\\s*\")/var/lib/jellyfin/plugins/JMSFusionV2_[^\"]+/icon\\.png(\")#\1/var/lib/jellyfin/plugins/JMSFusionV2_${NEWVER}/icon.png\2#g" \
        "$FILE" || true
    else
      sed -E -i "s#}\\s*$#,\n  \"imagePathLinux\": \"/var/lib/jellyfin/plugins/JMSFusionV2_${NEWVER}/icon.png\"\n}#g" "$FILE" || true
    fi
    if grep -qE "\"imagePathWindows\"" "$FILE"; then
      sed -E -i \
        "s#(\"imagePathWindows\"\\s*:\\s*\")%ProgramData%/Jellyfin/Server/plugins/JMSFusionV2_[^\"]+/icon\\.png(\")#\1%ProgramData%/Jellyfin/Server/plugins/JMSFusionV2_${NEWVER}/icon.png\2#g" \
        "$FILE" || true
    else
      sed -E -i "s#}\\s*$#,\n  \"imagePathWindows\": \"%ProgramData%/Jellyfin/Server/plugins/JMSFusionV2_${NEWVER}/icon.png\"\n}#g" "$FILE" || true
    fi
  fi
fi

rm -f "$CLEAN"

if [ -n "$NEWVER" ]; then
  node --input-type=module - "$NEWVER" "$TS" <<'NODE'
import fs from 'node:fs';
import { createHash } from 'node:crypto';

const [version, timestamp] = process.argv.slice(2);
const file = 'manifest.json';
const manifest = JSON.parse(fs.readFileSync(file, 'utf8'));
const plugin = manifest.find(entry => entry.guid === 'c0b4a5e0-2f6a-4e70-9c5f-1e7c2d0b7f12');
if (!plugin || !Array.isArray(plugin.versions) || !plugin.versions.length) {
  throw new Error('manifest.json must contain JMSFusionV2 and a version to use as a template');
}

const existing = plugin.versions.find(entry => entry.version === version);
const previous = plugin.versions[0];
const entry = existing ? { ...existing } : {
  version,
  changelog: '',
  targetAbi: previous.targetAbi,
  sourceUrl: previous.sourceUrl.split(previous.version).join(version),
  checksum: '',
  timestamp
};
for (const [field, variable] of Object.entries({
  sourceUrl: 'MANIFEST_SOURCE_URL',
  checksum: 'MANIFEST_CHECKSUM',
  changelog: 'MANIFEST_CHANGELOG',
  targetAbi: 'MANIFEST_TARGET_ABI'
})) {
  if (process.env[variable] !== undefined) entry[field] = process.env[variable];
}
const archive = `bin/Release/JMSFusionV2-${version}-server.zip`;
if (fs.existsSync(archive)) {
  const hash = createHash('md5');
  for await (const chunk of fs.createReadStream(archive)) hash.update(chunk);
  entry.checksum = hash.digest('hex');
  console.log(`   checksum = ${entry.checksum} (${archive})`);
} else {
  console.warn(`⚠️ ${archive} not found; checksum was not calculated. Rerun after packaging.`);
}
plugin.versions = [entry, ...plugin.versions.filter(item => item.version !== version)];
// Avoid rewriting the manifest on repeated builds of the same version.
const output = `${JSON.stringify(manifest, null, 2)}\n`;
if (JSON.stringify(JSON.parse(fs.readFileSync(file, 'utf8'))) !== JSON.stringify(manifest)) {
  fs.writeFileSync(`${file}.tmp`, output);
  fs.renameSync(`${file}.tmp`, file);
}
console.log(`✅ manifest.json updated: newest version = ${version}`);
NODE
fi

echo "✅ meta.json updated:"
echo "   timestamp       = $TS"
[ -n "$NEWVER" ] && {
  echo "   version         = $NEWVER"
  echo "   imagePathLinux  = /var/lib/jellyfin/plugins/JMSFusionV2_${NEWVER}/icon.png"
  echo "   imagePathWindows= %ProgramData%/Jellyfin/Server/plugins/JMSFusionV2_${NEWVER}/icon.png"
}
exit 0

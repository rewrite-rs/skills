import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export function syncVersion(repoRoot, { check = false } = {}) {
  const packagePath = join(repoRoot, "package.json");
  const pluginPath = join(repoRoot, ".claude-plugin", "plugin.json");
  const packageVersion = JSON.parse(readFileSync(packagePath, "utf8")).version;
  const plugin = JSON.parse(readFileSync(pluginPath, "utf8"));
  const pluginVersion = plugin.version;
  const codexPath = join(repoRoot, ".codex-plugin", "plugin.json");
  const codex = existsSync(codexPath) ? JSON.parse(readFileSync(codexPath, "utf8")) : null;
  const codexVersion = codex?.version;
  const changed =
    packageVersion !== pluginVersion || (codex !== null && packageVersion !== codexVersion);

  if (changed && !check) {
    plugin.version = packageVersion;
    writeFileSync(pluginPath, `${JSON.stringify(plugin, null, 2)}\n`);
    if (codex !== null) {
      codex.version = packageVersion;
      writeFileSync(codexPath, `${JSON.stringify(codex, null, 2)}\n`);
    }
  }

  return { changed, packageVersion, pluginVersion, codexVersion };
}

const invokedDirectly = process.argv[1]?.endsWith("sync-plugin-version.mjs");
if (invokedDirectly) {
  const check = process.argv.includes("--check");
  const { changed, packageVersion, pluginVersion, codexVersion } = syncVersion(process.cwd(), { check });
  if (check && changed) {
    console.error(
      `✗ plugin manifest versions (claude ${pluginVersion}, codex ${codexVersion ?? "absent"}) do not match package.json version ${packageVersion}`
    );
    process.exit(1);
  }
  console.log(
    changed ? `✓ synced plugin.json to ${packageVersion}` : `✓ versions already match (${packageVersion})`
  );
}

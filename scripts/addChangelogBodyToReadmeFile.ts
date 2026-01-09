import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import parseChangelog from "changelog-parser";

/**
 * This script adds the latest changelog entry to the README.md file of each package.
 */

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const packagesDir = path.join(__dirname, "..", "packages");

const CHANGELOG_SEPARATOR_LINE = "<!-- AUTO GENERATED CHANGELOG -->";
const CHANGELOG_FILENAME = "CHANGELOG.md";

export async function addChangelogBodyToReadmeFile() {
  const packagePath = path.join(__dirname, "..");

  // Get package name from package.json
  const packageJsonPath = path.join(packagePath, "package.json");
  const packageJson = JSON.parse(await fs.readFile(packageJsonPath, "utf-8"));
  const packageName = packageJson.name || "package";

  // changelog from package
  try {
    await fs.access(path.join(packagePath, CHANGELOG_FILENAME));

    const parsed = await parseChangelog(path.join(packagePath, CHANGELOG_FILENAME));

    if (!parsed.versions || parsed.versions.length === 0) {
      throw new Error("No versions found in changelog");
    }

    const latestVersion = parsed.versions[0];
    if (!latestVersion) {
      throw new Error("Latest version is undefined");
    }

    const lastPackageReadmeFile = await fs.readFile(path.join(packagePath, "README.md"), "utf-8");

    const contentWithoutChangelog = lastPackageReadmeFile.split(CHANGELOG_SEPARATOR_LINE)[0];

    const toAdd = [
      CHANGELOG_SEPARATOR_LINE,
      "",
      "## Changelog",
      "",
      `Full changelog for stable version is available [here](https://github.com/patzick/nuxt-bluesky-comments/blob/main/${CHANGELOG_FILENAME})`,
      "",
      `### Latest changes: ${latestVersion.title}`,
      "",
      latestVersion.body,
      "",
    ];

    const finalContent = contentWithoutChangelog + toAdd.join("\n");

    await fs.writeFile(path.join(packagePath, "README.md"), finalContent);

    // eslint-disable-next-line no-console
    console.log(`+ Changelog for package ${packageName} added.`);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.log(
      `- Changelog for package ${packageName} omitted:`,
      e instanceof Error ? e.message : String(e),
    );
  }
}

async function run() {
  await addChangelogBodyToReadmeFile();
}

run();

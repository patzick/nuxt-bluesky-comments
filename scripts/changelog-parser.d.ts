declare module "changelog-parser" {
  interface ChangelogVersion {
    title: string;
    body: string;
  }

  interface ParsedChangelog {
    versions: ChangelogVersion[];
  }

  function parseChangelog(filePath: string): Promise<ParsedChangelog>;

  export default parseChangelog;
}

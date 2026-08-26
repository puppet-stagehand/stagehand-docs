import { readdir, readFile, stat } from 'node:fs/promises';
import { join, relative, resolve, sep } from 'node:path';

interface CoverageLists {
  literals: Set<string>;
  globPrefixes: string[];
}

function parseInvalidationPaths(deployScriptText: string): CoverageLists {
  const marker = '--paths';
  const markerIndex = deployScriptText.indexOf(marker);
  const relevantText =
    markerIndex === -1 ? deployScriptText : deployScriptText.slice(markerIndex + marker.length);

  const literals = new Set<string>();
  const globPrefixes: string[] = [];

  const tokenPattern = /'(\/[^']*)'/g;
  let match: RegExpExecArray | null;
  while ((match = tokenPattern.exec(relevantText)) !== null) {
    const token = match[1];
    if (token.endsWith('*')) globPrefixes.push(token.slice(0, -1));
    else literals.add(token);
  }

  return { literals, globPrefixes };
}

async function collectBuiltRoutes(buildRoot: string): Promise<string[]> {
  const routes: string[] = [];

  async function walk(dir: string): Promise<void> {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        if (entry.name === 'assets') continue;
        await walk(join(dir, entry.name));
        continue;
      }
      if (entry.isFile() && entry.name.endsWith('.html')) {
        const fullPath = join(dir, entry.name);
        const webPath = `/${relative(buildRoot, fullPath).split(sep).join('/')}`;
        routes.push(webPath);
      }
    }
  }

  await walk(buildRoot);
  return routes;
}

export async function findMissingInvalidationPaths(
  buildRoot: string,
  deployScriptPath: string,
): Promise<string[]> {
  const resolvedBuildRoot = resolve(buildRoot);
  const resolvedDeployScriptPath = resolve(deployScriptPath);

  await stat(resolvedBuildRoot);
  const deployScriptText = await readFile(resolvedDeployScriptPath, 'utf8');
  const { literals, globPrefixes } = parseInvalidationPaths(deployScriptText);

  const routes = await collectBuiltRoutes(resolvedBuildRoot);

  return routes.filter((route) => {
    if (literals.has(route)) return false;
    if (globPrefixes.some((prefix) => route.startsWith(prefix))) return false;
    return true;
  });
}

const buildRoot = process.argv[2] ?? 'dist';
const deployScriptPath = process.argv[3] ?? 'scripts/deploy-site.sh';

const missing = await findMissingInvalidationPaths(buildRoot, deployScriptPath);

if (missing.length > 0) {
  throw new Error(
    `Routes missing from invalidation list in ${deployScriptPath}:\n${missing
      .map((path) => `- ${path}`)
      .join('\n')}`,
  );
}

const routes = await collectBuiltRoutes(resolve(buildRoot));
console.log(`Verified ${routes.length} routes are covered by the invalidation list`);

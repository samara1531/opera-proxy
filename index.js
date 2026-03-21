const axios = require('axios');
const cheerio = require('cheerio');

const version = process.argv[2];
if (!version) {
  console.error('Version argument is required');
  process.exit(1);
}

// Для релизов используем releases, для SNAPSHOT — snapshots
// Но если SNAPSHOT тебе не нужен — можно убрать эту ветку
const isSnapshot = version.toUpperCase() === 'SNAPSHOT';
const baseUrl = isSnapshot
  ? 'https://downloads.openwrt.org/snapshots/targets/'
  : `https://downloads.openwrt.org/releases/${version}/targets/`;

console.error(`Using base URL: ${baseUrl}`);

// --- HTTP helpers ---
async function fetchHTML(url) {
  try {
    const { data } = await axios.get(url);
    return cheerio.load(data);
  } catch (err) {
    console.error(`fetchHTML error: ${url} → ${err.message}`);
    return null;
  }
}

async function fetchJSON(url) {
  try {
    const { data } = await axios.get(url);
    return data;
  } catch {
    return null;
  }
}

// --- Get target folders ---
async function getTargets() {
  const $ = await fetchHTML(baseUrl);
  if (!$) return [];
  return $('table tr td.n a')
    .map((i, el) => $(el).attr('href'))
    .get()
    .filter(href => href && href.endsWith('/'))
    .map(href => href.slice(0, -1));
}

// --- Get subtarget folders ---
async function getSubtargets(target) {
  const $ = await fetchHTML(`${baseUrl}${target}/`);
  if (!$) return [];
  return $('table tr td.n a')
    .map((i, el) => $(el).attr('href'))
    .get()
    .filter(href => href && href.endsWith('/'))
    .map(href => href.slice(0, -1));
}

// --- Get pkgarch ---
async function getPkgarch(target, subtarget) {
  const baseTargetUrl = `${baseUrl}${target}/${subtarget}/`;

  // 1) index.json
  let json = await fetchJSON(`${baseTargetUrl}packages/index.json`);
  if (json && typeof json.architecture === 'string') {
    return [json.architecture];
  }

  // 2) profiles.json
  json = await fetchJSON(`${baseTargetUrl}profiles.json`);
  if (json && typeof json.arch_packages !== 'undefined') {
    return Array.isArray(json.arch_packages) ? json.arch_packages : [json.arch_packages];
  }

  // 3) Fallback — теперь ищет и .ipk, и .apk
  return [await getPkgarchFallback(target, subtarget)];
}

// --- Fallback function — поддержка .apk и .ipk ---
async function getPkgarchFallback(target, subtarget) {
  const packagesUrl = `${baseUrl}${target}/${subtarget}/packages/`;
  let pkgarch = 'unknown';
  const $ = await fetchHTML(packagesUrl);
  if (!$) return pkgarch;

  // Ищем не-kernel .apk или .ipk
  $('a').each((i, el) => {
    const name = $(el).attr('href');
    if (!name) return;

    if ((name.endsWith('.ipk') || name.endsWith('.apk')) &&
        !name.startsWith('kernel_') && !name.includes('kmod-')) {
      const match = name.match(/_([a-zA-Z0-9_-]+)\.(ipk|apk)$/);
      if (match) {
        pkgarch = match[1];
        return false; // break
      }
    }
  });

  // Если не нашли — смотрим kernel_*.apk / .ipk
  if (pkgarch === 'unknown') {
    $('a').each((i, el) => {
      const name = $(el).attr('href');
      if (!name) return;

      if (name.startsWith('kernel_') &&
          (name.endsWith('.ipk') || name.endsWith('.apk'))) {
        const match = name.match(/_([a-zA-Z0-9_-]+)\.(ipk|apk)$/);
        if (match) {
          pkgarch = match[1];
          return false;
        }
      }
    });
  }

  return pkgarch;
}

// --- Main ---
async function main() {
  try {
    const targets = await getTargets();
    console.error(`Found ${targets.length} targets`);

    const matrix = [];
    const seen = new Set();

    for (const target of targets) {
      const subtargets = await getSubtargets(target);
      for (const subtarget of subtargets) {
        const archs = await getPkgarch(target, subtarget);
        for (const pkgarch of archs) {
          if (pkgarch === 'unknown') continue;
          const key = `${target}|${subtarget}|${pkgarch}`;
          if (!seen.has(key)) {
            seen.add(key);
            matrix.push({ target, subtarget, pkgarch });
          }
        }
      }
    }

    console.error(`Generated matrix with ${matrix.length} entries`);
    console.log(JSON.stringify({ include: matrix }));
  } catch (err) {
    console.error('Error:', err.message || err);
    process.exit(1);
  }
}

main();

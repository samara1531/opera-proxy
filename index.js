// index.js
const axios = require('axios');
const cheerio = require('cheerio');

const version = process.argv[2];
if (!version) {
  console.error('Version required');
  process.exit(1);
}

const isSnapshot = version.toUpperCase() === 'SNAPSHOT';
const base = isSnapshot
  ? 'https://downloads.openwrt.org/snapshots/targets/'
  : `https://downloads.openwrt.org/releases/${version}/targets/`;

async function fetchHTML(url) {
  try {
    const { data } = await axios.get(url, { timeout: 15000 });
    return cheerio.load(data);
  } catch (e) {
    console.error(`Fetch failed: ${url} → ${e.message}`);
    return null;
  }
}

async function getDirs(url) {
  const $ = await fetchHTML(url);
  if (!$) return [];
  return $('a')
    .map((_, el) => $(el).attr('href'))
    .get()
    .filter(h => h && h.endsWith('/') && !h.startsWith('?') && h !== '../')
    .map(h => h.slice(0, -1));
}

async function getPkgArch(target, subtarget) {
  const url = `${base}${target}/${subtarget}/`;
  let candidates = [];

  // 1. Пробуем profiles.json (новые релизы)
  try {
    const res = await axios.get(`${url}profiles.json`, { timeout: 8000 });
    if (res.data && res.data.arch_packages) {
      const archs = Array.isArray(res.data.arch_packages)
        ? res.data.arch_packages
        : [res.data.arch_packages];
      if (archs.length > 0) return archs;
    }
  } catch {}

  // 2. index.json (иногда есть)
  try {
    const res = await axios.get(`${url}packages/index.json`, { timeout: 8000 });
    if (res.data?.architecture) return [res.data.architecture];
  } catch {}

  // 3. Фallback — парсим .ipk из packages/
  try {
    const $ = await fetchHTML(`${url}packages/`);
    if ($) {
      $('a').each((_, el) => {
        const href = $(el).attr('href');
        if (!href || !href.endsWith('.ipk')) return;
        // берём первый нормальный не-kernel пакет
        if (href.includes('_') && !href.startsWith('kernel_') && !href.includes('kmod-')) {
          const match = href.match(/_([a-z0-9_-]+)\.ipk$/i);
          if (match && match[1] !== 'all') {
            candidates.push(match[1]);
          }
        }
      });
    }
  } catch {}

  // последний шанс — kernel
  if (candidates.length === 0) {
    try {
      const $ = await fetchHTML(`${url}kmods/`);
      if ($) {
        const first = $('a').toArray().find(a => a.attribs.href.endsWith('.ipk'));
        if (first) {
          const match = first.attribs.href.match(/_([a-z0-9_-]+)\.ipk$/i);
          if (match) candidates.push(match[1]);
        }
      }
    } catch {}
  }

  return candidates.length > 0 ? [...new Set(candidates)] : ['unknown'];
}

async function main() {
  const targets = await getDirs(base);
  const matrix = [];

  for (const target of targets) {
    const subtargets = await getDirs(`${base}${target}/`);
    for (const sub of subtargets) {
      const archs = await getPkgArch(target, sub);
      for (const arch of archs) {
        if (arch === 'unknown') continue;
        matrix.push({
          target,
          subtarget: sub,
          pkgarch: arch
        });
      }
    }
  }

  // Убираем дубликаты (на всякий случай)
  const unique = matrix.filter((v, i, a) =>
    a.findIndex(t => t.target === v.target && t.subtarget === v.subtarget && t.pkgarch === v.pkgarch) === i
  );

  console.log(JSON.stringify({ include: unique }));
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});

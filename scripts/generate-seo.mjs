import { readFile, writeFile } from 'node:fs/promises';
import process from 'node:process';
import { URL } from 'node:url';

const rawOrigin = process.env.VITE_SITE_URL ?? process.env.SITE_URL ?? '';
const origin = rawOrigin.replace(/\/$/, '');
const isPublicOrigin = /^https:\/\/[^/]+$/i.test(origin) && !origin.includes('example.com');
const routes = ['/', '/login', '/register', '/privacy', '/terms'];
const robotsPath = new URL('../dist/robots.txt', import.meta.url);

if (!isPublicOrigin) {
  process.stderr.write(
    'SEO: set VITE_SITE_URL to generate production canonical URLs and sitemap.xml.\n',
  );
  process.exit(0);
}

const indexPath = new URL('../dist/index.html', import.meta.url);
let html = await readFile(indexPath, 'utf8');
html = html
  .replace('href="https://example.com/"', `href="${origin}/"`)
  .replaceAll('content="/og-image.png"', `content="${origin}/og-image.png"`);
await writeFile(indexPath, html);

const sitemap = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  ...routes.map((route) => `  <url><loc>${origin}${route}</loc></url>`),
  '</urlset>',
  '',
].join('\n');
await writeFile(new URL('../dist/sitemap.xml', import.meta.url), sitemap);

const robots = await readFile(robotsPath, 'utf8');
await writeFile(robotsPath, `${robots.trim()}\nSitemap: ${origin}/sitemap.xml\n`);

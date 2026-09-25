import { readFile, writeFile } from 'node:fs/promises';
import { demoWords } from './words.js';

const [template, library, license] = await Promise.all(
  ['template.html', '../claper-wordcloud.js', '../LICENSE'].map(file =>
    readFile(new URL(file, import.meta.url), 'utf8')),
);
const marker = '      // @inline-wordcloud-demo';
const markerIndex = template.indexOf(marker);
if (markerIndex === -1 || template.indexOf(marker, markerIndex + marker.length) !== -1) {
  throw new Error('The demo template must contain exactly one inline source marker.');
}

// Keep sample text from being interpreted as HTML script delimiters.
const samples = JSON.stringify(demoWords).replaceAll('<', '\\u003c');
const inline = `/*\n${license.trim()}\n*/\n\n${library.trim()}\n\nconst demoWords = ${samples};`;
const html = template.replace(marker, () => inline);
const output = new URL('index.html', import.meta.url);

if (process.argv.includes('--check')) {
  if (await readFile(output, 'utf8') !== html) {
    throw new Error('demo/index.html is out of date. Run npm run build:demo.');
  }
  console.log('demo/index.html is up to date.');
} else {
  await writeFile(output, html);
  console.log('Built self-contained demo/index.html.');
}

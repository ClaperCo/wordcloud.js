# wordcloud.js

![Claper word cloud with Engineering and Architecture at the center](./demo/assets/wordcloud.png)

![Word cloud demo preview](./demo/assets/demo-preview.gif)

A dependency-free JavaScript word cloud for the browser. Word frequencies determine font sizes; the largest words sit in the center, with smaller rows above and below. The library supplies its own layout styles and does not require Tailwind or a framework.

[MIT license](./LICENSE) · [Contributing](./CONTRIBUTING.md) · [Security](./SECURITY.md)

## Demo

Double-click [demo/index.html](./demo/index.html) to open it directly in your browser. You can copy this one file anywhere. Its HTML, CSS, JavaScript, sample data, and MIT license are embedded, so it works offline without a server, npm, imports, or other files. JavaScript must be enabled for the interactive controls.

The demo includes Add, Fill data, Clear, and Reset buttons, plus highlight color, text color with automatic shades, and animation controls. Fill data loads 50 sample words; Reset restores the original eight. Both keep your selected configuration.

The checked-in file is ready to use. Maintainers edit `demo/template.html` and run `npm run build:demo` to regenerate it from the library and sample data; see [CONTRIBUTING.md](./CONTRIBUTING.md).

## Use the library in a web page

Copy `claper-wordcloud.js` and `LICENSE` into your project. When importing the library as a separate ES module, serve the page over HTTPS or localhost. Browser restrictions on `file://` imports do not affect the self-contained demo above.

```html
<div id="word-cloud" style="width: 100%; font-family: system-ui, sans-serif"></div>

<script type="module">
  import { createWordCloud } from './claper-wordcloud.js';

  const cloud = createWordCloud('#word-cloud', [
    { name: 'Engineering', count: 3 },
    { name: 'Design', count: 2 },
    { name: 'Curiosity', count: 1 },
  ]);

  cloud.add('Design'); // Another mention of the existing word.
</script>
```

Give the container an available width and let it grow vertically. Set its font family through your own CSS. The module does not replace unrelated children already inside the container; a dedicated empty element is recommended.

## Install with npm

Install from npm:

```sh
npm install @claperco/wordcloud.js
```

### Use in an application

Add a container to your application's HTML:

```html
<div id="word-cloud"></div>
```

Then import the library from application JavaScript using an ES-module-aware bundler:

```js
import { createWordCloud } from '@claperco/wordcloud.js';

const cloud = createWordCloud('#word-cloud', [
  { name: 'Design', count: 3 },
  { name: 'Engineering', count: 2 },
], { highlightColor: '#24AFEA' });

cloud.add('Design');

// When the view is removed:
// cloud.destroy();
```

The package has no runtime dependencies and ships its JavaScript directly, without a consumer-side install or build hook. It is an ES module, not a CommonJS build. Importing it alone does not access the DOM, but creating a cloud requires a browser. In an SSR application, call `createWordCloud()` after the component mounts and `cloud.destroy()` when it unmounts.

Installing through npm does not change the standalone demo: `node_modules/@claperco/wordcloud.js/demo/index.html` still opens directly from disk without a server.

### Install a local package

From a source checkout:

```sh
npm pack
```

This regenerates the standalone demo, runs verification, and creates `claperco-wordcloud.js-1.0.0.tgz`. Copy that archive into your application directory and install it:

```sh
npm install ./claperco-wordcloud.js-1.0.0.tgz
```

Use the same `import { createWordCloud } from '@claperco/wordcloud.js'` shown above.

## Browser requirements

Use a modern browser with ES modules, `ResizeObserver`, `crypto.randomUUID()`, the Web Animations API, and CSS `color-mix()`. Generated IDs require a secure context: HTTPS, localhost, or a local file in a browser that treats `file://` as trustworthy. The standalone demo is verified in Chromium with network access disabled. The library does not bundle polyfills.

Node.js is only needed for development, testing, and packaging. Contributors use Node.js 22 or 24; `.nvmrc` selects 24.

## Words and weights

Pass an array of strings or objects:

```js
cloud.setWords([
  'Design',
  { name: 'Engineering', count: 3 },
  { id: 'curiosity', name: 'Curiosity', count: 2 },
]);
```

- `name` must be nonempty after trimming.
- `count` defaults to `1` and must be a positive safe integer. The total mention count must not exceed `Number.MAX_SAFE_INTEGER`.
- `id` is optional and is converted to a string. Omitted IDs are generated automatically. IDs must be unique across distinct merged words.
- Names merge after Unicode NFKC normalization and lowercasing with `toLowerCase()`. Surrounding whitespace is trimmed; internal whitespace is preserved. The first trimmed spelling and ID are kept.

Weight is `count / total mentions`. For `['Design', 'Design', 'Engineering']`, the counts are 2 and 1, and the weights are 2/3 and 1/3. You do not supply weights manually.

The data API updates synchronously. DOM rendering is batched into animation frames; a hidden container renders when it has an available width again.

## API

### `createWordCloud(target, initialWords = [], options = {})`

`target` is a CSS selector or an `HTMLElement`. A missing or invalid container throws. Each call returns an independent cloud instance. Initialization errors remove the instance's mounting element and listeners before propagating.

| Method | Result and behavior |
| --- | --- |
| `add(name, count = 1)` | Returns the word's string ID. Adds mentions to an existing name or creates a new word. |
| `remove(id)` | Removes the word and all its mentions. An unknown ID is a no-op. |
| `setWords(words)` | Replaces all words and clears active highlights. Validation is atomic: invalid input leaves the previous data unchanged. |
| `getWords()` | Returns independent `{ id, name, count, p }` objects in insertion order. An empty cloud returns `[]`. |
| `clear()` | Removes every word and active highlight. The instance remains usable. |
| `setOptions(options)` | Merges the supplied supported options. Invalid values leave the previous settings unchanged. |
| `getOptions()` | Returns a copy of the current settings. |
| `destroy()` | Cancels pending work, disconnects listeners and observers, removes the rendered cloud, and releases stored words. |

Methods other than `add()`, `getWords()`, and `getOptions()` return `undefined`.

```js
const id = cloud.add('Research', 4);
console.log(cloud.getWords());
cloud.remove(id);
cloud.clear();
cloud.add('Fresh start');

// When the container is no longer needed:
cloud.destroy();
```

`destroy()` is terminal and safe to call repeatedly. Afterwards, `getWords()` returns `[]` and `getOptions()` remains readable. Mutating methods throw; create a new instance to render again.

Invalid word counts, conflicting IDs, and invalid option values throw `TypeError`. An unsafe total count throws `RangeError`. Mutating a destroyed instance throws `Error`. Do not rely on exact error-message wording.

## Options

```js
const cloud = createWordCloud('#word-cloud', ['Design', 'Engineering'], {
  highlightColor: '#ffd166',
  textColor: '#202020',
  animation: true,
});

cloud.setOptions({ animation: false });
cloud.setOptions({ textColor: null }); // Restore automatic gray shades.
```

| Option | Default | Meaning |
| --- | --- | --- |
| `highlightColor` | `'#24AFEA'` | A valid CSS color for the temporary highlight when a word is added or repeated. |
| `textColor` | `null` | A valid CSS base color, or `null` for automatic gray shades. Less frequent words blend the chosen color with white. |
| `animation` | `true` | Enables the bounce for new words and the highlight fade. |

Highlights last 800 ms. With animation disabled, or when the browser reports a reduced-motion preference, the highlight is static and then clears. Option updates also apply to active highlights. Expiring a highlight does not rebuild the layout.

## Layout and accessibility

The cloud uses deterministic rows, not a freeform collision layout. Equal frequencies produce equal font sizes. The nominal minimum size is 13 px; long phrases can shrink further to fit the container. The cloud grows vertically as words are added.

Widths are measured using the actual font. Container width changes and font-loading events trigger layout updates. There is no fixed maximum height or word count.

The rendered cloud uses a list role, with each word labeled with its count and percentage. Reduced-motion preferences disable animated effects. The cloud is not an interactive control; add application-specific input controls or a separate live status region if updates need announcements.

## Input safety

Word names and IDs are assigned as text and DOM attributes, not HTML. Color options are validated as CSS colors. If words come from an untrusted feed, limit distinct-word counts and name lengths in your application. Every distinct word requires a DOM element; the library does not enforce input-size limits or provide moderation.

See [SECURITY.md](./SECURITY.md) for reporting vulnerabilities.

## Development and license

Run `npm run verify` for syntax checks and the library's data and lifecycle regressions. There are no dependencies to install or build tools to configure. [CONTRIBUTING.md](./CONTRIBUTING.md) describes the source layout, local checks, and contribution process.

Development happens on `dev`. After merging a version bump into `main`, push a matching tag such as `v1.0.1` to publish to npm and create a GitHub Release after CI passes. Branch pushes do not publish. The tag must match `package.json` and point to a commit in `main`'s history. Release tags are restricted to repository administrators.

For maintainers: configure npm's [trusted publisher](https://docs.npmjs.com/trusted-publishers/) for organization `ClaperCo`, repository `wordcloud.js`, workflow `ci.yml`, and environment `npm`, with direct `npm publish` allowed. The GitHub `npm` environment must allow only `v*` tags. No npm token is required. Rerun the original tag workflow to retry a failed release; an existing npm version is skipped only if its archive matches. Prereleases use npm's `next` tag and GitHub's prerelease flag.

Copyright (c) 2026 Alex Lion. Released under the [MIT License](./LICENSE). You may use, modify, redistribute, and sell the software under its terms. Include the copyright and license notice with copies or substantial portions of the software, including when copying the JavaScript file directly.

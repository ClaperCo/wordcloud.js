# Contributing

Bug reports, documentation fixes, and focused pull requests are welcome.

## Local development

Fork and clone the repository. Use Node.js 22 or 24; `nvm use` selects Node.js 24 if you use nvm. There are no dependencies to install.

```sh
npm run build:demo # Regenerate the standalone demo.
npm run verify    # Check syntax, demo freshness, and run tests.
```

Open `demo/index.html` directly in a browser. No local server is needed.

## Project files

- `claper-wordcloud.js` — the library.
- `claper-wordcloud.test.js` — public API and lifecycle tests.
- `demo/template.html` — demo markup, styles, and controls.
- `demo/words.js` — sample data.
- `demo/build.js` — generates `demo/index.html` from the maintained sources.
- `demo/assets/` — images used in the README.

## Making changes

- Keep the library dependency-free and demo-specific behavior in `demo/`.
- Follow the existing style: two-space indentation, single quotes, and semicolons. See `.editorconfig`.
- After changing the library, demo template, sample data, or `LICENSE`, run `npm run build:demo` and include the updated `demo/index.html`. Do not edit the generated HTML directly.
- For bug fixes, include a reproduction and a regression test when useful. Test public behavior, not private implementation details or exact error wording.
- For rendering changes, check the demo in a browser: add and clear words, try long text and a narrow viewport, and check the controls and console. Node tests do not cover browser layout.
- Update the README when the public API or examples change.

## Pull requests and issues

Open pull requests against `dev`. Keep each change focused, explain why it is needed, and list the checks you ran.

For bug reports, include reproduction steps and, for browser issues, the browser version and viewport size. Report security vulnerabilities privately using [SECURITY.md](./SECURITY.md).

Contributions are covered by the project's [MIT License](./LICENSE). Only submit work you have the right to contribute, and preserve existing license notices.

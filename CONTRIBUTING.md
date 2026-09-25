# Contributing

Bug reports, documentation corrections, and focused pull requests are welcome. Contributions are licensed under the project's [MIT License](./LICENSE). Only submit material you have the right to contribute.

For security vulnerabilities, follow [SECURITY.md](./SECURITY.md) instead of posting exploit details in a public issue.

## Local setup

Use Node.js 22 or 24 and npm. If you use nvm, run `nvm use`; `.nvmrc` selects Node.js 24. The project has no runtime or development dependencies to install. The checked-in `demo.html` is ready to open directly in a browser.

```sh
npm run build:demo
npm run verify
npm run dev
```

Double-click `demo.html` for the self-contained demo, or open http://127.0.0.1:5173 while the optional `npm run dev` server is running. `PORT` overrides its port. Stop the server with Ctrl+C.

After changing `claper-wordcloud.js`, `words.js`, `LICENSE`, or `demo.template.html`, run `npm run build:demo` and commit the updated `demo.html`. The generator embeds the source, safely serializes sample text, and includes the full license. Do not hand-edit the generated copy of the library. `npm run check:demo` fails if the output is stale, and CI runs this check.

## Source map

| File | Responsibility |
| --- | --- |
| `claper-wordcloud.js` | Public API, validation, word storage, layout, highlights, and lifecycle. This is the only runtime module shipped to consumers. |
| `claper-wordcloud.test.js` | Public data and lifecycle contracts; only the DOM mounting shell is mocked. |
| `server.js`, `server.test.js` | Optional loopback-only demo server and real HTTP regressions. |
| `demo.template.html` | Maintained markup, CSS, and control code for the minimal demo. |
| `build-demo.js`, `demo.html` | Dependency-free generator and its checked-in, self-contained HTML output. |
| `words.js` | Sample dataset embedded in the standalone HTML by the generator. |
| `package.json` | Package entry point, version, publish allowlist, and commands. |
| `.github/workflows/ci.yml` | Read-only checks on Node.js 22 and 24, followed by npm publication only from `main`. |

## Making changes

Keep the runtime dependency-free and keep demo behavior out of the library. Prefer a small change to an existing function over a new abstraction or build step. Follow the existing two-space indentation, single quotes, and semicolons; `.editorconfig` records whitespace conventions.

Preserve these invariants when changing the implementation:

- The word array, normalized-name index, and total mention count agree after every mutation. Reject invalid replacements before committing any state.
- Snapshots returned by `getWords()` and `getOptions()` cannot mutate internal state.
- Rendering is scheduled once per animation frame. Batch DOM reads separately from writes, and avoid rerendering on height-only resize notifications.
- Highlight expiry clears the effect without rebuilding rows. Destruction releases timers, animation frames, observers, listeners, animations, and stored words.
- Word content goes through `textContent` or DOM attribute assignment, never HTML interpolation. Keep the local server's file allowlist explicit.

For a bug fix, include the smallest reproduction and keep a regression test when it protects an observable contract. Avoid assertions about exact error wording, private state, or source text. The Node tests do not exercise real browser layout, so a passing test run is not sufficient for rendering changes.

Update the README when public behavior, requirements, or examples change. Explain compatibility changes in the pull request. Include browser/version and viewport details for layout or performance reports.

## Browser checks

Use the playground to check changes to rendering or interactions:

- Open a copy of `demo.html` in a separate directory with no other files, using `file://` and with network access disabled. All controls must work without resource requests.
- Add a new word, repeat it, remove it, clear the cloud, and restore the demo. Counts and recent-word ordering should remain correct.
- Try a long phrase and narrow the viewport. Words should fit, and the page should not gain horizontal overflow.
- Change both colors and toggle animation. Also use the browser's reduced-motion emulation and wait for highlights to expire.
- Hide and show the container, resize it, and check font-loading changes if measurement code was touched.
- Destroy an instance with pending work; it must not render again or retain words. HTML-like word content must stay literal text.

Record which scenarios you exercised. Check the browser console for errors. For performance changes, record the same workload before and after the change rather than asserting wall-clock timing in unit tests.

## Automated checks

```sh
npm run build:demo # Regenerate the standalone HTML after source changes.
npm run check:demo # Verify the generated file matches its sources.
npm run check     # Syntax and generated-demo freshness checks.
npm test          # Public API/lifecycle and real HTTP server regressions.
npm run verify    # Both commands above.
```

GitHub Actions runs verification and a package dry-run for pushes and pull requests. The workflow assumes this directory is the repository root. Verification jobs have read-only repository permissions and no publishing credentials. Action revisions are pinned to commit hashes; Dependabot proposes monthly action updates. Review these updates before merging.

## Branches and releases

Use `dev` for development. Open feature pull requests against `dev`, then merge a release pull request from `dev` into `main`. Protect `main` with pull-request reviews and the `Node.js 22` and `Node.js 24` checks.

The `CI` workflow publishes `@claperco/wordcloud` after a push to `main`, but only after both verification jobs pass. Pull requests, `dev`, other branches, and tags never publish. **Run workflow** on `main` can retry a release without another commit; selecting `dev` runs checks only.

The workflow reads the version from `package.json`. An already-published version is skipped, so documentation-only merges and reruns do not attempt to overwrite it. Registry failures other than a missing version fail the job rather than being treated as permission to publish. Runs on `main` do not cancel an active release.

### One-time GitHub and npm setup

1. Create or choose the GitHub repository and add its clone URL as the `origin` remote. Keep `main` as the default branch. Configure the publishing environment below before the first push.
2. In GitHub **Settings → Environments**, create an environment named **`npm`**. Under **Deployment branches and tags**, select **Selected branches and tags** and allow only the **branch `main`**, not tags. This restriction also prevents a modified workflow on `dev` from using publishing credentials. Required reviewers are optional if releases need an additional approval.
3. For the first publication, create a short-lived [granular npm token](https://docs.npmjs.com/creating-and-viewing-access-tokens/) with **Packages and scopes → Read and write (publish and stage)** access limited to the **`@claperco` scope**, and enable **Bypass two-factor authentication** for non-interactive publishing. The account must already be allowed to publish to that scope. Organization-management permissions alone do not grant package publishing rights. Save the token as the **`NPM_TOKEN` environment secret** inside `npm`; never put it in repository files, logs, or pull-request jobs.
4. Push both local branches to publish the initial version from `main`. To retry without another commit, use **Actions → CI → Run workflow → main**. If the package already exists, skip the bootstrap token and configure trusted publishing directly.

   ```sh
   git push -u origin main
   git push -u origin dev
   ```

5. Once the package exists, open its npm **Settings → Trusted Publisher** and choose **GitHub Actions**. Enter the actual GitHub organization/user and repository, workflow filename **`ci.yml`** (not its full path), and environment **`npm`**. Enable direct **`npm publish`** in the allowed actions; stage-only permission does not permit this workflow to publish.
6. Delete the GitHub `NPM_TOKEN` environment secret and revoke the bootstrap token on npm. Later releases use [npm trusted publishing](https://docs.npmjs.com/trusted-publishers/) with short-lived OIDC credentials. npm recommends **Require two-factor authentication and disallow tokens** once trusted publishing is configured.

The publish job uses a GitHub-hosted runner, Node.js 24, and npm 11, with `id-token: write` limited to that job. npm trusted publishing requires npm 11.5.1 or newer. For a public source repository, trusted publishing automatically attaches provenance.

Before packing, CI sets `repository.type` and `repository.url` in the release checkout from GitHub's actual repository identity. The published package therefore points to the correct source repository without hard-coding a guessed URL. This does not create a commit or push changes back. Add the real `homepage` and `bugs` URLs to `package.json` when the repository is known, and enable private vulnerability reporting or provide a private contact in `SECURITY.md`.

### Preparing a release

1. On `dev`, choose a version using semantic versioning: patch for compatible fixes, minor for compatible features, major for breaking API or lifecycle changes. The initial release can use the existing `1.0.0`; later releases must increase it. For example:

   ```sh
   npm version patch --no-git-tag-version
   ```

   Update versioned documentation examples together with `package.json`. CI does not bump versions or create Git tags automatically.
2. Run the browser checks relevant to the changes. Record user-visible changes, compatibility notes, and the checks performed in the release pull request.
3. Run `npm pack`. Its `prepack` hook regenerates the standalone demo and runs verification before creating the archive. Inspect the listed files: the package contains the runtime module, self-contained HTML demo, README image assets, package metadata, license, and documentation, not the template, generator, full playground, or tests.
4. Install that archive into a small consumer project, import `createWordCloud` by package name, and bundle and run a browser example. Open the installed package's `demo.html` directly from disk as well.
5. Commit and push `dev`, then merge its reviewed release pull request into `main`. CI verifies the merged commit, packs it, and publishes that exact CI archive with public access and the default `latest` tag. Publish release notes on the repository host after the npm job succeeds.

Do not publish merely to test packaging; use `npm pack` and a local install instead. Keep `LICENSE` and the source copyright notice in distributions. Keep the publish allowlist explicit; update it only when consumers need an additional file. Preserve existing license notices when accepting external code.

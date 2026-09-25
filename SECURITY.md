# Security

## Reporting a vulnerability

Do not post exploit details, credentials, or private word data in a public issue or pull request.

Use the repository host's private vulnerability-reporting feature when available. On GitHub, this is **Security > Report a vulnerability**. If the repository does not offer a private reporting channel, open an issue asking the maintainer for one, without including technical details of the vulnerability. This project does not declare a dedicated security email address.

In a private report, include:

- The affected package version or commit and browser/Node.js version.
- A minimal reproduction using synthetic data.
- The expected behavior, observed behavior, and security impact.
- A suggested fix, if you have one.

The maintainer should establish a private reporting channel before the first public release. Disclosure timing should be agreed privately after the report is assessed; this project does not promise a response deadline.

## Supported fixes

Security fixes target the latest release. Older versions have no guaranteed backports. If a vulnerability affects a released version, release notes or a security advisory should identify the affected and fixed versions and any available mitigation.

## Security boundaries

The library renders supplied words in the current page. It does not authenticate users, moderate content, store data remotely, or send network requests. Names are assigned as text, IDs as DOM attributes, and colors are validated as CSS colors. Applications must enforce their own limits on word counts and name lengths when accepting untrusted input.

The standalone `demo/index.html` embeds its JavaScript and sample data and does not load CDN scripts or make network requests. Regenerate it from the maintained sources in `demo/` rather than inserting third-party code into the generated HTML.

CI checks pull-request code with read-only repository permissions and does not persist checkout credentials. Only pushes or manual runs on `main` can enter the npm publishing job, after verification succeeds. Configure the `npm` GitHub environment to allow only the `main` branch, and bind npm trusted publishing to `ci.yml` and that environment. The temporary bootstrap `NPM_TOKEN`, if needed, belongs only in that environment and should be revoked after trusted publishing is configured. Keep external actions pinned and do not add secrets to workflows that execute untrusted contributions.

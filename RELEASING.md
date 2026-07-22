# Releasing

Releases are fully automated with [semantic-release](https://semantic-release.gitbook.io/).
You never bump the version, tag, or run `npm publish` by hand — you just merge
[Conventional Commits](https://www.conventionalcommits.org/) into `master`.

## How it works

On every push to `master`, `.github/workflows/release.yml` runs semantic-release,
which:

1. reads the commits since the last release and decides the next version,
2. updates `CHANGELOG.md` and `package.json`,
3. publishes to npm via **OIDC trusted publishing** (no token, provenance attached),
4. creates the git tag and GitHub Release, and
5. commits the changelog/version bump back to `master` (with `[skip ci]`).

### Commit messages drive the version

| Commit type | Example | Release |
| --- | --- | --- |
| `fix:` | `fix: correct crop offset` | patch (1.0.**x**) |
| `feat:` | `feat: add imgproxy preset` | minor (1.**x**.0) |
| `feat!:` / `BREAKING CHANGE:` footer | `feat!: drop UMD build` | major (**x**.0.0) |
| `docs:` / `chore:` / `ci:` / `refactor:` / `test:` | — | no release |

## One-time setup (already done)

- **npm trusted publisher** configured on npmjs.com for this repo + `release.yml`
  (see the npm package's *Settings → Trusted Publisher*). This is what lets CI
  publish without an `NPM_TOKEN`.
- **Baseline tag** `v1.0.0` exists, matching the manually published `1.0.0`, so
  semantic-release knows where to continue from.
- No `NPM_TOKEN` secret is needed and none should be added — a token would
  interfere with OIDC trusted publishing.

## Cutting a release

Just merge to `master`. For example, a `fix:` commit merged to `master` publishes
the next patch automatically; a `feat:` publishes the next minor.

To preview what would be released without publishing:

```sh
npx semantic-release --dry-run
```

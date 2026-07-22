# Releasing

The first `1.0.0` was published manually. Every subsequent version is published
automatically by GitHub Actions using **npm Trusted Publishing (OIDC)** — there
is no npm token stored anywhere.

## One-time setup on npmjs.com (do this once)

1. Open <https://www.npmjs.com/package/background-image-cropper/access>
   (Settings → *Trusted Publisher*).
2. Add a **GitHub Actions** trusted publisher with:
   - **Organization / user:** `lsobolew`
   - **Repository:** `background-image-cropper`
   - **Workflow filename:** `publish.yml`
   - **Environment:** *(leave empty)*
3. Save. From now on the workflow can publish without a token.

> Trusted publishing is configured per package, which is why `1.0.0` had to be
> published manually first to create the package.

## Cutting a new release

1. Bump the version and commit it on `master`:
   ```sh
   npm version patch   # or minor / major — creates a commit + tag
   git push --follow-tags
   ```
2. Create a **GitHub Release** for that tag (UI, or `gh release create vX.Y.Z --generate-notes`).
3. Publishing `.github/workflows/publish.yml` runs on the release, executes
   `prepublishOnly` (typecheck + tests + build) and `npm publish` over OIDC, and
   attaches build provenance automatically.

To publish without cutting a release, trigger the workflow manually
(Actions → *Publish to npm* → *Run workflow*) after bumping the version.

## Manual publish (fallback)

```sh
npm publish --access public   # prompts for your 2FA one-time password
```

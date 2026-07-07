# Contributing

This project uses a lightweight feature-branch workflow. The goal is to keep
`main` stable and runnable while making larger changes easier to review,
pause, or discard.

## Prerequisites

- Node.js 24.17.0 or newer
- npm 11 or newer

If you use `nvm`, switch to the repository version before installing:

```sh
nvm use
```

Install dependencies:

```sh
npm ci
```

For local dependency updates while developing, use:

```sh
npm install
```

## Running the Application

During development, start the application with:

```sh
npm run dev
```

This starts the app in watch mode. Watching means the related process stays
running and reacts to file changes instead of requiring a manual restart:
webpack rebuilds the client bundles when client files change, TypeScript
recompiles the server when server files change, and Node restarts the compiled
server process.

For production-like usage, build the client and server, then start the
application:

```sh
npm start
```

Alternatively, build once and run the compiled server:

```sh
npm run build
npm run serve
```

For production deployments, configure an identifying Overpass user agent:

```sh
OVERPASS_USER_AGENT="2.5D-Indoor-Maps/1.0 (contact@example.org)" npm start
```

PowerShell:

```powershell
$env:OVERPASS_USER_AGENT = "2.5D-Indoor-Maps/1.0 (contact@example.org)"
npm start
```

## Checks

Run the same checks locally that GitHub Actions runs for pull requests:

```sh
npm run check
```

This runs linting, type checking, the Jest test suite, and a production build.
For stricter migration work, also run:

```sh
npm run typecheck:strict
```

## Branches

Keep `main` stable. Work on features and fixes in branches:

```sh
git switch -c feature/maplibre
git switch -c fix/overpass-rate-limit
git switch -c migration/maplibre
```

Suggested branch prefixes:

- `feature/` for normal improvements
- `fix/` for focused bug fixes
- `migration/` for larger technical changes
- `docs/` for documentation-only changes
- `release/` if a release needs final stabilization before tagging

## Commits

Prefer small commits that describe one coherent change.

Examples:

```text
Add helper for dom elements
Extract map and camera controls into interface
Include OpenStreetMap data attribution in README
```

## Changelog

Add user-visible or maintenance-relevant changes to `CHANGELOG.md` under
`Unreleased` while developing. Before a release, move those entries into a
versioned section:

```md
## 0.2.0 - 2026-06-26
```

Then update the version in `package.json`:

```sh
npm version minor --no-git-tag-version
```

Use `major`, `minor`, or `patch` depending on the size and compatibility of the
change. Commit the version and changelog update together.

## Releases

This project does not need binaries or a published npm package to have useful
releases. A release can be a Git tag plus release notes.

Create a release locally:

```sh
git switch -c release/v0.2.0
npm version minor --no-git-tag-version
git add package.json package-lock.json CHANGELOG.md
git commit -m "release: prepare 0.2.0"
git push origin release/v0.2.0
```

On GitHub:

1. Go to the repository page.
2. Open a Pull Request for the release prepare branch.
3. Merge the Pull Request.
4. Open "Releases".
5. Choose "Draft a new release".
6. Add the fitting tag, for example `v0.2.0`.
7. Use the changelog section as the release notes.
8. Publish the release.

Optional release attachments can be added later, such as a zip archive of a
production build, but they are not required for this project.

## Pull Request Checklist

Before merging:

- The feature or fix is complete enough to keep `main` runnable.
- Tests, type checks, linting, and build pass.
- Documentation is updated when behavior, setup, or workflow changes.
- `CHANGELOG.md` contains a short note for user-visible or maintenance-relevant changes.

# Engineering notes

Project-level conventions and recovery recipes. Add new entries as
H2 sections; keep each one short and concrete.

## Installing a client dep

`npm install <pkg> --legacy-peer-deps` in `client/` does more than its
name suggests — it can strip `"peer": true` flags from existing
lockfile nodes, breaking dedup so that transitive peer deps declared in
the lockfile never actually land in `node_modules`. The next Vite
build then fails with `Rolldown failed to resolve import "<peer>"`
even though the dep is referenced in `package-lock.json`.

**Recovery** when this happens:

1. `git checkout HEAD -- client/package.json client/package-lock.json`
2. Hand-edit `client/package.json` to add the new dep under
   `dependencies` (alphabetical to match style).
3. `cd client && rm -rf node_modules && npm install --legacy-peer-deps`
4. Re-run `npx vite build`. If it errors with "Rolldown failed to
   resolve import 'X'", install `X` explicitly with
   `npm install X --legacy-peer-deps` and rebuild. Repeat until clean.

**Diagnostic signal**: a package is referenced in `package-lock.json`
(usually as a peerDependency of another node) but is absent from
`client/node_modules`. Either confirms what `npm ls <pkg>` reports as
`(empty)`.

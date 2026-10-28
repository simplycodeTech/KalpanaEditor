# NPM Release Checklist — kalpna-angular-editor

**npm account:** [spubhe](https://www.npmjs.com/~spubhe)  
**Package name:** `kalpna-angular-editor` (confirmed available; not the same as existing `kalpna-editor` / `kalpna-editor-npm`)  
**Initial version:** `0.1.0`

You already publish under `spubhe`:
- `kalpna-editor@0.0.17`
- `kalpna-editor-npm@0.0.36`

This library uses a **new** package name so it does not conflict with those packages.

---

## 1. Prerequisites (local machine)

- Node.js 18 or 20
- Logged into npm as `spubhe`:

```bash
npm whoami
# should print: spubhe

# If not logged in:
npm login
```

Enable 2FA on the account if prompted. Prefer auth tokens that do **not** use the legacy “bypass 2FA” option (npm is restricting those).

---

## 2. Build and pack

From the workspace root (`kalpna-angular-editor/`):

```bash
npm install
npm run build:lib
npm test -- --watch=false --browsers=ChromeHeadless
npm run pack:lib
```

Inspect the tarball:

```bash
tar -tzf dist/kalpna-angular-editor/kalpna-angular-editor-0.1.0.tgz | head -60
```

Confirm:
- `package/fesm2022/` or equivalent ESM bundles
- `package/index.d.ts` (or typings entry)
- `package/package.json` with correct name/version/peerDependencies
- **No** demo app, tests, source maps of private code, or `.env` files

---

## 3. Local install verification

```bash
# In a separate empty Angular app (Angular 17–19):
ng new consumer-test --standalone --routing=false --style=css
cd consumer-test
npm install /path/to/kalpna-angular-editor/dist/kalpna-angular-editor/kalpna-angular-editor-0.1.0.tgz
```

In `app.component.ts`:

```typescript
import { KalpnaEditorComponent } from 'kalpna-angular-editor';
// add to imports and template: <kalpna-editor></kalpna-editor>
```

```bash
ng serve
```

Verify toolbar, typing, link safety, and forms binding.

---

## 4. Publish (public)

```bash
cd dist/kalpna-angular-editor
npm publish --access public
```

Or from workspace after build (if you prefer):

```bash
npm publish dist/kalpna-angular-editor --access public
```

Do **not** commit npm tokens or `.npmrc` with `_authToken` to git.

---

## 5. Post-publish verification

```bash
npm view kalpna-angular-editor name version author
npm install kalpna-angular-editor
```

Checklist:

- [ ] Package appears on https://www.npmjs.com/package/kalpna-angular-editor
- [ ] Owner is `spubhe`
- [ ] Version `0.1.0`
- [ ] README renders on the npm page
- [ ] Fresh install in a new Angular app works
- [ ] Git tag created: `git tag v0.1.0 && git push origin v0.1.0`

---

## 6. GitHub

1. Push the completed workspace to `simplycodeTech/kalpna-angular-editor`
2. Ensure CI workflow (`.github/workflows/ci.yml`) runs on push
3. Attach the release notes from `CHANGELOG.md`

---

## Commands summary

| Step | Command |
|------|---------|
| Install | `npm install` |
| Build library | `npm run build:lib` |
| Test | `npm test -- --watch=false --browsers=ChromeHeadless` |
| Pack | `npm run pack:lib` |
| Publish | `cd dist/kalpna-angular-editor && npm publish --access public` |
| Verify | `npm view kalpna-angular-editor` |

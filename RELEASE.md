# NPM Release Checklist — kalpna-editor

**npm account:** [spubhe](https://www.npmjs.com/~spubhe)  
**Package name:** `kalpna-editor`  
**GitHub:** https://github.com/simplycodeTech/KalpanaEditor  
**Current version:** `1.0.0`

---

## 1. Push source to GitHub

```bash
git add -A
git commit -m "Release 1.0.0: Kalpna Editor"
git push origin main
```

`node_modules/`, `dist/` and `.angular/` are ignored by `.gitignore`.

## 2. Build, test, pack

```bash
npm install
npm run build:lib
npm test
npm run pack:lib
tar -tzf dist/kalpna-editor/kalpna-editor-1.0.0.tgz
```

The tarball must contain only `package.json`, `README.md`, `index.d.ts`, `fesm2022/…` and `lib/…` typings.

## 3. Publish to npm

```bash
npm whoami                 # must print: spubhe  (otherwise: npm login)
cd dist/kalpna-editor
npm publish --access public
cd ../..
```

Never commit an `.npmrc` containing `_authToken`.

## 4. Tag the release

```bash
git tag v1.0.0
git push origin v1.0.0
```

## 5. Verify

```bash
npm view kalpna-editor version     # → 1.0.0
```

Then, in any Angular 17–19 app: `npm install kalpna-editor`.

## Next releases

1. Bump `version` in `projects/kalpna-angular-editor/package.json` (npm will refuse to publish the same version twice).
2. Add an entry to `CHANGELOG.md`.
3. Repeat steps 1–5.

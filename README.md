# Poornashree M — Portfolio

A static portfolio site. No build step is needed: Vercel serves the files as they are.

```
index.html     the portfolio (all text, styles and the résumé generator are in this one file)
assets/        photo, project screenshots, favicon, PDF library for the résumé button
vercel.json    caching for assets
```

The `projects/`, `architecture/` and `demo-source/` folders are from the earlier demo version. They are no longer linked and
`.vercelignore` keeps them off the site, so you can delete them.

## Deploy to Vercel (about 5 minutes)

### 1. Put this folder on GitHub

Easiest with GitHub Desktop: **File → Add local repository →** choose this `technical_portfolio` folder → **Create a repository** → **Publish repository** (name it e.g. `portfolio`, untick "Keep this code private" if you want it public).

Or from a terminal opened in this folder:

```powershell
git init
git add .
git commit -m "Portfolio"
git branch -M main
git remote add origin https://github.com/Poorna-04/portfolio.git   # create the empty repo on github.com first
git push -u origin main
```

### 2. Import it in Vercel

1. Go to https://vercel.com and sign in with GitHub.
2. **Add New… → Project**, find the `portfolio` repo, click **Import**.
3. Framework Preset: **Other**. Leave Build Command and Output Directory empty. Root Directory: `./`.
4. Click **Deploy**.

You get a URL like `portfolio-xxxx.vercel.app`. To get `poornashree.vercel.app`: **Project → Settings → Domains → Add** `poornashree.vercel.app` (if the name is free).

### 3. Updating later

Edit `index.html`, commit and push. Vercel redeploys automatically.

# Demo source

The files changed in each project's `frontend/` to make the static demos in `projects/`. Copy a project's files over its
frontend and rebuild with:

    # CareAxis (.env.production.local: VITE_DEMO_BACKEND=true, VITE_DEMO_ACCOUNTS=true)
    npx vite build --base=/projects/careaxis/
    # NAO (.env.production.local: VITE_DEMO_BACKEND=true; copy test-data/ocr/*.png to public/demo/)
    npx vite build --base=/projects/nao/
    # TuneTown (.env.production.local: VITE_DATA_SOURCE=local)
    npx vite build --base=/projects/tunetown/

then replace `projects/<name>/` with the new `dist/`. Vercel ignores this folder (see .vercelignore).

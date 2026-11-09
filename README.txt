# Fish Inventory Dashboard deployment files

## Files
- `server.js`: Express API with CORS and SQLite persistence support.
- `index.html`: GitHub Pages frontend. Set `API_BASE` to your deployed backend URL.
- `package.json`: backend dependencies and start command.
- `render.yaml`: Render Blueprint configuration with a persistent disk.

## Deploy the backend
1. Put `server.js`, `package.json`, and `render.yaml` in the root of a GitHub repository (or a backend folder configured as the Render Root Directory).
2. In Render, create a new Blueprint from that repository, or create a Web Service with:
   - Build command: `npm install`
   - Start command: `npm start`
3. A persistent disk is required for SQLite data to survive restarts/redeploys. The included Blueprint requests a paid `starter` service and a 1 GB disk.
4. Set these environment variables in Render:
   - `DB_DIR` = `/var/data`
   - `FRONTEND_ORIGIN` = `https://jamesarellano6002.github.io`
5. Deploy and copy the service URL, for example `https://fish-inventory-api.onrender.com`.

## Connect GitHub Pages
1. Open `index.html`.
2. Find `const API_BASE = 'https://YOUR-BACKEND.onrender.com';`
3. Replace the placeholder with your actual Render URL (no trailing slash).
4. Commit and push the updated `index.html` to the GitHub Pages repository.
5. Open `https://jamesarellano6002.github.io/Dashboard-App/` and refresh.

## Important database note
The online backend creates its own SQLite database and seeds the five example fish only if that database is empty. Your existing local `dashboard.db` data is not automatically uploaded. Back up and migrate any real records before using this online database.

## Local testing
Run `npm install`, then `npm start`. Open `http://localhost:3000` if you also place the HTML in a `public` folder and add static hosting, or test the API at `http://localhost:3000/api/fish`.

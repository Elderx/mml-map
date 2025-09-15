MML Map (OpenLayers WMTS/WMS)

This is a modern, modular OpenLayers app that loads base maps from Maanmittauslaitos WMTS, supports split view, drawing (marker/line/polygon/measure), WMS overlays (Digiroad), and optional Google Places search.

Reference example: https://openlayers.org/en/latest/examples/wmts-layer-from-capabilities.html

Requirements
- Node 18+ (Node 20 recommended) for local development
- Docker 24+ (optional, for containerized dev/prod)


Local development (recommended)
1) Install dependencies
```bash
npm ci
```
2) Start the dev server
```bash
npm run dev
```
3) Open the app at http://localhost:5173

Production build (local)
```bash
npm run build
# Serve the dist/ folder with any static server, e.g.:
npx serve dist
```

Docker - production (Caddy static server)
The Dockerfile builds a production image that serves the Vite build via Caddy on port 8080.

Important: The Vite config sets base to "/mml-map/" for production builds. You have two options:

- Option A (simplest): Access the app under the /mml-map/ path using a Caddyfile that strips the prefix
  1) Use this Caddyfile (you can replace the repo's Caddyfile with this):
  ```caddy
  :8080 {
    handle_path /mml-map/* {
      root * /srv
      file_server
    }
    root * /srv
    file_server
  }
  ```
  2) Build and run:
  ```bash
  docker build -t mml-map:prod .
  docker run --rm -p 8080:8080 mml-map:prod
  ```
  3) Open: http://localhost:8080/mml-map/

- Option B (serve at root "/"): Build with base "/" and still run Caddy
  The vite build base is driven by NODE_ENV in vite.config.js. Build with NODE_ENV=development (to set base "/"), but start the container with NODE_ENV=production so Caddy runs:
  ```bash
  # Build with base "/" (still a production build from Vite’s perspective)
  docker build -t mml-map:prod --build-arg NODE_ENV=development .
  # Run Caddy in the final image
  docker run --rm -e NODE_ENV=production -p 8080:8080 mml-map:prod
  ```
  Open: http://localhost:8080

Docker - development (Vite server in container)
This runs the dev server on 5173 from a dev stage.
```bash
docker build --target dev -t mml-map:dev .
docker run --rm -p 5173:5173 mml-map:dev
```
Open: http://localhost:5173

Notes
- Ports: 8080 (prod via Caddy), 5173 (dev via Vite)
- Google Places: The search bar requires a valid Google Maps API key. Update the script tag in `index.html` (`&key=...`) with your key, or remove the tag to disable search.
- Mapbox styles: A Mapbox access token is referenced in `src/config/constants.js`. Replace it with your own token for production use.
- Base path: See the two production options above. If you see 404s for assets in production, it’s almost always a base path versus server path mismatch.

OSM Data overlays (GeoJSON)
- Place your prefiltered GeoJSON files under the public `osm/` directory so they are served at `/osm/<file>.geojson`.
  - Example: `public/osm/filtered_amenity_school.geojson` → URL `/osm/filtered_amenity_school.geojson`
- Configure items in `src/state/store.js` under `osmItems`:
  ```js
  osmItems: [
    { id: 'amenity_school', title: 'Amenity: School', file: 'filtered_amenity_school.geojson' },
    { id: 'my_points', title: 'My Points', file: 'my_points.geojson' }
  ]
  ```
- Use the new “OSM Data” dropdown in the UI (under overlays) to toggle datasets.
- Selected datasets are persisted in the URL param `osm`, e.g. `&osm=amenity_school;my_points`.

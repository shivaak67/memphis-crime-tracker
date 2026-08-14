# Project structure guide

## Steps

1. Scaffold folders/files - done
2. Database blueprint + packages - done
3. Pull Memphis crime data (ingest) - done
4. Build data APIs for map and charts - in progress (`feat/api-incidents-stats`)
5. Build the public website UI
6. Deploy online

## API service windows

- `GET /api/incidents` - crime pins for the map (date, category, map area)
- `GET /api/stats` - numbers for charts (daily totals + by category)
- `GET|POST /api/sync` - private daily updater (needs secret key)

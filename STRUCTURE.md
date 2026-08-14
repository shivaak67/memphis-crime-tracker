# Project structure guide

## Steps

1. Scaffold folders/files - done
2. Database blueprint + packages - done
3. Pull Memphis crime data (ingest) - in progress (`feat/arcgis-ingest`)
4. Build data APIs for map and charts
5. Build the public website UI
6. Deploy online

## Data source

City of Memphis MPD Public Safety Incidents (ArcGIS):
https://services2.arcgis.com/saWmpKJIUAjyyNVc/arcgis/rest/services/MPD_Public_Safety_Incidents/FeatureServer/0

## Important new files this step

- `lib/arcgis.ts` - downloads crime reports from Memphis in pages
- `lib/sync.ts` - saves those reports into our database and logs each run
- `app/api/sync/route.ts` - secure web button the daily cron can call
- `scripts/sync-incidents.ts` - same update you can run on your computer

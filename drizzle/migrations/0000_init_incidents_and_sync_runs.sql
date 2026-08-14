CREATE TABLE "incidents" (
	"id" text PRIMARY KEY NOT NULL,
	"object_id" integer,
	"category" text,
	"crime_type" text,
	"reported_at" timestamp with time zone,
	"lat" double precision,
	"lng" double precision,
	"raw" jsonb,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sync_runs" (
	"id" serial PRIMARY KEY NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"finished_at" timestamp with time zone,
	"rows_upserted" integer,
	"status" text NOT NULL,
	"error_message" text
);
--> statement-breakpoint
CREATE INDEX "incidents_reported_at_idx" ON "incidents" USING btree ("reported_at");--> statement-breakpoint
CREATE INDEX "incidents_category_idx" ON "incidents" USING btree ("category");--> statement-breakpoint
CREATE INDEX "incidents_lat_lng_idx" ON "incidents" USING btree ("lat","lng");
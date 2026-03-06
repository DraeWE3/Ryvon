CREATE TABLE IF NOT EXISTS "CallLog" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" uuid NOT NULL,
	"phoneNumber" varchar(20) NOT NULL,
	"assistantId" varchar(64),
	"status" varchar(32),
	"transcript" text,
	"summary" text,
	"duration" text,
	"recordingUrl" text,
	"metadata" jsonb,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "CallLog" ADD CONSTRAINT "CallLog_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

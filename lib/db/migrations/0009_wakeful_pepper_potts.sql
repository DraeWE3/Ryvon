CREATE TABLE IF NOT EXISTS "ConnectorAuth" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" uuid NOT NULL,
	"provider" varchar(64) NOT NULL,
	"accessToken" text NOT NULL,
	"refreshToken" text,
	"tokenType" varchar(32) DEFAULT 'Bearer',
	"scope" text,
	"expiresAt" timestamp,
	"accountEmail" varchar(128),
	"accountName" varchar(128),
	"metadata" jsonb,
	"connectedAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "ConnectorAuth_userId_provider_unique" UNIQUE("userId","provider")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "Usage" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" uuid NOT NULL,
	"type" varchar NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "VerificationCode" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(64) NOT NULL,
	"code" varchar(6) NOT NULL,
	"expiresAt" timestamp NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "Waitlist" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(64) NOT NULL,
	CONSTRAINT "Waitlist_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "Workflow" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" uuid NOT NULL,
	"name" text NOT NULL,
	"triggerType" varchar DEFAULT 'manual' NOT NULL,
	"triggerValue" text DEFAULT 'manual' NOT NULL,
	"triggerDescription" text DEFAULT '' NOT NULL,
	"category" text DEFAULT 'General' NOT NULL,
	"icon" text DEFAULT 'Workflow' NOT NULL,
	"steps" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "WorkflowRun" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workflowId" uuid NOT NULL,
	"userId" uuid NOT NULL,
	"status" varchar DEFAULT 'pending' NOT NULL,
	"triggeredBy" varchar DEFAULT 'manual' NOT NULL,
	"startedAt" timestamp DEFAULT now() NOT NULL,
	"completedAt" timestamp,
	"stepResults" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"error" text
);
--> statement-breakpoint
ALTER TABLE "Stream" DROP CONSTRAINT "Stream_id_pk";--> statement-breakpoint
ALTER TABLE "Stream" ADD PRIMARY KEY ("id");--> statement-breakpoint
ALTER TABLE "User" ADD COLUMN "name" varchar(255);--> statement-breakpoint
ALTER TABLE "User" ADD COLUMN "image" text;--> statement-breakpoint
ALTER TABLE "User" ADD COLUMN "companyName" varchar(255);--> statement-breakpoint
ALTER TABLE "User" ADD COLUMN "timezone" varchar(64);--> statement-breakpoint
ALTER TABLE "User" ADD COLUMN "isVerified" boolean DEFAULT false NOT NULL;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ConnectorAuth" ADD CONSTRAINT "ConnectorAuth_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "Usage" ADD CONSTRAINT "Usage_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "Workflow" ADD CONSTRAINT "Workflow_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "WorkflowRun" ADD CONSTRAINT "WorkflowRun_workflowId_Workflow_id_fk" FOREIGN KEY ("workflowId") REFERENCES "public"."Workflow"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "WorkflowRun" ADD CONSTRAINT "WorkflowRun_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

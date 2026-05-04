import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { sql } from "drizzle-orm";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const sqlQuery = neon(process.env.POSTGRES_URL!);
const db = drizzle(sqlQuery);

async function main() {
  try {
    console.log("Adding isVerified to User...");
    await db.execute(sql`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "isVerified" boolean DEFAULT false NOT NULL;`);
    console.log("Creating VerificationCode table...");
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "VerificationCode" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "email" varchar(64) NOT NULL,
        "code" varchar(6) NOT NULL,
        "expiresAt" timestamp NOT NULL,
        "createdAt" timestamp DEFAULT now() NOT NULL
      );
    `);
    console.log("Done.");
  } catch (error) {
    console.error("Error:", error);
  }
}

main().then(() => process.exit(0)).catch(() => process.exit(1));

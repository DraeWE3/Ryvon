import { neon } from "@neondatabase/serverless";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

async function check() {
  const sql = neon(process.env.POSTGRES_URL!);
  try {
    const res = await sql`SELECT column_name FROM information_schema.columns WHERE table_name = 'User' AND column_name = 'isVerified';`;
    console.log("User.isVerified exists:", res.length > 0);
    
    const res2 = await sql`SELECT table_name FROM information_schema.tables WHERE table_name = 'VerificationCode';`;
    console.log("VerificationCode exists:", res2.length > 0);
  } catch(e) {
    console.error(e);
  }
}

check();

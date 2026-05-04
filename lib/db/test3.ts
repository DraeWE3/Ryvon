import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { user, verificationCode } from "./schema";
import { eq } from "drizzle-orm";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const client = postgres(process.env.POSTGRES_URL!, {
  max: 1,
  ssl: "require",
});
const db = drizzle(client);

async function createUser(email: string, password: string) {
  try {
    return await db.insert(user).values({ email, password });
  } catch (_error) {
    console.error("Create User Error:", _error);
    throw new Error("Failed to create user");
  }
}

async function createVerificationCode(email: string) {
  const code = "123456";
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

  try {
    await db.delete(verificationCode).where(eq(verificationCode.email, email));
    await db.insert(verificationCode).values({ email, code, expiresAt });
    return code;
  } catch (_error) {
    console.error("Create VC Error:", _error);
    throw new Error("Failed to create verification code");
  }
}

async function test() {
  const email = "test" + Date.now() + "@example.com";
  try {
    console.log("Creating user...", email);
    await createUser(email, "password123");
    console.log("User created!");

    console.log("Creating verification code...");
    const code = await createVerificationCode(email);
    console.log("Code created:", code);
  } catch (error) {
    console.error("Overall error:", error);
  } finally {
    await client.end();
  }
}

test().then(() => process.exit(0)).catch(() => process.exit(1));

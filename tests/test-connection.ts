// test-connection.ts
import { config } from "dotenv";
import postgres from "postgres";

config({ path: ".env.local" });

async function testConnection() {
  console.log("Testing database connection...");
  console.log("POSTGRES_URL exists:", !!process.env.POSTGRES_URL);
  
  try {
    const connection = postgres(process.env.POSTGRES_URL!);
    
    // Test basic query
    const result = await connection`SELECT NOW() as time`;
    console.log("✅ Connection successful!");
    console.log("Current time:", result[0].time);
    
    // Check if User table exists
    const tables = await connection`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name = 'User'
    `;
    console.log("User table exists:", tables.length > 0);
    
    // Try to select from User table
    const users = await connection`SELECT COUNT(*) as count FROM "User"`;
    console.log("User count:", users[0].count);
    
    await connection.end();
  } catch (error) {
    console.error("❌ Connection failed:", error);
  }
}

testConnection();
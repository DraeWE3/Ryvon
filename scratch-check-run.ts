import postgres from 'postgres';
import 'dotenv/config';

async function checkLatestRun() {
  const sql = postgres(process.env.POSTGRES_URL, { ssl: 'require' });
  const result = await sql`SELECT * FROM "WorkflowRun" ORDER BY "startedAt" DESC LIMIT 1`;
  console.log(JSON.stringify(result, null, 2));
  process.exit(0);
}

checkLatestRun().catch(console.error);

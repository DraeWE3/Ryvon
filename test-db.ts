import { neon } from '@neondatabase/serverless';

async function test() {
  const url = process.argv[2];
  console.log(`Testing connection to: ${url}`);
  try {
    const sql = neon(url);
    const start = Date.now();
    const result = await sql`SELECT 1 as connected`;
    console.log(`Success! Time: ${Date.now() - start}ms`, result);
  } catch (err) {
    console.error('Failed!', err);
  }
}

test();

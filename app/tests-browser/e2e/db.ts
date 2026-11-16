/**
 * Deleting test accounts afterwards. The tests sign up real people (e2e-<random>@example.com) on the
 * real development database; the backend has no delete-account endpoint yet, so the tests remove their
 * own rows directly. The connection string is read in-process from backend/.env and is never printed,
 * logged or committed (the house rule on secrets).
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { Client } from 'pg';

let cachedUrl: string | null = null;

function databaseUrl(): string {
  if (cachedUrl) return cachedUrl;
  // app/tests-browser/e2e -> app/tests-browser -> app -> the repository root -> backend/.env
  const envPath = path.resolve(__dirname, '../../../backend/.env');
  let raw = '';
  try {
    raw = readFileSync(envPath, 'utf8');
  } catch {
    throw new Error(`Cannot read ${envPath}: the tests need the local database to clean up after themselves.`);
  }
  for (const line of raw.split(/\r?\n/)) {
    const m = /^\s*DATABASE_URL\s*=\s*(.+?)\s*$/.exec(line);
    if (m) {
      cachedUrl = m[1].replace(/^["']|["']$/g, '');
      return cachedUrl;
    }
  }
  throw new Error(`backend/.env has no DATABASE_URL: the tests cannot clean up their test accounts.`);
}

/** One statement, with its own short-lived connection. Never prints the connection string. */
async function withDb<T>(statement: (client: Client) => Promise<T>): Promise<T> {
  const client = new Client({ connectionString: databaseUrl() });
  await client.connect();
  try {
    return await statement(client);
  } finally {
    await client.end();
  }
}

/**
 * Removes test accounts. Some rows hold a person without a cascade, so a hard delete is tried first
 * and a soft delete (the backend's own `deleted` status) is the fallback: either way the person is gone.
 */
async function deleteUsers(where: string, values: string[]): Promise<number> {
  return withDb(async (db) => {
    const hard = await db.query(`delete from users where ${where}`, values);
    let n = hard.rowCount ?? 0;
    if (n < values.length) {
      const soft = await db.query(`update users set status = 'deleted' where ${where}`, values);
      n = Math.max(n, soft.rowCount ?? 0);
    }
    return n;
  });
}

/** The e2e-<random>@example.com accounts of this run. */
export async function deleteE2EUser(email: string): Promise<void> {
  await deleteUsers('email = $1', [email]);
}

/** Anything an earlier run left behind (the tests share the e2e- prefix). */
export async function deleteStrayE2EUsers(): Promise<number> {
  return deleteUsers(`email like 'e2e-%@example.com'`, []);
}

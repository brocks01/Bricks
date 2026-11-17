// Plain Node check of the saved copy of server data: npx tsx src/core/cache.selftest.ts
import { cacheInvalidate, cachePeek, cachePut, cacheSubscribe, setCacheOwner } from './cache';

let failed = 0;
const check = (name: string, ok: boolean) => {
  if (!ok) failed++;
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`);
};

async function main() {
  await setCacheOwner('ann');
  const seen: string[][] = [];
  const stop = cacheSubscribe((p) => seen.push(p));
  check('nothing saved yet', cachePeek('/v1/home/summary') === undefined);
  cachePut('/v1/home/summary', { a: 1 });
  cachePut('/v1/calendar/occurrences?day=2026-11-17', [1, 2]);
  check('a saved copy is returned at once, fresh', cachePeek<{ a: number }>('/v1/home/summary')?.data.a === 1 && cachePeek('/v1/home/summary')?.stale === false);
  check('listeners hear about a put', seen.some((p) => p.includes('/v1/home/summary')));

  cacheInvalidate(['calendar']);
  check('a topic marks only the matching paths stale', cachePeek('/v1/calendar/occurrences?day=2026-11-17')?.stale === true && cachePeek('/v1/home/summary')?.stale === false);
  check('stale data is still shown (no blank)', (cachePeek<number[]>('/v1/calendar/occurrences?day=2026-11-17')?.data.length ?? 0) === 2);
  cacheInvalidate(['*']);
  check('"*" marks everything stale', cachePeek('/v1/home/summary')?.stale === true);
  cachePut('/v1/home/summary', { a: 2 });
  check('a new put is fresh again and replaces the old', cachePeek('/v1/home/summary')?.stale === false && cachePeek<{ a: number }>('/v1/home/summary')?.data.a === 2);

  await setCacheOwner('bob');
  check("another account never sees the first account's data", cachePeek('/v1/home/summary') === undefined);
  await setCacheOwner(null);
  check('signing out leaves nothing in memory', cachePeek('/v1/calendar/occurrences?day=2026-11-17') === undefined);
  stop();
  console.log(failed ? `${failed} FAILED` : 'all passed');
  process.exit(failed ? 1 : 0);
}
void main();

import { DatabaseSync } from 'node:sqlite'
import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import pg from 'pg'

const schema = [
  'CREATE TABLE IF NOT EXISTS weather_state (id TEXT PRIMARY KEY, state TEXT NOT NULL)',
  'CREATE TABLE IF NOT EXISTS village_defense (id TEXT PRIMARY KEY, state TEXT NOT NULL)',
  'CREATE TABLE IF NOT EXISTS village_roster (id TEXT PRIMARY KEY, state TEXT NOT NULL)',
  'CREATE TABLE IF NOT EXISTS weather_events (id TEXT PRIMARY KEY, start_at BIGINT NOT NULL, state TEXT NOT NULL)',
  'CREATE INDEX IF NOT EXISTS weather_events_start_idx ON weather_events(start_at)',
  'CREATE TABLE IF NOT EXISTS home_watch (address TEXT PRIMARY KEY, since_at BIGINT NOT NULL, until_at BIGINT NOT NULL)',
  'CREATE TABLE IF NOT EXISTS challenges (id TEXT PRIMARY KEY, message TEXT NOT NULL, expires BIGINT NOT NULL)',
  'CREATE TABLE IF NOT EXISTS sessions (id TEXT PRIMARY KEY, address TEXT NOT NULL, expires BIGINT NOT NULL)',
  'CREATE TABLE IF NOT EXISTS homes (address TEXT PRIMARY KEY, state TEXT NOT NULL, village TEXT NOT NULL)',
  'CREATE TABLE IF NOT EXISTS villages (id TEXT PRIMARY KEY, members INTEGER NOT NULL DEFAULT 0, supplies INTEGER NOT NULL DEFAULT 0, glowstones INTEGER NOT NULL DEFAULT 0)',
  'CREATE TABLE IF NOT EXISTS contributions (address TEXT PRIMARY KEY, supplies INTEGER NOT NULL DEFAULT 0, glowstones INTEGER NOT NULL DEFAULT 0)',
  'CREATE INDEX IF NOT EXISTS homes_village_idx ON homes(village)',
  'CREATE INDEX IF NOT EXISTS sessions_expires_idx ON sessions(expires)',
  'CREATE INDEX IF NOT EXISTS challenges_expires_idx ON challenges(expires)',
]

export async function openStore({ databaseUrl, filename = 'data/beta.sqlite' } = {}) {
  if (databaseUrl) {
    const pool = new pg.Pool({ connectionString: databaseUrl, max: 5, connectionTimeoutMillis: 5000, statement_timeout: 10000 })
    return {
      async transaction(fn) {
        const client = await pool.connect()
        try {
          await client.query('BEGIN')
          // One bounded beta world: serialize game mutations across API instances.
          await client.query('SELECT pg_advisory_xact_lock(73402519)')
          const result = await fn(async (sql, values=[]) => (await client.query(sql, values)).rows)
          await client.query('COMMIT')
          return result
        } catch (e) { await client.query('ROLLBACK'); throw e }
        finally { client.release() }
      },
      async init(){ await this.transaction(async q=>{for (const sql of schema) await q(sql)}) },
      close: () => pool.end(),
    }
  }
  if (filename !== ':memory:') mkdirSync(dirname(filename), { recursive: true })
  const db = new DatabaseSync(filename)
  db.exec('PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;')
  let queue = Promise.resolve()
  return {
    transaction(fn) {
      const next = queue.then(async () => {
        db.exec('BEGIN IMMEDIATE')
        try {
          const result = await fn(async(sql,values=[]) => {
            const parameters=[]
            const normalized=sql.replace(/\$(\d+)/g,(_,n)=>{parameters.push(values[Number(n)-1]);return '?'})
            return db.prepare(normalized).all(...parameters)
          })
          db.exec('COMMIT'); return result
        } catch(e) { db.exec('ROLLBACK'); throw e }
      })
      queue=next.catch(()=>{})
      return next
    },
    async init(){ for(const sql of schema) db.exec(sql) },
    async close(){ await queue; db.close() },
  }
}

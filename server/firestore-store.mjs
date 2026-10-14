import { Firestore } from '@google-cloud/firestore'
import { columns, validRow, validateQuery } from './repository.mjs'

export function openFirestoreStore({ projectId, namespace = 'beta', databaseId = '(default)' } = {}) {
  if (!projectId || !/^[a-z][a-z0-9-]{4,62}$/.test(projectId)) throw Error('Set an explicit FIRESTORE_PROJECT_ID')
  if (!/^[a-zA-Z0-9_-]{1,64}$/.test(namespace)) throw Error('Invalid FIRESTORE_NAMESPACE')
  const db = new Firestore({ projectId, databaseId }) // Application Default Credentials; never browser keys.
  const root = db.collection('souli').doc(namespace)
  const collection = table => { columns(table); return root.collection(table) }
  return {
    async init() { /* Creating resources, indexes and TTL policies belongs to deployment. */ },
    async ready() { await root.collection('weather_state').doc('eth').get() },
    run(fn) {
      return db.runTransaction(async tx => {
        const pending = new Map(), reads = new Map()
        const key = (table, id) => `${table}/${id}`
        const copy = value => value == null ? null : structuredClone(value)
        const data = (table, snapshot) => snapshot.exists ? Object.fromEntries(columns(table).map(c => [c, snapshot.get(c)])) : null
        const result = await fn({
          async get(table, id) {
            const path = key(table, id)
            if (pending.has(path)) return copy(pending.get(path).row)
            if (!reads.has(path)) reads.set(path, data(table, await tx.get(collection(table).doc(id))))
            return copy(reads.get(path))
          },
          async put(table, row) { validRow(table, row); pending.set(key(table, row[columns(table)[0]]), { table, id: row[columns(table)[0]], row: copy(row) }) },
          async remove(table, id) { collection(table); pending.set(key(table, id), { table, id, row: null }) },
          async find(table, field, op, value, limit = 32) {
            validateQuery(table, field, op, limit)
            const snapshot = await tx.get(collection(table).where(field, op === '=' ? '==' : op, value).limit(limit))
            const rows = new Map(snapshot.docs.map(doc => [doc.id, data(table, doc)]))
            for (const change of pending.values()) if (change.table === table) {
              if (change.row && (op === '=' ? change.row[field] === value : change.row[field] < value)) rows.set(change.id, change.row)
              else rows.delete(change.id)
            }
            return [...rows.values()].slice(0, limit).map(copy)
          },
          async events(from, until) {
            if (until <= from) return []
            const snapshot = await tx.get(collection('weather_events').where('start_at', '>', from).where('start_at', '<=', until).orderBy('start_at').limit(4))
            return snapshot.docs.map(doc => data('weather_events', doc))
          },
        })
        // Firestore requires reads before writes. Flush staged changes only after
        // the callback finishes; retries repeat only deterministic database work.
        for (const { table, id, row } of pending.values()) {
          const ref = collection(table).doc(id)
          if (row) tx.set(ref, { ...row, ...(['sessions', 'challenges'].includes(table) ? { expiresAt: new Date(Number(row.expires)) } : {}) })
          else tx.delete(ref)
        }
        return result
      })
    },
    close: () => db.terminate(),
  }
}

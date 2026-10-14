// A small typed transaction API shared by SQL and Firestore. Table and column
// names come only from this registry, never from request input.
export const TABLES = Object.freeze({
  weather_state: ['id', 'state'], village_defense: ['id', 'state'], village_roster: ['id', 'state'],
  weather_events: ['id', 'start_at', 'state'],
  home_watch: ['address', 'since_at', 'until_at'], challenges: ['id', 'message', 'expires'],
  sessions: ['id', 'address', 'expires'], homes: ['address', 'state', 'village'],
  villages: ['id', 'members', 'supplies', 'glowstones'], contributions: ['address', 'supplies', 'glowstones'],
})
export function columns(table) {
  if (!Object.hasOwn(TABLES, table)) throw Error('Unknown collection')
  return TABLES[table]
}
export function validRow(table, row) {
  const fields = columns(table)
  if (!fields.every(key => row[key] !== undefined) || Object.keys(row).some(key => !fields.includes(key))) throw Error('Invalid stored row')
  if (typeof row[fields[0]] !== 'string' || !/^[a-zA-Z0-9_-]{1,128}$/.test(row[fields[0]])) throw Error('Invalid record key')
  return row
}
export function repository(store) {
  return {
    run(fn) {
      if (store.run) return store.run(fn)
      return store.transaction(q => fn({
        async get(table, id) { return (await q(`SELECT * FROM ${tableName(table)} WHERE ${columns(table)[0]}=$1`, [id]))[0] || null },
        async put(table, row) {
          validRow(table, row)
          const fields = columns(table)
          await q(`INSERT INTO ${table} (${fields.join(',')}) VALUES (${fields.map((_, i) => `$${i + 1}`).join(',')}) ON CONFLICT(${fields[0]}) DO UPDATE SET ${fields.slice(1).map((f, i) => `${f}=$${i + 2}`).join(',')}`, fields.map(f => row[f]))
        },
        async remove(table, id) { await q(`DELETE FROM ${tableName(table)} WHERE ${columns(table)[0]}=$1`, [id]) },
        async find(table, field, op, value, limit = 32) {
          validateQuery(table, field, op, limit)
          return q(`SELECT * FROM ${table} WHERE ${field}${op}$1 LIMIT ${limit}`, [value])
        },
        async events(from, until) { return q('SELECT * FROM weather_events WHERE start_at>$1 AND start_at<=$2 ORDER BY start_at LIMIT 4', [from, until]) },
      }))
    },
    async ready() { if (store.ready) return store.ready(); await store.transaction(q => q('SELECT 1 AS ready')) },
  }
}
function tableName(table) { columns(table); return table }
export function validateQuery(table, field, op, limit) {
  if (!columns(table).includes(field) || !['=', '<'].includes(op) || !Number.isInteger(limit) || limit < 1 || limit > 32) throw Error('Invalid bounded query')
}

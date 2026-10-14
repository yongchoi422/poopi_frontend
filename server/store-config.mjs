export function storeConfig(env = process.env) {
  const backend = env.STORE_BACKEND || (env.DATABASE_URL ? 'postgres' : 'sqlite')
  if (!['sqlite', 'postgres', 'firestore'].includes(backend)) throw Error('Unknown STORE_BACKEND')
  if (env.NODE_ENV === 'production' && backend === 'sqlite') throw Error('Production requires Firestore or persistent PostgreSQL; local container files are not durable.')
  if (backend === 'postgres' && !env.DATABASE_URL) throw Error('PostgreSQL requires DATABASE_URL')
  if (backend === 'firestore' && !env.FIRESTORE_PROJECT_ID) throw Error('Firestore requires FIRESTORE_PROJECT_ID')
  if (env.NODE_ENV === 'production' && env.FIRESTORE_EMULATOR_HOST) throw Error('Production cannot use the Firestore emulator')
  return { backend, databaseUrl: env.DATABASE_URL, projectId: env.FIRESTORE_PROJECT_ID, namespace: env.FIRESTORE_NAMESPACE || 'beta', databaseId: env.FIRESTORE_DATABASE_ID || '(default)' }
}

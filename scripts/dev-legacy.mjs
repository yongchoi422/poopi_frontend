// The earlier collection app keeps its original dependency lock separately.
import { createRequire } from 'node:module'
import { spawn } from 'node:child_process'
import { dirname, join } from 'node:path'
const requireLegacy = createRequire(new URL('../legacy/package.json', import.meta.url))
const requireCurrent = createRequire(new URL('../package.json', import.meta.url))
let vite
try { requireLegacy.resolve('web3'); vite = join(dirname(requireCurrent.resolve('vite/package.json')), 'bin/vite.js') }
catch { console.error('Install the archived dependencies first: npm ci --prefix legacy'); process.exit(1) }
const child = spawn(process.execPath, [vite, '--config', 'vite.config.js', ...process.argv.slice(2)], {
  stdio: 'inherit', windowsHide: true, env: { ...process.env, SOULI_LEGACY: '1' },
})
child.on('exit', code => process.exit(code ?? 1))

// Connect EVM can wrap a wallet RPC error (outer code 53, inner rpcCode).
// Never infer a rejected payment from message text: a timeout may hide a sent tx.
export function normalizeWalletError(error, { connecting = false } = {}) {
  const rpcCode = Number(error?.rpcCode), outer = Number(error?.code)
  let code = Number.isInteger(rpcCode) && error?.rpcCode != null ? rpcCode : outer
  if (connecting && !Number.isInteger(code) && error?.message === 'User closed modal') code = 4001
  const result = new Error(error?.shortMessage || error?.message || 'The wallet request could not finish.', { cause: error })
  if (Number.isInteger(code)) result.code = code
  if (error?.data !== undefined || error?.rpcData !== undefined) result.data = error.data ?? error.rpcData
  return result
}

export function walletRequestMessage(error) {
  const code = Number(error?.code)
  if (code === 4001) return 'Cancelled in MetaMask. No new transaction was approved.'
  if (code === -32002) return 'A request is already open. Check MetaMask before trying again.'
  if ([4900, 4901].includes(code)) return 'Wallet disconnected. Reconnect, then check any pending transaction before trying again.'
  if (/timed?\s*out|timeout|transport|network request failed/i.test(error?.message || '')) return 'MetaMask did not respond in time. Open the app and check its Activity before retrying. If connection still fails, refresh this page.'
  return error?.shortMessage || error?.message || 'Could not reach MetaMask. Check the app and try again.'
}

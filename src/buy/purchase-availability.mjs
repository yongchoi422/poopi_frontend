// A public stock read guides the picker; quote/send still verify the chain independently.
export function purchaseAvailability({ snapshot, required = false, wallet, walletCap, now = Date.now() }) {
  const cap = BigInt(walletCap)
  const fresh = snapshot && Number.isFinite(snapshot.checkedAt) && now >= snapshot.checkedAt && now - snapshot.checkedAt <= 60000
  if (required && !fresh) return { limit: 0n, info: null, blocked: true, message: 'Checking stock…' }
  const available = fresh ? BigInt(snapshot.available) : wallet?.available ?? cap
  const remaining = wallet?.walletRemaining ?? cap
  const stock = wallet && wallet.available < available ? wallet.available : available
  const limit = stock < remaining ? stock : remaining
  const open = (!fresh || snapshot.status === 'Open') && (!wallet || wallet.open)
  const message = !open ? (snapshot?.paused || wallet?.paused ? 'Sale paused' : 'No stock available') : limit === 0n ? 'No stock available' : ''
  return { limit, info: { available: stock, walletRemaining: remaining }, blocked: !open || limit === 0n, message }
}

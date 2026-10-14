// Starting levels describe one new inscription seed, not total wallet balance.
export function wholeAmount(value){
  const text=String(value).trim()
  return /^[1-9]\d{0,14}$/.test(text)?BigInt(text):null
}
export function guideForAmount(levels,value){
  const amount=wholeAmount(value)
  return amount===null?null:levels.findLast(level=>amount>=BigInt(level.minimum))||null
}
export function amountProblem(value,info){
  const amount=wholeAmount(value)
  if(amount===null)return 'Enter a whole number, starting at 1.'
  if(!info)return ''
  if(amount>info.walletRemaining)return `Your remaining limit is ${info.walletRemaining.toLocaleString('en-US')} SOULI.`
  if(amount>info.available)return `Only ${info.available.toLocaleString('en-US')} SOULI is available.`
  return ''
}
export function ethAmount(wei){
  const units=BigInt(wei),scale=1000000000000000000n
  const decimals=(units%scale).toString().padStart(18,'0').replace(/0+$/,'')
  return `${units/scale}${decimals?'.'+decimals:''}`
}
// Approximate fees round UP to eight decimals; sale prices stay exact.
export const estimatedEth=wei=>ethAmount(((BigInt(wei)+9999999999n)/10000000000n)*10000000000n)

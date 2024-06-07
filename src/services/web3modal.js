import { createWeb3Modal, defaultWagmiConfig } from '@web3modal/wagmi/vue'
import { base, baseSepolia } from '@wagmi/core/chains'

//https://cloud.walletconnect.com/

const projectId = '8fcf094483e98262c307c7879e58b244' // <-- put your walletconnect projectId here

const chains = [base]
// const chains = [baseSepolia]
const wagmiConfig = defaultWagmiConfig({
  chains,
  projectId,
  appName: 'App',
})

export default createWeb3Modal({ wagmiConfig, projectId, chains })
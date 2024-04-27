import { createWeb3Modal, defaultWagmiConfig } from '@web3modal/wagmi/vue'
import { base, baseSepolia } from '@wagmi/core/chains'

//https://cloud.walletconnect.com/

const projectId = '75c770563883e59a5702bcd960096c01' // <-- put your walletconnect projectId here

// const chains = [base]
const chains = [baseSepolia]
const wagmiConfig = defaultWagmiConfig({
  chains,
  projectId,
  appName: 'App',
})

export default createWeb3Modal({ wagmiConfig, projectId, chains })
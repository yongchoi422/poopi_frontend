import { createWeb3Modal, defaultWagmiConfig } from '@web3modal/wagmi/vue'
import { base, baseSepolia } from '@wagmi/core/chains'

//https://cloud.walletconnect.com/

const projectId = '8fcf094483e98262c307c7879e58b244' // <-- put your walletconnect projectId here

const chains = [base]
// const chains = [baseSepolia]
const wagmiConfig = defaultWagmiConfig({
  chains,
  projectId,
  metadata: {
    name: ['souli.net', 'www.souli.net'].includes(window.location.hostname) ? 'SOULI' : 'SOULI · Development preview',
    description: 'SOULI on Base — on-chain SVG souls',
    url: window.location.origin,
    icons: [new URL('/images/fungi/logo.png', window.location.origin).href],
  },
})

export default createWeb3Modal({ wagmiConfig, projectId, chains })

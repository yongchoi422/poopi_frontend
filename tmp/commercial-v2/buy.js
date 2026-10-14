import {createApp} from 'vue'
import App from './PilotBuy.vue'
import '../../src/styles/souli-palette.css'
import '../../src/buy/buy.css'
if(!import.meta.env.DEV||!['127.0.0.1','localhost'].includes(location.hostname))throw Error('Local V2 check only')
createApp(App).mount('#app')

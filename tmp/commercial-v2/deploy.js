import {createApp} from 'vue'
import App from './CommercialDeploy.vue'
import '../../src/styles/souli-typography.css'
if(!import.meta.env.DEV||!['127.0.0.1','localhost'].includes(location.hostname))throw Error('Local deployment review only')
createApp(App).mount('#app')

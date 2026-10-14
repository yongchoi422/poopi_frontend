import {createApp} from 'vue'
import App from './PilotApp.vue'
if(!import.meta.env.DEV||!['127.0.0.1','localhost'].includes(location.hostname))throw Error('Local review only')
createApp(App).mount('#app')

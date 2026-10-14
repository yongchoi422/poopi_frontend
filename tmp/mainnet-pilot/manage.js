import {createApp} from 'vue'
import AdminApp from '../../src/sale-admin/AdminApp.vue'
import '../../src/styles/souli-palette.css'
import '../../src/sale-admin/admin.css'
import '../../src/styles/souli-typography.css'
import manifest from './verified-admin.json'
if(!import.meta.env.DEV||!['127.0.0.1','localhost'].includes(location.hostname))throw Error('Local pilot only')
createApp(AdminApp,{developmentConfig:manifest}).mount('#app')

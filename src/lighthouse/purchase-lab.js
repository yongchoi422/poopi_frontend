import { createApp } from 'vue'
import PurchaseLab from './PurchaseLab.vue'
import '../styles/souli-palette.css'
import '../styles/souli-brand.css'
if(!import.meta.env.DEV)throw Error('Purchase lab is development only')
createApp(PurchaseLab).mount('#app')

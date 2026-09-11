import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
export default defineConfig({
 plugins:[react()],
 server:{host:'0.0.0.0',port:5173,strictPort:true,watch:{ignored:['**/public/images/menu-generated/**','**/artifacts/**']},proxy:{'/api':{target:'http://127.0.0.1:8787'}}},
 build:{rollupOptions:{output:{manualChunks:{'react-vendor':['react','react-dom','react-router-dom'],'motion':['framer-motion'],'supabase':['@supabase/supabase-js']}}}},
})

import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
export default defineConfig({plugins:[react()],server:{host:'0.0.0.0',allowedHosts:['terminal.local'],proxy:{'/api':{target:'http://127.0.0.1:'+(process.env.BREW_API_PORT||8787),changeOrigin:false}}},build:{outDir:'dist/client'}})

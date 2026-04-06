import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import fs from 'fs';
import path from 'path';

const certPath = path.resolve(__dirname, "certs/localhost+3.pem")
const keyPath = path.resolve(__dirname, "certs/localhost+3-key.pem")

const hasHttpsCerts = fs.existsSync(certPath) && fs.existsSync(keyPath)

const httpsConfig = hasHttpsCerts
  ? {
      key: fs.readFileSync(keyPath),
      cert: fs.readFileSync(certPath),
    }
  : undefined;

export default defineConfig({
  plugins: [
    react(), 
    tailwindcss(),
  ],
  server: {
    host: true,
    port: 5173,
    https: httpsConfig,
  }
})

import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const here = path.dirname(fileURLToPath(import.meta.url))
const repo = path.resolve(here, '..', '..')
const fake = path.join(here, 'fakeSupabase.js')

export default defineConfig({
    root: here,
    envDir: here,
    publicDir: path.join(repo, 'public'),
    resolve: { alias: { '@src': path.join(repo, 'src') } },
    server: { fs: { allow: [repo] }, strictPort: false },
    logLevel: 'error',
    plugins: [
        react(),
        {
            name: 'locappoint-fake-supabase',
            enforce: 'pre',
            resolveId(source) {
                if (/config[\\/]supabase(Anon)?(\.jsx)?$/.test(source)) return fake
                return null
            },
        },
    ],
})

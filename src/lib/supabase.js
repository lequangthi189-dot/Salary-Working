import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !anonKey) {
  // Surfaced in the console to make missing env config obvious during setup.
  console.error(
    'Missing Supabase env vars. Copy .env.example to .env.local and fill in your project values.'
  )
}

export const supabase = createClient(url, anonKey)

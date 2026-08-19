// Initialize the Supabase client using environment variables.
// This client is shared across the app for auth and database requests.
import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL?.trim()
const key = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim()

if (!url || !key || !/^https:\/\/.+\.supabase\.co$/.test(url)) {
  throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env')
}

export const supabase = createClient(url, key)

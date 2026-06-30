import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL || ''
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

export const hasSupabaseConfig =
  url.startsWith('https://') &&
  anonKey.length > 20 &&
  !url.includes('seu-projeto') &&
  !anonKey.includes('sua-chave')

export const supabase = hasSupabaseConfig ? createClient(url, anonKey) : null
export const dataMode = hasSupabaseConfig ? 'configured' : 'local'

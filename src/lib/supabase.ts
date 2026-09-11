import { createClient } from '@supabase/supabase-js'

const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL ??
  import.meta.env.NEXT_PUBLIC_SUPABASE_URL ??
  ''

const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ??
  import.meta.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  ''

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase environment variables are missing. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in a .env file.')
}

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)

export const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : ({
        from: () => ({
          select: () => ({
            order: async () => ({ data: [], error: null }),
            eq: async () => ({ data: [], error: null }),
            single: async () => ({ data: null, error: null }),
          }),
          insert: async () => ({ data: [], error: null }),
          update: () => ({
            eq: async () => ({ data: [], error: null }),
          }),
          delete: () => ({
            eq: async () => ({ data: [], error: null }),
          }),
          upsert: async () => ({ data: [], error: null }),
        }),
      } as any)
import { createClient } from '@supabase/supabase-js'

const runtimeEnv = (() => {
  if (typeof import.meta !== 'undefined' && import.meta && (import.meta as any).env) return (import.meta as any).env as Record<string, string | undefined>
  const nodeProcess = (globalThis as any).process
  if (nodeProcess && nodeProcess.env) return nodeProcess.env as Record<string, string | undefined>
  return {} as Record<string, string | undefined>
})()

const supabaseUrl =
  runtimeEnv.VITE_SUPABASE_URL ??
  runtimeEnv.NEXT_PUBLIC_SUPABASE_URL ??
  ''

const supabaseAnonKey =
  runtimeEnv.VITE_SUPABASE_ANON_KEY ??
  runtimeEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  ''

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase environment variables are missing. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in a .env file.')
}

const emptyQuery = () => ({
  select: async () => ({ data: [], error: null }),
  order: async () => ({ data: [], error: null }),
  eq: async () => ({ data: [], error: null }),
  limit: async () => ({ data: [], error: null }),
  single: async () => ({ data: null, error: null }),
  insert: async () => ({ data: [], error: null }),
  update: () => ({ eq: async () => ({ data: [], error: null }) }),
  delete: () => ({ eq: async () => ({ data: [], error: null }) }),
  upsert: async () => ({ data: [], error: null }),
})

const emptyRpc = async () => ({ data: null, error: null })

const emptyChannel = () => ({
  on: () => ({ subscribe: (callback?: (status: string) => void) => { callback?.('SUBSCRIBED'); return 'SUBSCRIBED' } }),
  subscribe: (callback?: (status: string) => void) => { callback?.('SUBSCRIBED'); return 'SUBSCRIBED' },
})

const emptyAuth = {
  getSession: async () => ({ data: { session: null }, error: null }),
  onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => undefined } }, error: null }),
  signOut: async () => ({ error: null }),
  resetPasswordForEmail: async () => ({ error: null }),
}

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)

export const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : ({
        from: () => emptyQuery(),
        rpc: emptyRpc,
        channel: emptyChannel,
        removeChannel: () => undefined,
        auth: emptyAuth,
      } as any)
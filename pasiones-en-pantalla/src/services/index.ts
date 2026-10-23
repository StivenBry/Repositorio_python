import { supabase } from '../lib/supabase'
import type { Backend } from './backend'
import { demoBackend } from './demoBackend'
import { createSupabaseBackend } from './supabaseBackend'

/** Supabase si hay variables de entorno; de lo contrario, modo demo local. */
export const backend: Backend = supabase ? createSupabaseBackend(supabase) : demoBackend
export const isDemo = backend.mode === 'demo'

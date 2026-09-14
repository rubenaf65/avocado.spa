import { createClient } from '@supabase/supabase-js';

const getSupabaseCredentials = () => {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    'https://rxpqidiyjmlltpfmukru.supabase.co';
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ4cHFpZGl5am1sbHRwZm11a3J1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkyOTg2MTMsImV4cCI6MjEwNDg3NDYxM30.XbfIWepWMiYyCAclPgxpRaQIMeNkl14qTQpfGvcyJxk';

  // Asegura que nunca pase una cadena vacía
  const validUrl = url.startsWith('http')
    ? url
    : 'https://rxpqidiyjmlltpfmukru.supabase.co';

  return { validUrl, key };
};

const { validUrl, key } = getSupabaseCredentials();

export const supabase = createClient(validUrl, key);

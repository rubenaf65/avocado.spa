import { createClient } from '@supabase/supabase-js';

const getCredentials = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const validUrl = (url && url.startsWith('http')) 
    ? url 
    : 'https://rxpqidiyjmlltpfmukru.supabase.co';

  const validKey = key || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ4cHFpZGl5am1sbHRwZm11a3J1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkyOTg2MTMsImV4cCI6MjEwNDg3NDYxM30.XbfIWepWMiYyCAclPgxpRaQIMeNkl14qTQpfGvcyJxk';

  return { validUrl, validKey };
};

const { validUrl, validKey } = getCredentials();

export const supabase = createClient(validUrl, validKey);

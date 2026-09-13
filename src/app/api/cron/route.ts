export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabase';

export async function GET() {
  return NextResponse.json({ ok: true });
}

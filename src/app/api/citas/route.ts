export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabase';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Error al procesar la cita' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('citas')
      .select('*')
      .neq('estado', 'cancelada');

    if (error) throw error;
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { fecha, hora_inicio, hora_fin } = body;

    // Solo enviamos las columnas base que existen sí o sí en tu esquema de Supabase
    const payloadMinimal: any = {
      fecha,
      hora_inicio,
      hora_fin,
      estado: 'confirmada'
    };

    const { data, error } = await supabase
      .from('citas')
      .insert([payloadMinimal])
      .select();

    if (error) throw error;

    return NextResponse.json(data[0] || { success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
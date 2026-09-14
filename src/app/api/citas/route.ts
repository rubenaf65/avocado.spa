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
    const {
      cliente_nombre,
      cliente_telefono,
      manicurista_nombre,
      servicio_nombre,
      fecha,
      hora_inicio,
      hora_fin,
      duracion_minutos
    } = body;

    const { data, error } = await supabase
      .from('citas')
      .insert([
        {
          cliente_nombre,
          cliente_telefono,
          manicurista_nombre,
          servicio_nombre,
          fecha,
          hora_inicio,
          hora_fin,
          duracion_minutos: duracion_minutos || 120,
          estado: 'confirmada'
        }
      ])
      .select();

    if (error) throw error;
    return NextResponse.json(data[0] || { success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
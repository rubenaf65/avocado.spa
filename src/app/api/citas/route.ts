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
    const { fecha, hora_inicio, hora_fin, manicurista, cliente, servicio } = body;

    // 1. Obtener citas activas de esa fecha y manicurista
    const { data: citasExistentes, error: checkError } = await supabase
      .from('citas')
      .select('*')
      .eq('fecha', fecha)
      .eq('manicurista', manicurista)
      .neq('estado', 'cancelada');

    if (checkError) throw checkError;

    // 2. Validar que no haya choque de horarios
    const haySolapamiento = citasExistentes?.some(cita => {
      return hora_inicio < cita.hora_fin && hora_fin > cita.hora_inicio;
    });

    if (haySolapamiento) {
      return NextResponse.json(
        { error: 'La manicurista ya tiene una cita reservada en ese horario.' },
        { status: 400 }
      );
    }

    // 3. Insertar nueva cita
    const payload = {
      fecha,
      hora_inicio,
      hora_fin,
      manicurista,
      cliente,
      servicio,
      estado: 'confirmada'
    };

    const { data, error } = await supabase
      .from('citas')
      .insert([payload])
      .select();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase'; // Asegura la ruta a src/lib/supabase[cite: 4]

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

    // Inserción directa en la tabla citas
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
          duracion_minutos,
          estado: 'confirmada'
        }
      ])
      .select();

    if (error) {
      console.error('Error insertando en Supabase:', error);
      return NextResponse.json({ success: false, message: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    console.error('Error interno del servidor:', err);
    return NextResponse.json({ success: false, message: 'Error interno en el servidor' }, { status: 500 });
  }
}
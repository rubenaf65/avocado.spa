import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { especialista_id, cliente_nombre, cliente_telefono, servicio_id, fecha, hora_inicio, duracion_minutos } = body;

    // 1. Calcular hora_fin
    const [h, m] = hora_inicio.split(':');
    const start = new Date();
    start.setHours(parseInt(h), parseInt(m), 0);
    const end = new Date(start.getTime() + duracion_minutos * 60000);
    const hora_fin = `${String(end.getHours()).padStart(2, '0')}:${String(end.getMinutes()).padStart(2, '0')}:00`;

    // 2. Validar disponibilidad llamando a la función SQL de Supabase
    const { data: disponible, error: errorCheck } = await supabase.rpc('verificar_disponibilidad', {
      p_especialista_id: especialista_id,
      p_fecha: fecha,
      p_hora_inicio: hora_inicio,
      p_hora_fin: hora_fin
    });

    if (errorCheck) throw errorCheck;

    if (!disponible) {
      return NextResponse.json(
        { error: '¡Horario no disponible! La manicurista ya tiene una cita reservada a esta hora.' },
        { status: 409 }
      );
    }

    // 3. Registrar o buscar cliente
    let { data: cliente } = await supabase
      .from('clientes')
      .select('id')
      .eq('telefono', cliente_telefono)
      .single();

    if (!cliente) {
      const { data: newCliente, error: errCli } = await supabase
        .from('clientes')
        .insert({ nombre: cliente_nombre, telefono: cliente_telefono })
        .select()
        .single();

      if (errCli) throw errCli;
      cliente = newCliente;
    }

    // 4. Crear la Cita
    const { data: nuevaCita, error: errCita } = await supabase
      .from('citas')
      .insert({
        especialista_id,
        cliente_id: cliente.id,
        servicio_id,
        fecha,
        hora_inicio,
        hora_fin,
        estado: 'confirmada'
      })
      .select();

    if (errCita) throw errCita;

    return NextResponse.json({ message: 'Cita agendada exitosamente', cita: nuevaCita });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
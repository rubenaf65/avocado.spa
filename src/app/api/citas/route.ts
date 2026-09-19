import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
// app/api/citas/route.ts
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { enviarMensajeWhatsApp } from '@/lib/whatsapp';

const TELEFONO_ADMIN = '04148957830';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { cliente_nombre, cliente_telefono, manicurista_nombre, servicio_nombre, fecha, hora_inicio, hora_fin, duracion_minutos } = body;

    // 1. Guardar cita en Supabase
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
          estado: 'confirmada',
          recordatorio_enviado: false
        }
      ])
      .select()
      .single();

    if (error) {
      return NextResponse.json({ success: false, message: error.message }, { status: 400 });
    }

    // 2. Mensaje para el Cliente
    const msgCliente = `✨ *¡Hola, ${cliente_nombre}!* Tu cita en *Avocado Spa* ha sido confirmada con éxito. 🥑💅\n\n` +
      `📅 *Fecha:* ${fecha}\n` +
      `⏰ *Hora:* ${hora_inicio}\n` +
      `💅 *Especialista:* ${manicurista_nombre}\n` +
      `✨ *Servicio:* ${servicio_nombre}\n\n` +
      `Te esperamos. Si necesitas modificar tu cita, avísanos con anticipación.`;

    // 3. Mensaje para el Admin (04148957830)
    const msgAdmin = `🚨 *NUEVA CITA REGISTRADA*\n\n` +
      `👤 *Cliente:* ${cliente_nombre} (${cliente_telefono})\n` +
      `📅 *Fecha:* ${fecha} a las ${hora_inicio}\n` +
      `💅 *Especialista:* ${manicurista_nombre}\n` +
      `✨ *Servicio:* ${servicio_nombre}`;

    // 4. Enviar WhatsApps en segundo plano
    await Promise.all([
      enviarMensajeWhatsApp(cliente_telefono, msgCliente),
      enviarMensajeWhatsApp(TELEFONO_ADMIN, msgAdmin)
    ]);

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
// GET: Obtener todas las citas
export async function GET() {
  try {
    const { data, error } = await supabase
      .from('citas')
      .select('*')
      .order('fecha', { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST: Crear una nueva cita
export async function POST(request: Request) {
  try {
    const body = await request.json();

    const { data, error } = await supabase
      .from('citas')
      .insert([body])
      .select();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data[0], { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// PUT: Modificar/actualizar una cita existente
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json({ error: 'Se requiere el ID de la cita' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('citas')
      .update(updateData)
      .eq('id', id)
      .select();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data[0], { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// DELETE: Eliminar una cita por su ID
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Se requiere el ID de la cita' }, { status: 400 });
    }

    const { error } = await supabase
      .from('citas')
      .delete()
      .eq('id', id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ message: 'Cita eliminada correctamente' }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
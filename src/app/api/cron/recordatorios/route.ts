// app/api/cron/recordatorios/route.ts
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { enviarMensajeWhatsApp } from '@/lib/whatsapp';

const TELEFONO_ADMIN = '04148957830';

export async function GET() {
  try {
    const ahora = new Date();
    // Calcular la hora dentro de 60 minutos
    const dentroDeUnaHora = new Date(ahora.getTime() + 60 * 60 * 1000);

    const fechaHoy = ahora.toISOString().split('T')[0];
    const horaObjetivo = dentroDeUnaHora.toTimeString().substring(0, 5); // Ejemplo: "10:00"

    // Buscar citas de hoy en ese rango que no hayan recibido recordatorio
    const { data: citas, error } = await supabase
      .from('citas')
      .select('*')
      .eq('fecha', fechaHoy)
      .gte('hora_inicio', horaObjetivo)
      .lte('hora_inicio', horaObjetivo)
      .eq('estado', 'confirmada')
      .eq('recordatorio_enviado', false);

    if (error) throw error;

    for (const cita of citas || []) {
      // Recordatorio al Cliente
      const msgRecordatorioCliente = `⏰ *Recordatorio de Cita - Avocado Spa* 🥑\n\n` +
        `Hola ${cita.cliente_nombre}, te recordamos que tienes una cita agendada en *1 hora* (${cita.hora_inicio}).\n\n` +
        `💅 *Servicio:* ${cita.servicio_nombre}\n` +
        `👩‍🎨 *Atendido por:* ${cita.manicurista_nombre}\n\n` +
        `¡Te esperamos pronto!`;

      // Recordatorio al Admin
      const msgRecordatorioAdmin = `⏰ *RECORDATORIO (En 1 hora)*\n\n` +
        `Cita con *${cita.cliente_nombre}* a las ${cita.hora_inicio}.\n` +
        `💅 Specialist: ${cita.manicurista_nombre}\n` +
        `✨ Servicio: ${cita.servicio_nombre}`;

      await enviarMensajeWhatsApp(cita.cliente_telefono, msgRecordatorioCliente);
      await enviarMensajeWhatsApp(TELEFONO_ADMIN, msgRecordatorioAdmin);

      // Marcar recordatorio como enviado para no repetirlo
      await supabase
        .from('citas')
        .update({ recordatorio_enviado: true })
        .eq('id', cita.id);
    }

    return NextResponse.json({ success: true, procesadas: citas?.length || 0 });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
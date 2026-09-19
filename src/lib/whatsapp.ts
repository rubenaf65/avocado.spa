// lib/whatsapp.ts

export async function enviarMensajeWhatsApp(telefono: string, mensaje: string) {
  // Formatear el número a formato internacional (Venezuela +58)
  let numLimpio = telefono.replace(/\D/g, '');
  if (numLimpio.startsWith('0')) {
    numLimpio = '58' + numLimpio.substring(1);
  } else if (!numLimpio.startsWith('58')) {
    numLimpio = '58' + numLimpio;
  }

  try {
    // Ejemplo de llamado API (Sustituye la URL y credenciales por las de tu proveedor: Twilio, UltraMsg, etc.)
    const res = await fetch(process.env.WHATSAPP_API_URL || '', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.WHATSAPP_API_TOKEN}`
      },
      body: JSON.stringify({
        to: numLimpio,
        message: mensaje
      })
    });

    return res.ok;
  } catch (error) {
    console.error('Error enviando WhatsApp:', error);
    return false;
  }
}

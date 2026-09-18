import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { password } = await request.json();
    
    // Obtiene la clave configurada en Vercel/.env.local, o usa 'admin123' por defecto
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';

    if (password === adminPassword) {
      return NextResponse.json({ success: true, message: 'Acceso concedido' }, { status: 200 });
    } else {
      return NextResponse.json({ success: false, message: 'Contraseña incorrecta' }, { status: 401 });
    }
  } catch (error) {
    return NextResponse.json({ success: false, message: 'Error interno del servidor' }, { status: 500 });
  }
}
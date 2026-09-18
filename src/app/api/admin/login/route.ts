import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { password } = await request.json();
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';

    if (password === adminPassword) {
      return NextResponse.json({ success: true, message: 'Acceso concedido' }, { status: 200 });
    } else {
      return NextResponse.json({ success: false, message: 'Contraseña incorrecta' }, { status: 401 });
    }
  } catch {
    return NextResponse.json({ success: false, message: 'Error en el servidor' }, { status: 500 });
  }
}
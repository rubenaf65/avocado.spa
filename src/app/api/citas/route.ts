import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

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
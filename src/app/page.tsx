'use client';
import React, { useEffect, useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import esLocale from '@fullcalendar/core/locales/es';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { supabase } from '../lib/supabase';

export default function Home() {
  const [events, setEvents] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    cliente_nombre: '',
    cliente_telefono: '',
    especialista_id: '1',
    servicio_id: '1',
    fecha: new Date().toISOString().split('T')[0],
    hora_inicio: '10:00',
    duracion_minutos: 60
  });

  const fetchCitas = async () => {
    const { data, error } = await supabase
      .from('citas')
      .select(`
        id, fecha, hora_inicio, hora_fin, estado,
        clientes (nombre, telefono),
        servicios (nombre)
      `)
      .neq('estado', 'cancelada');

    if (!error && data) {
      const formattedEvents = data.map((item: any) => ({
        id: item.id,
        title: `Cita con ${item.clientes?.nombre || 'Cliente'} (${item.servicios?.nombre})`,
        start: `${item.fecha}T${item.hora_inicio}`,
        end: `${item.fecha}T${item.hora_fin}`,
        backgroundColor: '#d9f99d',
        textColor: '#365314',
        borderColor: '#84cc16'
      }));
      setEvents(formattedEvents);
    }
  };

  useEffect(() => {
    fetchCitas();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/citas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });

    const data = await res.json();
    if (res.ok) {
      alert('¡Cita agendada exitosamente!');
      setModalOpen(false);
      fetchCitas();
    } else {
      alert(data.error);
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Control de Citas en Línea</h1>
          <button
            onClick={() => setModalOpen(true)}
            className="bg-lime-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-lime-700 transition"
          >
            + Nueva Cita
          </button>
        </div>

        <FullCalendar
          locale={esLocale}
          plugins={[timeGridPlugin, interactionPlugin]}
          initialView="timeGridWeek"
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: 'timeGridWeek,timeGridDay'
          }}
          slotMinTime="07:00:00"
          slotMaxTime="18:00:00"
          allDaySlot={false}
          events={events}
        />
      </div>

      {/* Modal para agendar */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white p-6 rounded-xl max-w-md w-full">
            <h2 className="text-xl font-bold mb-4">Agendar Cita</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <input
                type="text"
                placeholder="Nombre del Cliente"
                required
                className="w-full border p-2 rounded"
                onChange={(e) => setFormData({ ...formData, cliente_nombre: e.target.value })}
              />
              <input
                type="text"
                placeholder="Teléfono (WhatsApp ej: 584120000000)"
                required
                className="w-full border p-2 rounded"
                onChange={(e) => setFormData({ ...formData, cliente_telefono: e.target.value })}
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="date"
                  required
                  value={formData.fecha}
                  className="w-full border p-2 rounded"
                  onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
                />
                <input
                  type="time"
                  required
                  value={formData.hora_inicio}
                  className="w-full border p-2 rounded"
                  onChange={(e) => setFormData({ ...formData, hora_inicio: e.target.value })}
                />
              </div>
              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 bg-gray-200 rounded"
                >
                  Cancelar
                </button>
                <button type="submit" className="px-4 py-2 bg-lime-600 text-white rounded">
                  Agendar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}


'use client';
import React, { useEffect, useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import esLocale from '@fullcalendar/core/locales/es';
import { supabase } from '../lib/supabase';

const DURACIONES: Record<string, number> = {
  'Manicure': 120,
  'Pedicure': 100,
  'Manicure + Pedicure': 220
};

export default function Home() {
  const [events, setEvents] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    cliente_nombre: '',
    cliente_telefono: '',
    especialista_id: '1',
    manicurista_nombre: 'Manicurista 1',
    servicio_nombre: 'Manicure',
    servicio_id: '1',
    fecha: new Date().toISOString().split('T')[0],
    hora_inicio: '10:00'
  });

  const fetchCitas = async () => {
    const { data, error } = await supabase
      .from('citas')
      .select('id, fecha, hora_inicio, hora_fin, estado, cliente_nombre, manicurista_nombre, servicio_nombre, clientes (nombre, telefono), servicios (nombre)')
      .neq('estado', 'cancelada');

    if (!error && data) {
      const formattedEvents = data.map((item: any) => {
        let hInicio = item.hora_inicio || '09:00';
        let hFin = item.hora_fin;

        if (hInicio.length === 5) hInicio += ':00';

        if (!hFin) {
          const duracionMin = DURACIONES[item.servicio_nombre] || 120;
          const [h, m] = hInicio.split(':').map(Number);
          const totalMin = h * 60 + m + duracionMin;
          const endH = String(Math.floor(totalMin / 60) % 24).padStart(2, '0');
          const endM = String(totalMin % 60).padStart(2, '0');
          hFin = endH + ':' + endM + ':00';
        } else if (hFin.length === 5) {
          hFin += ':00';
        }

        const clienteObj = Array.isArray(item.clientes) ? item.clientes[0] : item.clientes;
        const servicioObj = Array.isArray(item.servicios) ? item.servicios[0] : item.servicios;

        const clienteNom = item.cliente_nombre || clienteObj?.nombre || 'Cliente';
        const servicioNom = item.servicio_nombre || servicioObj?.nombre || 'Manicure';
        const manicuristaNom = item.manicurista_nombre || 'Especialista';

        return {
          id: item.id,
          title: clienteNom + ' - ' + servicioNom + ' (' + manicuristaNom + ')',
          start: item.fecha + 'T' + hInicio,
          end: item.fecha + 'T' + hFin,
          backgroundColor: '#84cc16',
          textColor: '#ffffff',
          borderColor: '#65a30d'
        };
      });
      setEvents(formattedEvents);
    }
  };

  useEffect(() => {
    fetchCitas();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const duracionMin = DURACIONES[formData.servicio_nombre] || 120;
    const [h, m] = formData.hora_inicio.split(':').map(Number);
    const totalMin = h * 60 + m + duracionMin;
    const horaFinCalc = String(Math.floor(totalMin / 60) % 24).padStart(2, '0') + ':' + String(totalMin % 60).padStart(2, '0');

    const payload = {
      ...formData,
      hora_fin: horaFinCalc,
      duracion_minutos: duracionMin
    };

    const res = await fetch('/api/citas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (res.ok) {
      alert('¡Cita agendada exitosamente!');
      setModalOpen(false);
      fetchCitas();
    } else {
      alert(data.error || 'Ocurrió un error al agendar la cita');
    }
  };

  const duracionActual = DURACIONES[formData.servicio_nombre] || 120;
  const duracionTexto = duracionActual === 120 ? '2 Horas' : duracionActual === 100 ? '1 Hora 40 Min' : '3 Horas 40 Min';

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
          plugins={[timeGridPlugin, interactionPlugin]}
          initialView="timeGridWeek"
          locale={esLocale}
          nowIndicator={true}
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: 'timeGridWeek,timeGridDay'
          }}
          buttonText={{
            today: 'Hoy',
            week: 'Semana',
            day: 'Día'
          }}
          slotMinTime="07:00:00"
          slotMaxTime="19:00:00"
          allDaySlot={false}
          events={events}
        />
      </div>

      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white p-6 rounded-xl max-w-md w-full shadow-2xl border border-gray-200">
            <h2 className="text-xl font-bold mb-4 text-gray-800">Agendar Cita</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Nombre de la Clienta</label>
                <input
                  type="text"
                  placeholder="Ej: María Pérez"
                  required
                  className="w-full border border-gray-300 p-2 rounded-lg text-sm text-gray-800"
                  onChange={(e) => setFormData({ ...formData, cliente_nombre: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Teléfono (WhatsApp)</label>
                <input
                  type="text"
                  placeholder="Ej: 584120000000"
                  required
                  className="w-full border border-gray-300 p-2 rounded-lg text-sm text-gray-800"
                  onChange={(e) => setFormData({ ...formData, cliente_telefono: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Manicurista</label>
                  <select
                    className="w-full border border-gray-300 p-2 rounded-lg text-sm text-gray-800 bg-white"
                    value={formData.manicurista_nombre}
                    onChange={(e) => setFormData({ ...formData, manicurista_nombre: e.target.value })}
                  >
                    <option value="Manicurista 1">Manicurista 1</option>
                    <option value="Manicurista 2">Manicurista 2</option>
                    <option value="Manicurista 3">Manicurista 3</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Servicio</label>
                  <select
                    className="w-full border border-gray-300 p-2 rounded-lg text-sm text-gray-800 bg-white"
                    value={formData.servicio_nombre}
                    onChange={(e) => setFormData({ ...formData, servicio_nombre: e.target.value })}
                  >
                    <option value="Manicure">Manicure (2h)</option>
                    <option value="Pedicure">Pedicure (1h 40m)</option>
                    <option value="Manicure + Pedicure">Manicure + Pedicure (3h 40m)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Fecha</label>
                  <input
                    type="date"
                    required
                    value={formData.fecha}
                    className="w-full border border-gray-300 p-2 rounded-lg text-sm text-gray-800"
                    onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Hora Inicio</label>
                  <input
                    type="time"
                    required
                    value={formData.hora_inicio}
                    className="w-full border border-gray-300 p-2 rounded-lg text-sm text-gray-800"
                    onChange={(e) => setFormData({ ...formData, hora_inicio: e.target.value })}
                  />
                </div>
              </div>

              <p className="text-xs text-gray-700 bg-lime-50 p-2.5 rounded-lg border border-lime-200">
                📌 Duración estimada: <strong>{duracionTexto}</strong>
              </p>

              <div className="flex justify-end space-x-2 pt-3">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-300"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-lime-600 text-white rounded-lg text-sm font-medium hover:bg-lime-700"
                >
                  Agendar Cita
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
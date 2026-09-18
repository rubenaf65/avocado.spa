'use client';
import React, { useEffect, useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import resourceTimeGridPlugin from '@fullcalendar/resource-timegrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import listPlugin from '@fullcalendar/list';
import esLocale from '@fullcalendar/core/locales/es';
import { supabase } from '../lib/supabase';

const OBTENER_COLOR_MANICURISTA = (manicurista: string) => {
  const nombre = manicurista?.toLowerCase().trim() || '';
  if (nombre.includes('1')) return { bg: '#22c55e', text: '#ffffff' };
  if (nombre.includes('2')) return { bg: '#3b82f6', text: '#ffffff' };
  if (nombre.includes('3')) return { bg: '#f97316', text: '#ffffff' };
  return { bg: '#84cc16', text: '#ffffff' };
};

const DURACIONES: Record<string, number> = {
  'Manicure': 120,
  'Pedicure': 100,
  'Manicure + Pedicure': 220
};

const RESOURCES = [
  { id: 'Manicurista 1', title: 'Manicurista 1' },
  { id: 'Manicurista 2', title: 'Manicurista 2' },
  { id: 'Manicurista 3', title: 'Manicurista 3' }
];

export default function Home() {
  const [events, setEvents] = useState<any[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [initialView, setInitialView] = useState('resourceTimeGridDay');
  const [formData, setFormData] = useState({
    cliente_nombre: '',
    cliente_telefono: '',
    manicurista_nombre: 'Manicurista 1',
    servicio_nombre: 'Manicure',
    fecha: new Date().toISOString().split('T')[0],
    hora_inicio: '10:00'
  });

  // Detectar pantalla para ajustar la vista en móviles
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setInitialView('listDay'); // Vista lista para móviles
      } else {
        setInitialView('resourceTimeGridDay'); // Vista por columnas para PC/Tablet
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const fetchCitas = async () => {
    const { data, error } = await supabase
      .from('citas')
      .select('*')
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

        const clienteNom = item.cliente_nombre || 'Cliente';
        const servicioNom = item.servicio_nombre || 'Servicio';
        const manicuristaNom = item.manicurista_nombre || 'Manicurista 1';
        const colores = OBTENER_COLOR_MANICURISTA(manicuristaNom);

        return {
          id: String(item.id),
          resourceId: manicuristaNom,
          title: `${clienteNom} - ${servicioNom} (${manicuristaNom})`,
          start: `${item.fecha}T${hInicio}`,
          end: `${item.fecha}T${hFin}`,
          backgroundColor: colores.bg,
          textColor: colores.text,
          borderColor: 'transparent'
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
    const startMin = h * 60 + m;
    const endMin = startMin + duracionMin;
    const horaFinCalc = String(Math.floor(endMin / 60) % 24).padStart(2, '0') + ':' + String(endMin % 60).padStart(2, '0');

    const colision = events.some((evt) => {
      if (evt.resourceId !== formData.manicurista_nombre) return false;
      const evtFecha = evt.start.split('T')[0];
      if (evtFecha !== formData.fecha) return false;

      const [eHStart, eMStart] = evt.start.split('T')[1].split(':').map(Number);
      const [eHEnd, eMEnd] = evt.end.split('T')[1].split(':').map(Number);
      const evtStartMin = eHStart * 60 + eMStart;
      const evtEndMin = eHEnd * 60 + eMEnd;

      return startMin < evtEndMin && endMin > evtStartMin;
    });

    if (colision) {
      alert(`⚠️ La ${formData.manicurista_nombre} ya tiene una cita ocupada en ese rango de horario.`);
      return;
    }

    const payload = {
      cliente_nombre: formData.cliente_nombre,
      cliente_telefono: formData.cliente_telefono,
      manicurista_nombre: formData.manicurista_nombre,
      servicio_nombre: formData.servicio_nombre,
      fecha: formData.fecha,
      hora_inicio: formData.hora_inicio,
      hora_fin: horaFinCalc,
      duracion_minutos: duracionMin
    };

    const res = await fetch('/api/citas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      alert('¡Cita agendada correctamente!');
      setModalOpen(false);
      fetchCitas();
    } else {
      alert('Hubo un problema al guardar la cita en la base de datos.');
    }
  };

  const duracionActual = DURACIONES[formData.servicio_nombre] || 120;
  const duracionTexto = duracionActual === 120 ? '2 Horas' : duracionActual === 100 ? '1 Hora 40 Min' : '3 Horas 40 Min';

  return (
    <main style={{ minHeight: '100vh', backgroundColor: '#f9fafb', padding: '1rem' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', backgroundColor: '#ffffff', padding: '1rem', borderRadius: '1rem', border: '1px solid #f3f4f6' }}>
        
        {/* Encabezado Responsivo */}
        <div style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#1f2937', margin: 0 }}>Control de Citas Avocado Spa</h1>
          <button
            onClick={() => setModalOpen(true)}
            style={{ backgroundColor: '#65a30d', color: '#ffffff', padding: '0.5rem 1rem', borderRadius: '0.5rem', fontWeight: 500, cursor: 'pointer', border: 'none', width: 'auto' }}
          >
            + Nueva Cita
          </button>
        </div>

        {/* Calendario con plugin de Lista para móviles */}
        <div style={{ overflowX: 'auto' }}>
          <FullCalendar
            plugins={[resourceTimeGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
            initialView={initialView}
            resources={RESOURCES}
            locale={esLocale}
            nowIndicator={true}
            height="auto"
            aspectRatio={1.5}
            headerToolbar={{
              left: 'prev,next today',
              center: 'title',
              right: 'resourceTimeGridDay,timeGridWeek,listDay'
            }}
            buttonText={{
              today: 'Hoy',
              week: 'Semana',
              day: 'Por Manicurista',
              listDay: 'Lista Día'
            }}
            slotMinTime="07:00:00"
            slotMaxTime="19:00:00"
            allDaySlot={false}
            events={events}
          />
        </div>
      </div>

      {/* Modal Adaptable a pantallas pequeñas */}
      {modalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', zIndex: 9999 }}>
          <div style={{ backgroundColor: '#ffffff', padding: '1.25rem', borderRadius: '0.75rem', maxWidth: '420px', width: '100%', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 'bold', marginBottom: '0.75rem', color: '#111827' }}>Agendar Cita</h2>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#4b5563', marginBottom: '0.25rem' }}>Nombre de la Clienta</label>
                <input
                  type="text"
                  placeholder="Ej: María Pérez"
                  required
                  style={{ width: '100%', border: '1px solid #d1d5db', padding: '0.5rem', borderRadius: '0.375rem', fontSize: '0.875rem', boxSizing: 'border-box' }}
                  onChange={(e) => setFormData({ ...formData, cliente_nombre: e.target.value })}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#4b5563', marginBottom: '0.25rem' }}>Teléfono (WhatsApp)</label>
                <input
                  type="text"
                  placeholder="Ej: 584120000000"
                  required
                  style={{ width: '100%', border: '1px solid #d1d5db', padding: '0.5rem', borderRadius: '0.375rem', fontSize: '0.875rem', boxSizing: 'border-box' }}
                  onChange={(e) => setFormData({ ...formData, cliente_telefono: e.target.value })}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.5rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#4b5563', marginBottom: '0.25rem' }}>Manicurista</label>
                  <select
                    style={{ width: '100%', border: '1px solid #d1d5db', padding: '0.5rem', borderRadius: '0.375rem', fontSize: '0.875rem', backgroundColor: '#fff', boxSizing: 'border-box' }}
                    value={formData.manicurista_nombre}
                    onChange={(e) => setFormData({ ...formData, manicurista_nombre: e.target.value })}
                  >
                    <option value="Manicurista 1">Manicurista 1</option>
                    <option value="Manicurista 2">Manicurista 2</option>
                    <option value="Manicurista 3">Manicurista 3</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#4b5563', marginBottom: '0.25rem' }}>Servicio</label>
                  <select
                    style={{ width: '100%', border: '1px solid #d1d5db', padding: '0.5rem', borderRadius: '0.375rem', fontSize: '0.875rem', backgroundColor: '#fff', boxSizing: 'border-box' }}
                    value={formData.servicio_nombre}
                    onChange={(e) => setFormData({ ...formData, servicio_nombre: e.target.value })}
                  >
                    <option value="Manicure">Manicure (2h)</option>
                    <option value="Pedicure">Pedicure (1h 40m)</option>
                    <option value="Manicure + Pedicure">Manicure + Pedicure (3h 40m)</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.5rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#4b5563', marginBottom: '0.25rem' }}>Fecha</label>
                  <input
                    type="date"
                    required
                    value={formData.fecha}
                    style={{ width: '100%', border: '1px solid #d1d5db', padding: '0.5rem', borderRadius: '0.375rem', fontSize: '0.875rem', boxSizing: 'border-box' }}
                    onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#4b5563', marginBottom: '0.25rem' }}>Hora Inicio</label>
                  <input
                    type="time"
                    required
                    value={formData.hora_inicio}
                    style={{ width: '100%', border: '1px solid #d1d5db', padding: '0.5rem', borderRadius: '0.375rem', fontSize: '0.875rem', boxSizing: 'border-box' }}
                    onChange={(e) => setFormData({ ...formData, hora_inicio: e.target.value })}
                  />
                </div>
              </div>

              <p style={{ fontSize: '0.75rem', color: '#3f6212', backgroundColor: '#ecfccb', padding: '0.5rem', borderRadius: '0.375rem', margin: 0 }}>
                📌 Duración estimada: <strong>{duracionTexto}</strong>
              </p>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  style={{ padding: '0.5rem 1rem', backgroundColor: '#e5e7eb', color: '#374151', borderRadius: '0.375rem', border: 'none', cursor: 'pointer' }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  style={{ padding: '0.5rem 1rem', backgroundColor: '#65a30d', color: '#ffffff', borderRadius: '0.375rem', border: 'none', cursor: 'pointer', fontWeight: 500 }}
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
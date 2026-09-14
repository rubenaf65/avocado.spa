'use client';
import React, { useEffect, useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import timeGridPlugin from '@fullcalendar/timegrid';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import esLocale from '@fullcalendar/core/locales/es';
import { supabase } from '../lib/supabase';

const DURACIONES: Record<string, number> = {
  'Manicure': 120,
  'Pedicure': 100,
  'Manicure + Pedicure': 220
};

export default function Home() {
  const [events, setEvents] = useState<any[]>([]);
  const [citasRaw, setCitasRaw] = useState<any[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [whatsappModal, setWhatsappModal] = useState<{ open: boolean; url: string; cliente: string } | null>(null);
  
  const [adminModalOpen, setAdminModalOpen] = useState(false);
  const [adminLoggedIn, setAdminLoggedIn] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');

  const [formData, setFormData] = useState({
    cliente_nombre: '',
    cliente_telefono: '',
    manicurista_nombre: 'Manicurista 1',
    servicio_nombre: 'Manicure',
    fecha: new Date().toISOString().split('T')[0],
    hora_inicio: '10:00'
  });

  const fetchCitas = async () => {
    try {
      const { data, error } = await supabase
        .from('citas')
        .select('*')
        .neq('estado', 'cancelada');

      if (!error && data) {
        setCitasRaw(data);
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

          const clienteNom = item.cliente_nombre || item.nombre || 'Cliente';
          const servicioNom = item.servicio_nombre || item.servicio || 'Servicio';
          const manicuristaNom = item.manicurista_nombre || item.manicurista || 'Manicurista 1';

          return {
            id: String(item.id),
            title: clienteNom + ' - ' + servicioNom + ' (' + manicuristaNom + ')',
            start: item.fecha + 'T' + hInicio,
            end: item.fecha + 'T' + hFin,
            manicurista: manicuristaNom,
            backgroundColor: manicuristaNom === 'Manicurista 1' ? '#65a30d' : manicuristaNom === 'Manicurista 2' ? '#0284c7' : '#d97706',
            textColor: '#ffffff',
            borderColor: 'transparent'
          };
        });
        setEvents(formattedEvents);
      }
    } catch (e) {
      console.error(e);
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
    const endH = String(Math.floor(endMin / 60) % 24).padStart(2, '0');
    const endM = String(endMin % 60).padStart(2, '0');
    const horaFinCalc = endH + ':' + endM;

    const hayChoque = events.some((evt) => {
      if (evt.manicurista !== formData.manicurista_nombre) return false;
      const evtFecha = evt.start.split('T')[0];
      if (evtFecha !== formData.fecha) return false;

      const [eHStart, eMStart] = evt.start.split('T')[1].split(':').map(Number);
      const [eHEnd, eMEnd] = evt.end.split('T')[1].split(':').map(Number);
      const evtStartMin = eHStart * 60 + eMStart;
      const evtEndMin = eHEnd * 60 + eMEnd;

      return startMin < evtEndMin && endMin > evtStartMin;
    });

    if (hayChoque) {
      alert('⚠️ No se puede agendar: La ' + formData.manicurista_nombre + ' ya tiene una cita asignada en ese rango de horario. Libere el turno primero desde el panel de Admin si la clienta anterior canceló.');
      return;
    }

    try {
      const res = await fetch('/api/citas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cliente_nombre: formData.cliente_nombre,
          cliente_telefono: formData.cliente_telefono,
          manicurista_nombre: formData.manicurista_nombre,
          servicio_nombre: formData.servicio_nombre,
          fecha: formData.fecha,
          hora_inicio: formData.hora_inicio,
          hora_fin: horaFinCalc,
          estado: 'activa'
        })
      });

      if (!res.ok) throw new Error('Error al guardar en base de datos');
    } catch (err) {
      console.error(err);
    }

    fetchCitas();

    const mensajeWp = encodeURIComponent(
      'Hola *' + formData.cliente_nombre + '*! Te saludamos de *Avocado Spa*. Tu cita para *' + formData.servicio_nombre + '* con la *' + formData.manicurista_nombre + '* ha sido confirmada exitosamente.\n\nFecha: ' + formData.fecha + '\nHora: ' + formData.hora_inicio + '\n\nRecordatorio importante: Te esperamos 5 minutos antes. En caso de no poder asistir, por favor avísanos con anticipación. ¡Te esperamos!'
    );

    let telLimpio = formData.cliente_telefono.replace(/\D/g, '');
    const waUrl = 'https://wa.me/' + telLimpio + '?text=' + mensajeWp;

    setModalOpen(false);
    setWhatsappModal({ open: true, url: waUrl, cliente: formData.cliente_nombre });
  };

  const handleCancelarCita = async (id: number) => {
    if (!confirm('¿Estás segura de cancelar esta cita? El turno quedará libre para otra clienta.')) return;
    try {
      await supabase
        .from('citas')
        .update({ estado: 'cancelada' })
        .eq('id', id);

      alert('Cita cancelada con éxito. El horario ha sido liberado.');
      fetchCitas();
    } catch (e) {
      console.error(e);
      alert('Error al cancelar la cita');
    }
  };

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminPassword === 'avocado2026*') {
      setAdminLoggedIn(true);
    } else {
      alert('❌ Clave incorrecta');
    }
  };

  const now = new Date();
  const currentHourString = String(now.getHours()).padStart(2, '0') + ':00:00';
  const duracionActual = DURACIONES[formData.servicio_nombre] || 120;
  const duracionTexto = duracionActual === 120 ? '2 Horas' : duracionActual === 100 ? '1 Hora 40 Min' : '3 Horas 40 Min';

  return (
    <main style={{ minHeight: '100vh', backgroundColor: '#f9fafb', padding: '2rem' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', backgroundColor: '#ffffff', padding: '1.5rem', borderRadius: '1rem', border: '1px solid #f3f4f6' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1f2937' }}>Control de Citas Avocado Spa</h1>
            <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: 0 }}>🟢 Manicurista 1 | 🔵 Manicurista 2 | 🟠 Manicurista 3</p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button
              onClick={() => { setAdminModalOpen(true); setAdminLoggedIn(false); setAdminPassword(''); }}
              style={{ backgroundColor: '#374151', color: '#ffffff', padding: '0.5rem 1rem', borderRadius: '0.5rem', fontWeight: 500, cursor: 'pointer', border: 'none', fontSize: '0.875rem' }}
            >
              🔒 Admin
            </button>
            <button
              onClick={() => setModalOpen(true)}
              style={{ backgroundColor: '#65a30d', color: '#ffffff', padding: '0.5rem 1rem', borderRadius: '0.5rem', fontWeight: 500, cursor: 'pointer', border: 'none' }}
            >
              + Nueva Cita
            </button>
          </div>
        </div>

        <FullCalendar
          plugins={[timeGridPlugin, dayGridPlugin, interactionPlugin]}
          initialView="timeGridWeek"
          locale={esLocale}
          nowIndicator={true}
          scrollTime={currentHourString}
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
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', zIndex: 9999 }}>
          <div style={{ backgroundColor: '#ffffff', padding: '1.5rem', borderRadius: '0.75rem', maxWidth: '400px', width: '100%', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem', color: '#111827' }}>Agendar Cita</h2>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#4b5563', marginBottom: '0.25rem' }}>Nombre de la Clienta</label>
                <input
                  type="text"
                  placeholder="Ej: María Pérez"
                  required
                  style={{ width: '100%', border: '1px solid #d1d5db', padding: '0.5rem', borderRadius: '0.375rem', fontSize: '0.875rem' }}
                  onChange={(e) => setFormData({ ...formData, cliente_nombre: e.target.value })}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#4b5563', marginBottom: '0.25rem' }}>Teléfono (WhatsApp)</label>
                <input
                  type="text"
                  placeholder="Ej: 584120000000"
                  required
                  style={{ width: '100%', border: '1px solid #d1d5db', padding: '0.5rem', borderRadius: '0.375rem', fontSize: '0.875rem' }}
                  onChange={(e) => setFormData({ ...formData, cliente_telefono: e.target.value })}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#4b5563', marginBottom: '0.25rem' }}>Manicurista</label>
                  <select
                    style={{ width: '100%', border: '1px solid #d1d5db', padding: '0.5rem', borderRadius: '0.375rem', fontSize: '0.875rem', backgroundColor: '#fff' }}
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
                    style={{ width: '100%', border: '1px solid #d1d5db', padding: '0.5rem', borderRadius: '0.375rem', fontSize: '0.875rem', backgroundColor: '#fff' }}
                    value={formData.servicio_nombre}
                    onChange={(e) => setFormData({ ...formData, servicio_nombre: e.target.value })}
                  >
                    <option value="Manicure">Manicure (2h)</option>
                    <option value="Pedicure">Pedicure (1h 40m)</option>
                    <option value="Manicure + Pedicure">Manicure + Pedicure (3h 40m)</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#4b5563', marginBottom: '0.25rem' }}>Fecha</label>
                  <input
                    type="date"
                    required
                    value={formData.fecha}
                    style={{ width: '100%', border: '1px solid #d1d5db', padding: '0.5rem', borderRadius: '0.375rem', fontSize: '0.875rem' }}
                    onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#4b5563', marginBottom: '0.25rem' }}>Hora Inicio</label>
                  <input
                    type="time"
                    required
                    value={formData.hora_inicio}
                    style={{ width: '100%', border: '1px solid #d1d5db', padding: '0.5rem', borderRadius: '0.375rem', fontSize: '0.875rem' }}
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
                  Agendar y Notificar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {whatsappModal && whatsappModal.open && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', zIndex: 9999 }}>
          <div style={{ backgroundColor: '#ffffff', padding: '2rem', borderRadius: '0.75rem', maxWidth: '420px', width: '100%', textAlign: 'center', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>🎉</div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#111827', marginBottom: '0.5rem' }}>¡Cita Agendada con Éxito!</h2>
            <p style={{ fontSize: '0.875rem', color: '#4b5563', marginBottom: '1.5rem' }}>
              La cita para <strong>{whatsappModal.cliente}</strong> se guardó correctamente. Haz clic abajo para enviar la confirmación y recordatorio por WhatsApp:
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <a
                href={whatsappModal.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{ backgroundColor: '#25D366', color: '#ffffff', padding: '0.75rem 1rem', borderRadius: '0.5rem', fontWeight: 'bold', textDecoration: 'none', display: 'block', fontSize: '0.95rem' }}
              >
                📲 Enviar WhatsApp a la Clienta
              </a>
              <button
                onClick={() => setWhatsappModal(null)}
                style={{ backgroundColor: '#f3f4f6', color: '#374151', padding: '0.5rem 1rem', borderRadius: '0.5rem', border: 'none', cursor: 'pointer', fontWeight: 500 }}
              >
                Cerrar ventana
              </button>
            </div>
          </div>
        </div>
      )}

      {adminModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', zIndex: 9999 }}>
          <div style={{ backgroundColor: '#ffffff', padding: '2rem', borderRadius: '0.75rem', maxWidth: '600px', width: '100%', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', maxHeight: '85vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#111827', margin: 0 }}>Panel de Administración - Gestión de Citas</h2>
              <button onClick={() => setAdminModalOpen(false)} style={{ background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer' }}>✕</button>
            </div>

            {!adminLoggedIn ? (
              <form onSubmit={handleAdminLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1rem 0' }}>
                <p style={{ fontSize: '0.875rem', color: '#4b5563', margin: 0 }}>Introduce la clave de administración para liberar turnos o cancelar citas:</p>
                <div>
                  <input
                    type="password"
                    placeholder="Clave de administrador"
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    required
                    style={{ width: '100%', border: '1px solid #d1d5db', padding: '0.75rem', borderRadius: '0.375rem', fontSize: '0.875rem' }}
                  />
                </div>
                <button
                  type="submit"
                  style={{ backgroundColor: '#374151', color: '#ffffff', padding: '0.75rem', borderRadius: '0.375rem', border: 'none', cursor: 'pointer', fontWeight: 500 }}
                >
                  Ingresar al Panel
                </button>
              </form>
            ) : (
              <div>
                <p style={{ fontSize: '0.875rem', color: '#059669', marginBottom: '1rem', fontWeight: 500 }}>🔓 Sesión iniciada correctamente. Citas activas:</p>
                {citasRaw.length === 0 ? (
                  <p style={{ fontSize: '0.875rem', color: '#6b7280', textAlign: 'center', padding: '2rem 0' }}>No hay citas registradas en este momento.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {citasRaw.map((cita) => {
                      const nombreCliente = cita.cliente_nombre || cita.nombre || 'Sin nombre';
                      const nombreServicio = cita.servicio_nombre || cita.servicio || 'Servicio';
                      const nombreManicurista = cita.manicurista_nombre || cita.manicurista || 'Manicurista 1';
                      return (
                        <div key={cita.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', backgroundColor: '#f9fafb', borderRadius: '0.5rem', border: '1px solid #e5e7eb' }}>
                          <div>
                            <p style={{ fontSize: '0.875rem', fontWeight: 'bold', color: '#1f2937', margin: 0 }}>{nombreCliente} - {nombreServicio}</p>
                            <p style={{ fontSize: '0.75rem', color: '#4b5563', margin: '0.2rem 0 0 0' }}>👤 {nombreManicurista} | 📅 {cita.fecha} | ⏰ {cita.hora_inicio}</p>
                          </div>
                          <button
                            onClick={() => handleCancelarCita(cita.id)}
                            style={{ backgroundColor: '#dc2626', color: '#ffffff', border: 'none', padding: '0.4rem 0.75rem', borderRadius: '0.375rem', fontSize: '0.75rem', fontWeight: 500, cursor: 'pointer' }}
                          >
                            Liberar Turno (Cancelar)
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
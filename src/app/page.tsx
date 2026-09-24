'use client';

import React, { useEffect, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import esLocale from '@fullcalendar/core/locales/es';
import { supabase } from '../lib/supabase';
import { generarLinkWhatsApp } from '@/lib/whatsapp';
import { msgConfirmacionCliente } from '@/lib/mensajesWhatsApp';
import ReporteSemanalModal from '@/components/ReporteSemanalModal';

const FullCalendar = dynamic(() => import('@fullcalendar/react'), { ssr: false });

const COLORES_PREDEFINIDOS = [
  { bg: '#eab308', border: '#ca8a04', text: '#1e293b' }, // Amarillo / Dorado
  { bg: '#3b82f6', border: '#1d4ed8', text: '#ffffff' }, // Azul
  { bg: '#86efac', border: '#16a34a', text: '#064e3b' }, // Verde Menta
  { bg: '#f97316', border: '#c2410c', text: '#ffffff' }, // Naranja
  { bg: '#ec4899', border: '#be185d', text: '#ffffff' }, // Rosa
  { bg: '#a855f7', border: '#7e22ce', text: '#ffffff' }, // Morado
];

// Helper para sumar minutos a una hora HH:MM
const sumarMinutosAHora = (horaInicio: string, minutos: number) => {
  if (!horaInicio) return '09:00';
  const [h, m] = horaInicio.split(':').map(Number);
  const totalMin = h * 60 + m + minutos;
  const endH = String(Math.floor(totalMin / 60) % 24).padStart(2, '0');
  const endM = String(totalMin % 60).padStart(2, '0');
  return `${endH}:${endM}`;
};

export default function Home() {
  const [events, setEvents] = useState<any[]>([]);
  const [citasList, setCitasList] = useState<any[]>([]);
  const [especialistas, setEspecialistas] = useState<any[]>([]);
  const [servicios, setServicios] = useState<any[]>([]);

  // Modales
  const [modalOpen, setModalOpen] = useState(false);
  const [adminModalOpen, setAdminModalOpen] = useState(false);
  const [reporteModalOpen, setReporteModalOpen] = useState(false);
  const [adminPasswordInput, setAdminPasswordInput] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminTab, setAdminTab] = useState<'citas' | 'especialistas' | 'servicios'>('citas');

  // Formulario cliente público
  const [formData, setFormData] = useState({
    cliente_nombre: '',
    cliente_telefono: '',
    manicurista_nombre: '',
    servicio_nombre: '',
    fecha: '',
    hora_inicio: '09:00',
    hora_fin: '11:00'
  });

  useEffect(() => {
    const hoy = new Date().toISOString().split('T')[0];
    setFormData((prev) => ({ ...prev, fecha: hoy }));
  }, []);

  const fetchData = useCallback(async () => {
    // 1. Especialistas
    let currentEspecialistas: any[] = [];
    const { data: espData } = await supabase.from('especialistas').select('*').order('id', { ascending: true });
    if (espData && espData.length > 0) {
      currentEspecialistas = espData;
    } else {
      currentEspecialistas = [
        { id: 1, nombre: 'JHOOSY' },
        { id: 2, nombre: 'NICOLE' },
        { id: 3, nombre: 'LALI' }
      ];
    }
    setEspecialistas(currentEspecialistas);

    // 2. Servicios
    let currentServicios: any[] = [];
    const { data: servData } = await supabase.from('servicios').select('*').order('id', { ascending: true });
    if (servData && servData.length > 0) {
      currentServicios = servData;
    } else {
      currentServicios = [
        { id: 1, nombre: 'MANOS Y PIES TRADICIONALES', duracion_minutos: 160, precio: 0 },
        { id: 2, nombre: 'MANOS SEMIPERMANENTE Y PIES TRADICIONALES', duracion_minutos: 190, precio: 0 },
        { id: 3, nombre: 'PEDICURA SEMIPERMANENTE', duracion_minutos: 40, precio: 0 },
        { id: 4, nombre: 'PROTEIN + ESMALTE SEMIPERMANENTE', duracion_minutos: 120, precio: 0 }
      ];
    }
    setServicios(currentServicios);

    // Setear valores por defecto en form
    setFormData((prev) => {
      const servDef = currentServicios[0];
      const hFin = servDef ? sumarMinutosAHora(prev.hora_inicio, servDef.duracion_minutos) : '11:00';
      return {
        ...prev,
        manicurista_nombre: prev.manicurista_nombre || currentEspecialistas[0]?.nombre || '',
        servicio_nombre: prev.servicio_nombre || servDef?.nombre || '',
        hora_fin: hFin
      };
    });

    // 3. Citas
    const { data: citasData, error } = await supabase
      .from('citas')
      .select('*')
      .neq('estado', 'cancelada')
      .order('fecha', { ascending: true });

    if (!error && citasData) {
      setCitasList(citasData);

      const formattedEvents = citasData.map((item: any) => {
        let hInicio = item.hora_inicio || '09:00';
        let hFin = item.hora_fin;

        if (hInicio.length === 5) hInicio += ':00';

        if (!hFin) {
          const serv = currentServicios.find((s) => s.nombre === item.servicio_nombre);
          const duracionMin = serv ? serv.duracion_minutos : item.duracion_minutos || 120;
          hFin = `${sumarMinutosAHora(hInicio.substring(0, 5), duracionMin)}:00`;
        } else if (hFin.length === 5) {
          hFin += ':00';
        }

        const clienteNom = item.cliente_nombre || 'Cliente';
        const servicioNom = item.servicio_nombre || 'Servicio';
        const manicuristaNom = item.manicurista_nombre || 'Especialista';

        const espIndex = currentEspecialistas.findIndex((e) => e.nombre.toLowerCase() === manicuristaNom.toLowerCase());
        const colores =
          espIndex !== -1
            ? COLORES_PREDEFINIDOS[espIndex % COLORES_PREDEFINIDOS.length]
            : COLORES_PREDEFINIDOS[0];

        return {
          id: String(item.id),
          resourceId: manicuristaNom,
          title: `${clienteNom}\n${servicioNom}`,
          start: `${item.fecha}T${hInicio}`,
          end: `${item.fecha}T${hFin}`,
          backgroundColor: colores.bg,
          textColor: colores.text,
          borderColor: colores.border,
          extendedProps: {
            cliente: clienteNom,
            servicio: servicioNom,
            horaInicioStr: hInicio.substring(0, 5),
            horaFinStr: hFin.substring(0, 5)
          }
        };
      });

      setEvents(formattedEvents);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Al cambiar Servicio o Hora de Inicio, actualizar hora_fin automáticamente
  const handleServicioChange = (nombreServicio: string) => {
    const servObj = servicios.find((s) => s.nombre === nombreServicio);
    const duracion = servObj ? servObj.duracion_minutos : 120;
    const hFinCalculada = sumarMinutosAHora(formData.hora_inicio, duracion);
    setFormData((prev) => ({
      ...prev,
      servicio_nombre: nombreServicio,
      hora_fin: hFinCalculada
    }));
  };

  const handleHoraInicioChange = (horaInicio: string) => {
    const servObj = servicios.find((s) => s.nombre === formData.servicio_nombre);
    const duracion = servObj ? servObj.duracion_minutos : 120;
    const hFinCalculada = sumarMinutosAHora(horaInicio, duracion);
    setFormData((prev) => ({
      ...prev,
      hora_inicio: horaInicio,
      hora_fin: hFinCalculada
    }));
  };

  const handleSubmitCita = async (e: React.FormEvent) => {
    e.preventDefault();

    const servObj = servicios.find((s) => s.nombre === formData.servicio_nombre);
    const duracionMin = servObj ? servObj.duracion_minutos : 120;

    const payload = {
      cliente_nombre: formData.cliente_nombre,
      cliente_telefono: formData.cliente_telefono,
      manicurista_nombre: formData.manicurista_nombre,
      servicio_nombre: formData.servicio_nombre,
      fecha: formData.fecha,
      hora_inicio: formData.hora_inicio,
      hora_fin: formData.hora_fin,
      duracion_minutos: duracionMin,
      estado: 'confirmada'
    };

    try {
      const res = await fetch('/api/citas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        alert('¡Cita agendada correctamente!');
        setModalOpen(false);
        fetchData();
      } else {
        alert('Error al guardar cita.');
      }
    } catch (err) {
      console.error(err);
      alert('Error de conexión.');
    }
  };

  return (
    <main style={{ minHeight: '100vh', backgroundColor: '#f8fafc', padding: '1rem' }}>
      <style jsx global>{`
        /* Ajuste para bloques de citas ampliados */
        .fc-timegrid-slot {
          height: 48px !important; /* Amplía la altura de cada intervalo para mayor claridad visual */
        }

        .fc-event {
          border-radius: 6px !important;
          padding: 4px 6px !important;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1) !important;
        }

        .fc-event-main {
          white-space: normal !important;
          word-wrap: break-word !important;
          font-size: 0.82rem !important;
          line-height: 1.25 !important;
          font-weight: 600 !important;
        }
      `}</style>

      <div style={{ maxWidth: '1200px', margin: '0 auto', backgroundColor: '#ffffff', padding: '1.25rem', borderRadius: '1rem' }}>
        
        {/* Encabezado */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div>
            <h1 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#0f172a' }}>Agenda Avocado Spa</h1>
            <p style={{ fontSize: '0.8rem', color: '#64748b' }}>Martes a Sábado (9:00 AM - 5:00 PM)</p>
          </div>
          <button
            onClick={() => setModalOpen(true)}
            style={{ backgroundColor: '#65a30d', color: '#ffffff', padding: '0.5rem 1rem', borderRadius: '0.5rem', fontWeight: 600, border: 'none', cursor: 'pointer' }}
          >
            + Nueva Cita
          </button>
        </div>

        {/* Calendario con citas ampliadas */}
        <FullCalendar
          plugins={[timeGridPlugin, interactionPlugin]}
          initialView="timeGridWeek"
          locale={esLocale}
          timeZone="local"
          hiddenDays={[0, 1]}
          nowIndicator={true}
          slotMinTime="09:00:00"
          slotMaxTime="17:00:00"
          allDaySlot={false}
          slotDuration="00:30:00"
          events={events}
          eventContent={(eventInfo) => {
            const { cliente, servicio, horaInicioStr, horaFinStr } = eventInfo.event.extendedProps;
            return (
              <div style={{ padding: '2px 0' }}>
                <div style={{ fontSize: '0.75rem', opacity: 0.9, fontWeight: 'bold' }}>
                  {horaInicioStr} - {horaFinStr}
                </div>
                <div style={{ fontSize: '0.85rem', fontWeight: 'bold', marginTop: '2px' }}>
                  {cliente}
                </div>
                <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', opacity: 0.95 }}>
                  {servicio}
                </div>
              </div>
            );
          }}
        />
      </div>

      {/* Modal Crear Cita con Duración Automática */}
      {modalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', zIndex: 9999 }}>
          <div style={{ backgroundColor: '#ffffff', padding: '1.25rem', borderRadius: '0.75rem', maxWidth: '420px', width: '100%' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 'bold', marginBottom: '1rem' }}>Agendar Cita</h2>
            
            <form onSubmit={handleSubmitCita} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600 }}>Nombre Cliente</label>
                <input
                  type="text"
                  required
                  value={formData.cliente_nombre}
                  onChange={(e) => setFormData({ ...formData, cliente_nombre: e.target.value })}
                  style={{ width: '100%', border: '1px solid #d1d5db', padding: '0.5rem', borderRadius: '0.375rem', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600 }}>Servicio</label>
                <select
                  value={formData.servicio_nombre}
                  onChange={(e) => handleServicioChange(e.target.value)}
                  style={{ width: '100%', border: '1px solid #d1d5db', padding: '0.5rem', borderRadius: '0.375rem', boxSizing: 'border-box' }}
                >
                  {servicios.map((s) => (
                    <option key={s.id} value={s.nombre}>{s.nombre} ({s.duracion_minutos} min)</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600 }}>Hora Inicio</label>
                  <input
                    type="time"
                    required
                    value={formData.hora_inicio}
                    onChange={(e) => handleHoraInicioChange(e.target.value)}
                    style={{ width: '100%', border: '1px solid #d1d5db', padding: '0.5rem', borderRadius: '0.375rem', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600 }}>Hora Fin (Calculada)</label>
                  <input
                    type="time"
                    readOnly
                    value={formData.hora_fin}
                    style={{ width: '100%', border: '1px solid #d1d5db', padding: '0.5rem', borderRadius: '0.375rem', backgroundColor: '#f3f4f6', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button type="button" onClick={() => setModalOpen(false)} style={{ padding: '0.5rem 0.75rem', backgroundColor: '#e5e7eb', borderRadius: '0.375rem', border: 'none' }}>Cancelar</button>
                <button type="submit" style={{ padding: '0.5rem 0.75rem', backgroundColor: '#65a30d', color: '#fff', borderRadius: '0.375rem', border: 'none', fontWeight: 600 }}>Guardar Cita</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
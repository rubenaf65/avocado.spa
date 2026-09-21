'use client';

import React, { useState, useMemo } from 'react';

interface Cita {
  id: number;
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
  cliente_nombre: string;
  cliente_telefono: string;
  manicurista_nombre: string;
  servicio_nombre: string;
  estado?: string;
}

interface Servicio {
  id: number;
  nombre: string;
  duracion_minutos: number;
  precio: number;
}

interface ReporteSemanalModalProps {
  isOpen: boolean;
  onClose: () => void;
  citas: Cita[];
  servicios: Servicio[];
}

export default function ReporteSemanalModal({
  isOpen,
  onClose,
  citas,
  servicios
}: ReporteSemanalModalProps) {
  // Obtener rango de la semana actual (Lunes a Domingo) por defecto
  const getWeekRange = (date: Date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diffToMonday = d.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d.setDate(diffToMonday));
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    return {
      start: monday.toISOString().split('T')[0],
      end: sunday.toISOString().split('T')[0]
    };
  };

  const defaultRange = useMemo(() => getWeekRange(new Date()), []);
  const [fechaInicio, setFechaInicio] = useState(defaultRange.start);
  const [fechaFin, setFechaFin] = useState(defaultRange.end);

  if (!isOpen) return null;

  // Filtrar citas por rango de fecha seleccionada
  const citasFiltradas = citas.filter((cita) => {
    if (cita.estado === 'cancelada') return false;
    return cita.fecha >= fechaInicio && cita.fecha <= fechaFin;
  });

  // Mapa de precios de servicios para cálculo preciso de ingresos
  const preciosServiciosMap = servicios.reduce((acc, serv) => {
    acc[serv.nombre.toLowerCase()] = Number(serv.precio) || 0;
    return acc;
  }, {} as Record<string, number>);

  // Agrupar métricas por especialista
  const desglosePorEspecialista = citasFiltradas.reduce((acc, cita) => {
    const esp = cita.manicurista_nombre || 'Sin Asignar';
    const precio = preciosServiciosMap[cita.servicio_nombre.toLowerCase()] || 0;

    if (!acc[esp]) {
      acc[esp] = { totalCitas: 0, totalIngresos: 0 };
    }

    acc[esp].totalCitas += 1;
    acc[esp].totalIngresos += precio;

    return acc;
  }, {} as Record<string, { totalCitas: number; totalIngresos: number }>);

  // Totales generales
  const totalCitasGeneral = citasFiltradas.length;
  const totalIngresosGeneral = Object.values(desglosePorEspecialista).reduce(
    (sum, esp) => sum + esp.totalIngresos,
    0
  );

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
        zIndex: 10000
      }}
    >
      <div
        style={{
          backgroundColor: '#ffffff',
          padding: '1.5rem',
          borderRadius: '0.75rem',
          maxWidth: '650px',
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)'
        }}
      >
        {/* Encabezado */}
        <div
          style={{
            display: 'flex',
            justify: 'space-between',
            alignItems: 'center',
            marginBottom: '1rem',
            borderBottom: '1px solid #e5e7eb',
            paddingBottom: '0.75rem'
          }}
        >
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#0f172a', margin: 0 }}>
              📊 Reporte Semanal de Rendimiento
            </h2>
            <p style={{ fontSize: '0.8rem', color: '#64748b', margin: 0 }}>
              Resumen de citas finalizadas e ingresos estimados
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              padding: '0.35rem 0.7rem',
              backgroundColor: '#ef4444',
              color: '#ffffff',
              border: 'none',
              borderRadius: '0.375rem',
              cursor: 'pointer',
              fontSize: '0.8rem',
              fontWeight: 600
            }}
          >
            ✕ Cerrar
          </button>
        </div>

        {/* Filtros de Fecha */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '0.75rem',
            backgroundColor: '#f8fafc',
            padding: '0.75rem',
            borderRadius: '0.5rem',
            marginBottom: '1.25rem'
          }}
        >
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '0.25rem' }}>
              Desde
            </label>
            <input
              type="date"
              value={fechaInicio}
              onChange={(e) => setFechaInicio(e.target.value)}
              style={{
                width: '100%',
                border: '1px solid #cbd5e1',
                padding: '0.4rem',
                borderRadius: '0.375rem',
                fontSize: '0.85rem',
                boxSizing: 'border-box'
              }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '0.25rem' }}>
              Hasta
            </label>
            <input
              type="date"
              value={fechaFin}
              onChange={(e) => setFechaFin(e.target.value)}
              style={{
                width: '100%',
                border: '1px solid #cbd5e1',
                padding: '0.4rem',
                borderRadius: '0.375rem',
                fontSize: '0.85rem',
                boxSizing: 'border-box'
              }}
            />
          </div>
        </div>

        {/* Tarjetas de Métricas Resumen */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '1rem',
            marginBottom: '1.5rem'
          }}
        >
          <div
            style={{
              backgroundColor: '#f0fdf4',
              border: '1px solid #bbf7d0',
              padding: '1rem',
              borderRadius: '0.5rem',
              textAlign: 'center'
            }}
          >
            <span style={{ fontSize: '0.75rem', color: '#166534', fontWeight: 600 }}>Total Citas</span>
            <div style={{ fontSize: '1.75rem', fontWeight: 'bold', color: '#15803d' }}>
              {totalCitasGeneral}
            </div>
          </div>
          <div
            style={{
              backgroundColor: '#eff6ff',
              border: '1px solid #bfdbfe',
              padding: '1rem',
              borderRadius: '0.5rem',
              textAlign: 'center'
            }}
          >
            <span style={{ fontSize: '0.75rem', color: '#1e40af', fontWeight: 600 }}>Ingresos Estimados</span>
            <div style={{ fontSize: '1.75rem', fontWeight: 'bold', color: '#1d4ed8' }}>
              ${totalIngresosGeneral.toFixed(2)}
            </div>
          </div>
        </div>

        {/* Tabla Desglose por Especialista */}
        <h3 style={{ fontSize: '0.95rem', fontWeight: 'bold', color: '#334155', marginBottom: '0.5rem' }}>
          Desglose por Especialista
        </h3>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '2px solid #e2e8f0' }}>
                <th style={{ padding: '0.6rem' }}>Especialista</th>
                <th style={{ padding: '0.6rem', textAlign: 'center' }}>Citas Realizadas</th>
                <th style={{ padding: '0.6rem', textAlign: 'right' }}>Total Generado</th>
              </tr>
            </thead>
            <tbody>
              {Object.keys(desglosePorEspecialista).length === 0 ? (
                <tr>
                  <td colSpan={3} style={{ padding: '1rem', textAlign: 'center', color: '#94a3b8' }}>
                    No hay citas registradas en este rango de fechas.
                  </td>
                </tr>
              ) : (
                Object.entries(desglosePorEspecialista).map(([nombre, datos]) => (
                  <tr key={nombre} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '0.6rem', fontWeight: 600, color: '#1e293b' }}>{nombre}</td>
                    <td style={{ padding: '0.6rem', textAlign: 'center' }}>{datos.totalCitas}</td>
                    <td style={{ padding: '0.6rem', textAlign: 'right', fontWeight: 'bold', color: '#16a34a' }}>
                      ${datos.totalIngresos.toFixed(2)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
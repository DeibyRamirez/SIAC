'use client'

import Link from 'next/link'
import { ShieldCheck, Users, Files, ClipboardCheck, LayoutDashboard } from 'lucide-react'

import { PlantillaPaginaApp } from '@/components/layout/shell-aplicacion'
import { EncabezadoPagina, TarjetaAcceso } from '@/components/siac/tarjeta-acceso'

export default function SuperAdminPage() {
  return (
    <PlantillaPaginaApp titulo="SuperAdmin SIAC" rol="SuperAdmin">
      <div className="space-y-6">
        <EncabezadoPagina
          etiqueta="Administración global"
          titulo="Panel SuperAdmin"
          descripcion="Acceso unificado a todos los módulos SIAC y gestión de usuarios institucionales."
        />

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <TarjetaAcceso
            href="/superadmin/usuarios"
            titulo="Gestión de usuarios"
            descripcion="Crear, editar y desactivar perfiles del sistema."
            icono={Users}
          />
          <TarjetaAcceso
            href="/cargador"
            titulo="Módulo cargador"
            descripcion="Evidencias, plantillas y carga documental."
            icono={Files}
          />
          <TarjetaAcceso
            href="/revisor/bandeja"
            titulo="Bandeja revisor"
            descripcion="Dictámenes y revisión de evidencias."
            icono={ClipboardCheck}
          />
          <TarjetaAcceso
            href="/administrador"
            titulo="Módulo administrador"
            descripcion="Programas, vigencias y panel de métricas."
            icono={LayoutDashboard}
          />
        </div>

        <div className="rounded-xl border border-primary/15 bg-white p-4 text-sm text-muted-foreground">
          <div className="mb-2 flex items-center gap-2 text-primary">
            <ShieldCheck className="size-4" />
            <span className="font-semibold">Privilegios SuperAdmin</span>
          </div>
          <p>
            Este rol tiene bypass en todos los endpoints protegidos del backend y puede navegar
            entre módulos desde el menú lateral.
          </p>
          <Link href="/superadmin/usuarios" className="mt-3 inline-block text-cyan-tecnico hover:underline">
            Ir a gestión de usuarios →
          </Link>
        </div>
      </div>
    </PlantillaPaginaApp>
  )
}

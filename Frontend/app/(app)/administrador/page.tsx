'use client'

import { Bell, ClipboardCheck, Search, ShieldCheck } from 'lucide-react'

import { GuardiaSesion } from '@/components/auth/guardia-sesion'
import { ShellAplicacion } from '@/components/layout/shell-aplicacion'
import { EncabezadoPagina, TarjetaAcceso } from '@/components/siac/tarjeta-acceso'

export default function InicioAdministradorPage() {
  return (
    <GuardiaSesion rolPermitido="Administrador">
      <ContenidoInicioAdministrador />
    </GuardiaSesion>
  )
}

function ContenidoInicioAdministrador() {
  return (
    <ShellAplicacion titulo="Inicio Administrador">
      <EncabezadoPagina
        etiqueta="ROL ADMINISTRADOR / PAR ACADÉMICO"
        titulo="Panel de Planeación"
        descripcion="Consulta programas, busca evidencias validadas, revisa vigencias y abre el dashboard de Power BI."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <TarjetaAcceso
          titulo="Panel de programas"
          descripcion="Estado consolidado de programas de pregrado y posgrado."
          href="/administrador/programas"
          icono={ClipboardCheck}
        />
        <TarjetaAcceso
          titulo="Búsqueda de evidencias"
          descripcion="Filtra por texto, programa, factor y periodo con URL compartible."
          href="/administrador/busqueda"
          icono={Search}
        />
        <TarjetaAcceso
          titulo="Vigencias y alertas"
          descripcion="Semáforo de vencimientos y alertas in-app."
          href="/administrador/vigencias"
          icono={Bell}
        />
        <TarjetaAcceso
          titulo="Dashboard Power BI"
          descripcion="Métricas embebidas del programa seleccionado."
          href="/administrador/dashboard"
          icono={ShieldCheck}
        />
      </div>
    </ShellAplicacion>
  )
}

'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'

import {
  crearDatosIniciales,
  fusionarEvidenciasConSemilla,
  fusionarPlantillasConSemilla,
  guardarAlmacenLocal,
  leerAlmacenLocal,
  type DatosPrototipo,
} from '@/lib/almacen-prototipo'
import { CLAVE_SESION } from '@/lib/auth-mock'
import { apiDisponible } from '@/lib/servicios/cliente-api'
import {
  crearEvidenciaApi,
  dictaminarEvidenciaApi,
  listarEvidenciasApi,
} from '@/lib/servicios/evidencias.servicio'
import { listarPlantillasApi } from '@/lib/servicios/plantillas.servicio'
import {
  listarNotificacionesApi,
  listarVigenciasApi,
} from '@/lib/servicios/programas.servicio'
import type { AnexoVigencia, Evidencia, EstadoEvidencia, RolUsuario } from '@/lib/tipos'

interface ContextoAlmacen {
  datos: DatosPrototipo
  crearEvidencia: (
    evidencia: Omit<Evidencia, 'id' | 'fechaCarga' | 'estado'>,
    archivo?: File,
  ) => Promise<void>
  actualizarEvidencia: (id: string, cambios: Partial<Evidencia>) => void
  eliminarEvidencia: (id: string) => void
  dictaminarEvidencia: (
    id: string,
    estado: Extract<EstadoEvidencia, 'Validado' | 'Rechazado'>,
    observaciones?: string,
  ) => Promise<void>
}

const ContextoAlmacenSiac = createContext<ContextoAlmacen | null>(null)

function leerRolSesion(): RolUsuario | null {
  if (typeof window === 'undefined') return null
  try {
    const crudo = sessionStorage.getItem(CLAVE_SESION)
    if (!crudo) return null
    return (JSON.parse(crudo) as { rol?: RolUsuario }).rol ?? null
  } catch {
    return null
  }
}

function mapearEvidenciaApi(e: Evidencia): Evidencia {
  return {
    ...e,
    fechaCarga:
      typeof e.fechaCarga === 'string'
        ? e.fechaCarga.slice(0, 10)
        : new Date().toISOString().slice(0, 10),
  }
}

export function ProveedorAlmacen({ children }: { children: React.ReactNode }) {
  const [datos, setDatos] = useState<DatosPrototipo>(crearDatosIniciales)

  useEffect(() => {
    async function cargarDatos() {
      const local = leerAlmacenLocal() ?? crearDatosIniciales()

      if (!apiDisponible()) {
        setDatos(local)
        return
      }

      try {
        const [evResp, plantillas, anexos, alertas] = await Promise.all([
          listarEvidenciasApi({ limite: 100 }),
          listarPlantillasApi(),
          listarVigenciasApi(),
          listarNotificacionesApi().catch(() => []),
        ])

        const evidencias = evResp.datos.map(mapearEvidenciaApi)
        const anexosMapeados = (anexos as AnexoVigencia[]).map((anexo) => ({
          ...anexo,
          fechaVencimiento:
            typeof anexo.fechaVencimiento === 'string'
              ? anexo.fechaVencimiento.slice(0, 10)
              : anexo.fechaVencimiento,
        }))

        const alertasMapeadas = (
          alertas as { id: string; mensaje: string; leida: boolean; createdAt: string }[]
        ).map((alerta) => ({
          id: alerta.id,
          mensaje: alerta.mensaje,
          leida: alerta.leida,
          fecha: alerta.createdAt.slice(0, 10),
        }))

        const iniciales = crearDatosIniciales()
        const rol = leerRolSesion()
        setDatos({
          ...local,
          evidencias:
            rol === 'Administrador'
              ? evidencias
              : fusionarEvidenciasConSemilla(evidencias, iniciales.evidencias),
          plantillas: fusionarPlantillasConSemilla(plantillas, iniciales.plantillas),
          anexosVigencia: anexosMapeados,
          alertas: alertasMapeadas.length > 0 ? alertasMapeadas : local.alertas,
        })
      } catch {
        setDatos(local)
      }
    }

    cargarDatos()
  }, [])

  const persistir = useCallback((actualizador: (prev: DatosPrototipo) => DatosPrototipo) => {
    setDatos((prev) => {
      const actualizado = actualizador(prev)
      guardarAlmacenLocal(actualizado)
      return actualizado
    })
  }, [])

  const crearEvidencia = useCallback(
    async (evidencia: Omit<Evidencia, 'id' | 'fechaCarga' | 'estado'>, archivo?: File) => {
      if (apiDisponible() && archivo) {
        const formData = new FormData()
        formData.append('nombre', evidencia.nombre)
        formData.append('programaId', evidencia.programaId)
        formData.append('periodo', evidencia.periodo)
        formData.append('factor', evidencia.factor)
        formData.append('indicador', evidencia.indicador)
        formData.append('archivo', archivo)

        const creada = mapearEvidenciaApi(await crearEvidenciaApi(formData))
        persistir((prev) => ({ ...prev, evidencias: [creada, ...prev.evidencias] }))
        return
      }

      const nueva: Evidencia = {
        ...evidencia,
        id: `ev-${Date.now()}`,
        estado: 'Borrador',
        fechaCarga: new Date().toISOString().slice(0, 10),
      }
      persistir((prev) => ({ ...prev, evidencias: [nueva, ...prev.evidencias] }))
    },
    [persistir],
  )

  const actualizarEvidencia = useCallback(
    (id: string, cambios: Partial<Evidencia>) => {
      persistir((prev) => ({
        ...prev,
        evidencias: prev.evidencias.map((evidencia) =>
          evidencia.id === id ? { ...evidencia, ...cambios } : evidencia,
        ),
      }))
    },
    [persistir],
  )

  const eliminarEvidencia = useCallback(
    (id: string) => {
      persistir((prev) => ({
        ...prev,
        evidencias: prev.evidencias.filter((evidencia) => evidencia.id !== id),
      }))
    },
    [persistir],
  )

  const dictaminarEvidencia = useCallback(
    async (
      id: string,
      estado: Extract<EstadoEvidencia, 'Validado' | 'Rechazado'>,
      observaciones?: string,
    ) => {
      if (apiDisponible()) {
        try {
          await dictaminarEvidenciaApi(id, estado, observaciones)
        } catch {
          // Actualiza localmente si la API falla en prototipo
        }
      }
      persistir((prev) => ({
        ...prev,
        evidencias: prev.evidencias.map((evidencia) =>
          evidencia.id === id
            ? { ...evidencia, estado, observaciones: observaciones ?? evidencia.observaciones }
            : evidencia,
        ),
      }))
    },
    [persistir],
  )

  const valor = useMemo(
    () => ({
      datos,
      crearEvidencia,
      actualizarEvidencia,
      eliminarEvidencia,
      dictaminarEvidencia,
    }),
    [datos, crearEvidencia, actualizarEvidencia, eliminarEvidencia, dictaminarEvidencia],
  )

  return (
    <ContextoAlmacenSiac.Provider value={valor}>{children}</ContextoAlmacenSiac.Provider>
  )
}

export function usarAlmacen() {
  const contexto = useContext(ContextoAlmacenSiac)
  if (!contexto) {
    throw new Error('usarAlmacen debe usarse dentro de ProveedorAlmacen.')
  }
  return contexto
}

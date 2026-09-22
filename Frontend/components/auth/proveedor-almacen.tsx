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
import type { RolUsuario } from '@/lib/tipos'
import {
  listarEvidenciasApi,
  crearEvidenciaApi,
  dictaminarEvidenciaApi,
} from '@/lib/servicios/evidencias.servicio'
import { listarPlantillasApi } from '@/lib/servicios/plantillas.servicio'
import {
  listarVigenciasApi,
  listarNotificacionesApi,
  marcarNotificacionLeidaApi,
} from '@/lib/servicios/programas.servicio'
import type {
  AnexoVigencia,
  CarpetaNormativa,
  DocumentoRequerido,
  EtapaAcreditacion,
  Evidencia,
  EstadoEvidencia,
  Plantilla,
} from '@/lib/tipos'

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
  ) => void
  crearPlantilla: (plantilla: Omit<Plantilla, 'id'>) => void
  actualizarPlantilla: (id: string, cambios: Partial<Plantilla>) => void
  eliminarPlantilla: (id: string) => void
  crearAnexoVigencia: (anexo: Omit<AnexoVigencia, 'id'>) => void
  actualizarAnexoVigencia: (id: string, cambios: Partial<AnexoVigencia>) => void
  eliminarAnexoVigencia: (id: string) => void
  marcarAlertaLeida: (id: string) => void
  crearEtapa: (etapa: Omit<EtapaAcreditacion, 'id'>) => void
  actualizarEtapa: (id: string, cambios: Partial<EtapaAcreditacion>) => void
  eliminarEtapa: (id: string) => void
  crearCarpeta: (carpeta: Omit<CarpetaNormativa, 'id'>) => void
  actualizarCarpeta: (id: string, cambios: Partial<CarpetaNormativa>) => void
  eliminarCarpeta: (id: string) => void
  crearDocumentoRequerido: (documento: Omit<DocumentoRequerido, 'id'>) => void
  actualizarDocumentoRequerido: (id: string, cambios: Partial<DocumentoRequerido>) => void
  eliminarDocumentoRequerido: (id: string) => void
}

const ContextoAlmacenSiac = createContext<ContextoAlmacen | null>(null)

function generarId(prefijo: string): string {
  return `${prefijo}-${Date.now()}`
}

function leerRolSesion(): RolUsuario | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(CLAVE_SESION)
    if (!raw) return null
    return (JSON.parse(raw) as { rol?: RolUsuario }).rol ?? null
  } catch {
    return null
  }
}

function debeFusionarSemillaEvidencias(rol: RolUsuario | null): boolean {
  return rol !== 'Administrador' && rol !== 'SuperAdmin'
}

export function ProveedorAlmacen({ children }: { children: React.ReactNode }) {
  const [datos, setDatos] = useState<DatosPrototipo>(crearDatosIniciales)

  useEffect(() => {
    async function cargarDatos() {
      const local = leerAlmacenLocal() ?? crearDatosIniciales()

      if (apiDisponible()) {
        try {
          const [evResp, plantillas, anexos, alertas] = await Promise.all([
            listarEvidenciasApi({ limite: 100 }),
            listarPlantillasApi(),
            listarVigenciasApi(),
            listarNotificacionesApi().catch(() => []),
          ])

          const evidencias: Evidencia[] = evResp.datos.map((e) => ({
            id: e.id,
            nombre: e.nombre,
            programaId: e.programaId,
            periodo: e.periodo,
            factor: e.factor,
            indicador: e.indicador,
            estado: e.estado,
            autorId: e.autorId,
            nombreArchivo: e.nombreArchivo,
            fechaCarga: typeof e.fechaCarga === 'string'
              ? e.fechaCarga.slice(0, 10)
              : new Date().toISOString().slice(0, 10),
            observaciones: e.observaciones,
            responsable: e.responsable,
            version: e.version,
          }))

          const anexosMapeados: AnexoVigencia[] = (anexos as AnexoVigencia[]).map((a) => ({
            ...a,
            fechaVencimiento: typeof a.fechaVencimiento === 'string'
              ? a.fechaVencimiento.slice(0, 10)
              : a.fechaVencimiento,
          }))

          const alertasMapeadas = (alertas as { id: string; mensaje: string; leida: boolean; createdAt: string }[]).map(
            (a) => ({
              id: a.id,
              mensaje: a.mensaje,
              leida: a.leida,
              fecha: a.createdAt.slice(0, 10),
            }),
          )

          const iniciales = crearDatosIniciales()
          const rol = leerRolSesion()
          setDatos({
            ...local,
            evidencias: debeFusionarSemillaEvidencias(rol)
              ? fusionarEvidenciasConSemilla(evidencias, iniciales.evidencias)
              : evidencias,
            plantillas: fusionarPlantillasConSemilla(plantillas, iniciales.plantillas),
            anexosVigencia: anexosMapeados,
            alertas: alertasMapeadas.length > 0 ? alertasMapeadas : local.alertas,
          })
          return
        } catch {
          // Fallback a datos locales si la API no responde
        }
      }

      setDatos(local)
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

        const creada = await crearEvidenciaApi(formData)
        const mapeada: Evidencia = {
          id: creada.id,
          nombre: creada.nombre,
          programaId: creada.programaId,
          periodo: creada.periodo,
          factor: creada.factor,
          indicador: creada.indicador,
          estado: creada.estado,
          autorId: creada.autorId,
          nombreArchivo: creada.nombreArchivo,
          fechaCarga:
            typeof creada.fechaCarga === 'string'
              ? creada.fechaCarga.slice(0, 10)
              : new Date().toISOString().slice(0, 10),
          observaciones: creada.observaciones,
          responsable: creada.responsable,
        }
        persistir((prev) => ({ ...prev, evidencias: [mapeada, ...prev.evidencias] }))
        return
      }

      const nueva: Evidencia = {
        ...evidencia,
        id: generarId('ev'),
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
        evidencias: prev.evidencias.map((e) => (e.id === id ? { ...e, ...cambios } : e)),
      }))
    },
    [persistir],
  )

  const eliminarEvidencia = useCallback(
    (id: string) => {
      persistir((prev) => ({
        ...prev,
        evidencias: prev.evidencias.filter((e) => e.id !== id),
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
          // Continúa con actualización local
        }
      }
      persistir((prev) => ({
        ...prev,
        evidencias: prev.evidencias.map((e) =>
          e.id === id ? { ...e, estado, observaciones: observaciones ?? e.observaciones } : e,
        ),
      }))
    },
    [persistir],
  )

  const crearPlantilla = useCallback(
    (plantilla: Omit<Plantilla, 'id'>) => {
      persistir((prev) => ({
        ...prev,
        plantillas: [{ ...plantilla, id: generarId('plt') }, ...prev.plantillas],
      }))
    },
    [persistir],
  )

  const actualizarPlantilla = useCallback(
    (id: string, cambios: Partial<Plantilla>) => {
      persistir((prev) => ({
        ...prev,
        plantillas: prev.plantillas.map((p) => (p.id === id ? { ...p, ...cambios } : p)),
      }))
    },
    [persistir],
  )

  const eliminarPlantilla = useCallback(
    (id: string) => {
      persistir((prev) => ({
        ...prev,
        plantillas: prev.plantillas.filter((p) => p.id !== id),
      }))
    },
    [persistir],
  )

  const crearAnexoVigencia = useCallback(
    (anexo: Omit<AnexoVigencia, 'id'>) => {
      persistir((prev) => ({
        ...prev,
        anexosVigencia: [{ ...anexo, id: generarId('anx') }, ...prev.anexosVigencia],
      }))
    },
    [persistir],
  )

  const actualizarAnexoVigencia = useCallback(
    (id: string, cambios: Partial<AnexoVigencia>) => {
      persistir((prev) => ({
        ...prev,
        anexosVigencia: prev.anexosVigencia.map((a) =>
          a.id === id ? { ...a, ...cambios } : a,
        ),
      }))
    },
    [persistir],
  )

  const eliminarAnexoVigencia = useCallback(
    (id: string) => {
      persistir((prev) => ({
        ...prev,
        anexosVigencia: prev.anexosVigencia.filter((a) => a.id !== id),
      }))
    },
    [persistir],
  )

  const marcarAlertaLeida = useCallback(
    (id: string) => {
      persistir((prev) => ({
        ...prev,
        alertas: prev.alertas.map((a) => (a.id === id ? { ...a, leida: true } : a)),
      }))
      if (apiDisponible()) {
        marcarNotificacionLeidaApi(id).catch(() => {
          // El estado local ya refleja la lectura; reintentar en la próxima carga.
        })
      }
    },
    [persistir],
  )

  const crearEtapa = useCallback(
    (etapa: Omit<EtapaAcreditacion, 'id'>) => {
      persistir((prev) => ({
        ...prev,
        etapas: [...prev.etapas, { ...etapa, id: generarId('etapa') }],
      }))
    },
    [persistir],
  )

  const actualizarEtapa = useCallback(
    (id: string, cambios: Partial<EtapaAcreditacion>) => {
      persistir((prev) => ({
        ...prev,
        etapas: prev.etapas.map((e) => (e.id === id ? { ...e, ...cambios } : e)),
      }))
    },
    [persistir],
  )

  const eliminarEtapa = useCallback(
    (id: string) => {
      persistir((prev) => ({
        ...prev,
        etapas: prev.etapas.filter((e) => e.id !== id),
        carpetas: prev.carpetas.filter((c) => c.etapaId !== id),
        documentosRequeridos: prev.documentosRequeridos.filter((d) => {
          const carpeta = prev.carpetas.find((c) => c.id === d.carpetaId)
          return carpeta?.etapaId !== id
        }),
      }))
    },
    [persistir],
  )

  const crearCarpeta = useCallback(
    (carpeta: Omit<CarpetaNormativa, 'id'>) => {
      persistir((prev) => ({
        ...prev,
        carpetas: [...prev.carpetas, { ...carpeta, id: generarId('carp') }],
      }))
    },
    [persistir],
  )

  const actualizarCarpeta = useCallback(
    (id: string, cambios: Partial<CarpetaNormativa>) => {
      persistir((prev) => ({
        ...prev,
        carpetas: prev.carpetas.map((c) => (c.id === id ? { ...c, ...cambios } : c)),
      }))
    },
    [persistir],
  )

  const eliminarCarpeta = useCallback(
    (id: string) => {
      persistir((prev) => ({
        ...prev,
        carpetas: prev.carpetas.filter((c) => c.id !== id),
        documentosRequeridos: prev.documentosRequeridos.filter((d) => d.carpetaId !== id),
      }))
    },
    [persistir],
  )

  const crearDocumentoRequerido = useCallback(
    (documento: Omit<DocumentoRequerido, 'id'>) => {
      persistir((prev) => ({
        ...prev,
        documentosRequeridos: [
          ...prev.documentosRequeridos,
          { ...documento, id: generarId('doc') },
        ],
      }))
    },
    [persistir],
  )

  const actualizarDocumentoRequerido = useCallback(
    (id: string, cambios: Partial<DocumentoRequerido>) => {
      persistir((prev) => ({
        ...prev,
        documentosRequeridos: prev.documentosRequeridos.map((d) =>
          d.id === id ? { ...d, ...cambios } : d,
        ),
      }))
    },
    [persistir],
  )

  const eliminarDocumentoRequerido = useCallback(
    (id: string) => {
      persistir((prev) => ({
        ...prev,
        documentosRequeridos: prev.documentosRequeridos.filter((d) => d.id !== id),
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
      crearPlantilla,
      actualizarPlantilla,
      eliminarPlantilla,
      crearAnexoVigencia,
      actualizarAnexoVigencia,
      eliminarAnexoVigencia,
      marcarAlertaLeida,
      crearEtapa,
      actualizarEtapa,
      eliminarEtapa,
      crearCarpeta,
      actualizarCarpeta,
      eliminarCarpeta,
      crearDocumentoRequerido,
      actualizarDocumentoRequerido,
      eliminarDocumentoRequerido,
    }),
    [
      datos,
      crearEvidencia,
      actualizarEvidencia,
      eliminarEvidencia,
      dictaminarEvidencia,
      crearPlantilla,
      actualizarPlantilla,
      eliminarPlantilla,
      crearAnexoVigencia,
      actualizarAnexoVigencia,
      eliminarAnexoVigencia,
      marcarAlertaLeida,
      crearEtapa,
      actualizarEtapa,
      eliminarEtapa,
      crearCarpeta,
      actualizarCarpeta,
      eliminarCarpeta,
      crearDocumentoRequerido,
      actualizarDocumentoRequerido,
      eliminarDocumentoRequerido,
    ],
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

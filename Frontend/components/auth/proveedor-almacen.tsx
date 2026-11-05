'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'

import {
  crearDatosIniciales,
  guardarAlmacenLocal,
  leerAlmacenLocal,
  type DatosPrototipo,
} from '@/lib/almacen-prototipo'
import { apiDisponible } from '@/lib/servicios/cliente-api'
import {
  listarEvidenciasApi,
  crearEvidenciaApi,
} from '@/lib/servicios/evidencias.servicio'
import {
  crearPlantillaApi,
  eliminarPlantillaApi,
  listarPlantillasApi,
} from '@/lib/servicios/plantillas.servicio'
import {
  listarProgramasApi,
  listarVigenciasApi,
  listarNotificacionesApi,
  marcarNotificacionLeidaApi,
  marcarTodasNotificacionesLeidasApi,
} from '@/lib/servicios/programas.servicio'
import type {
  AlertaInApp,
  AnexoVigencia,
  CarpetaNormativa,
  DocumentoRequerido,
  EtapaAcreditacion,
  Evidencia,
  EstadoEvidencia,
  Plantilla,
} from '@/lib/tipos'
import { usarSesion } from '@/components/auth/proveedor-sesion'
import { suscribirProgramasActualizados } from '@/lib/utilidades/eventos-programas'
import { mapearEvidenciaDesdeApi } from '@/lib/utilidades-siac'

/** Listas que el proveedor sincroniza con la API, cada una con su propia petición. */
export type ListaAlmacen = 'evidencias' | 'plantillas' | 'anexosVigencia' | 'alertas' | 'programas'

export const LISTAS_ALMACEN: readonly ListaAlmacen[] = [
  'evidencias',
  'plantillas',
  'anexosVigencia',
  'alertas',
  'programas',
]

/** Estado de carga de una lista: `cargando` mientras hay una petición en curso y `error` si falló. */
export interface EstadoLista {
  cargando: boolean
  error: string | null
}

export type EstadoListas = Record<ListaAlmacen, EstadoLista>

interface ContextoAlmacen {
  datos: DatosPrototipo
  /** Estado de carga y error por lista (evidencias, plantillas, vigencias, alertas, programas). */
  estadoListas: EstadoListas
  /** Vuelve a pedir una lista a la API (con un reintento automático si falla). */
  recargarLista: (lista: ListaAlmacen) => Promise<void>
  crearEvidencia: (
    evidencia: Omit<Evidencia, 'id' | 'fechaCarga' | 'estado'>,
    archivo?: File,
    opciones?: { requiereChecklistMaestro?: boolean; codigoGuia?: string },
  ) => Promise<Evidencia>
  actualizarEvidencia: (id: string, cambios: Partial<Evidencia>) => void
  eliminarEvidencia: (id: string) => void
  dictaminarEvidencia: (
    id: string,
    resultado: {
      estado: Extract<EstadoEvidencia, 'Cumple' | 'ConObservaciones' | 'Validado' | 'Rechazado'>
      observaciones?: string
      puntajeActual?: number | null
      totalCondicionesActual?: number | null
    },
  ) => void
  crearPlantilla: (
    plantilla: Omit<Plantilla, 'id'>,
    archivo?: File,
  ) => Promise<Plantilla>
  actualizarPlantilla: (id: string, cambios: Partial<Plantilla>) => void
  eliminarPlantilla: (id: string) => Promise<void>
  crearAnexoVigencia: (anexo: Omit<AnexoVigencia, 'id'>) => void
  actualizarAnexoVigencia: (id: string, cambios: Partial<AnexoVigencia>) => void
  eliminarAnexoVigencia: (id: string) => void
  marcarAlertaLeida: (id: string) => void
  marcarTodasAlertasLeidas: () => void
  recargarAlertas: () => Promise<void>
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

function mapearMetadataNotificacion(
  crudo: Record<string, unknown> | null | undefined,
): AlertaInApp['metadata'] {
  if (!crudo || typeof crudo !== 'object') return null
  const meta: AlertaInApp['metadata'] = {}
  if (typeof crudo.evidenciaId === 'string') meta.evidenciaId = crudo.evidenciaId
  if (typeof crudo.programaId === 'string') meta.programaId = crudo.programaId
  if (typeof crudo.anexoId === 'string') meta.anexoId = crudo.anexoId
  if (typeof crudo.umbral === 'string') meta.umbral = crudo.umbral
  if (typeof crudo.avance === 'number') meta.avance = crudo.avance
  return Object.keys(meta).length > 0 ? meta : null
}

function mapearAlertasDesdeApi(
  alertas: {
    id: string
    mensaje: string
    leida: boolean
    createdAt: string
    tipo?: string
    metadata?: Record<string, unknown> | null
  }[],
) {
  return alertas.map((a) => ({
    id: a.id,
    mensaje: a.mensaje,
    leida: a.leida,
    tipo: a.tipo,
    fecha: a.createdAt.slice(0, 10),
    createdAt: a.createdAt,
    metadata: mapearMetadataNotificacion(a.metadata),
  }))
}

const MENSAJES_ERROR_LISTA: Record<ListaAlmacen, string> = {
  evidencias: 'No se pudieron cargar las evidencias.',
  plantillas: 'No se pudieron cargar las plantillas.',
  anexosVigencia: 'No se pudieron cargar las vigencias.',
  alertas: 'No se pudieron cargar las notificaciones.',
  programas: 'No se pudieron cargar los programas.',
}

function crearEstadoListas(cargando: boolean): EstadoListas {
  return Object.fromEntries(
    LISTAS_ALMACEN.map((lista) => [lista, { cargando, error: null }]),
  ) as EstadoListas
}

/** Cada lista se pide por separado; así una petición lenta no retrasa a las demás. */
const cargadoresListas: { [K in ListaAlmacen]: () => Promise<DatosPrototipo[K]> } = {
  // Sincronización inicial para KPIs; los listados tabulares usan paginación propia (10).
  evidencias: async () => {
    const respuesta = await listarEvidenciasApi({ limite: 100 })
    return respuesta.datos.map((e) => mapearEvidenciaDesdeApi(e))
  },
  plantillas: () => listarPlantillasApi(),
  anexosVigencia: async () => {
    const anexos = (await listarVigenciasApi()) as AnexoVigencia[]
    return anexos.map((a) => ({
      ...a,
      fechaVencimiento:
        typeof a.fechaVencimiento === 'string'
          ? a.fechaVencimiento.slice(0, 10)
          : a.fechaVencimiento,
    }))
  },
  alertas: async () => mapearAlertasDesdeApi(await listarNotificacionesApi()),
  programas: () => listarProgramasApi(),
}

/** Ejecuta la petición y, si falla, la repite una sola vez antes de propagar el error. */
async function conUnReintento<T>(peticion: () => Promise<T>): Promise<T> {
  try {
    return await peticion()
  } catch {
    return peticion()
  }
}

function generarId(prefijo: string): string {
  return `${prefijo}-${Date.now()}`
}

export function ProveedorAlmacen({ children }: { children: React.ReactNode }) {
  const { sesion } = usarSesion()
  const [datos, setDatos] = useState<DatosPrototipo>(crearDatosIniciales)

  const [estadoListas, setEstadoListas] = useState<EstadoListas>(() =>
    crearEstadoListas(apiDisponible()),
  )
  // Contador por lista: si llegan respuestas fuera de orden, solo cuenta la última petición.
  const versionesCarga = useRef<Record<ListaAlmacen, number>>(
    Object.fromEntries(LISTAS_ALMACEN.map((lista) => [lista, 0])) as Record<ListaAlmacen, number>,
  )

  const actualizarEstadoLista = useCallback((lista: ListaAlmacen, estado: EstadoLista) => {
    setEstadoListas((prev) => ({ ...prev, [lista]: estado }))
  }, [])

  /**
   * Pide una lista a la API y la publica en cuanto llega, sin esperar a las demás.
   * `silencioso` (sondeo de alertas, evento de programas) no muestra «Cargando…», pero sí
   * registra el error para que la vista ofrezca reintentar.
   */
  const cargarLista = useCallback(
    async (lista: ListaAlmacen, opciones: { silencioso?: boolean } = {}) => {
      if (!apiDisponible()) return
      const version = ++versionesCarga.current[lista]
      if (!opciones.silencioso) {
        actualizarEstadoLista(lista, { cargando: true, error: null })
      }
      try {
        const cargador: () => Promise<DatosPrototipo[ListaAlmacen]> = cargadoresListas[lista]
        const valor = await conUnReintento(cargador)
        if (version !== versionesCarga.current[lista]) return
        setDatos((prev) => ({ ...prev, [lista]: valor }))
        actualizarEstadoLista(lista, { cargando: false, error: null })
      } catch {
        if (version !== versionesCarga.current[lista]) return
        actualizarEstadoLista(lista, { cargando: false, error: MENSAJES_ERROR_LISTA[lista] })
      }
    },
    [actualizarEstadoLista],
  )

  const cargarDatos = useCallback(async () => {
    const local = leerAlmacenLocal() ?? crearDatosIniciales()

    if (!apiDisponible()) {
      setDatos({
        ...local,
        evidencias: [],
        plantillas: [],
      })
      setEstadoListas(crearEstadoListas(false))
      return
    }

    if (!sesion?.usuarioId) {
      return
    }

    // Las listas de la API empiezan vacías y se rellenan una a una al resolver cada petición.
    setDatos({
      ...local,
      programas: [],
      evidencias: [],
      plantillas: [],
      anexosVigencia: [],
      alertas: [],
    })
    await Promise.all(LISTAS_ALMACEN.map((lista) => cargarLista(lista)))
  }, [sesion?.usuarioId, cargarLista])

  useEffect(() => {
    if (!sesion?.usuarioId) {
      if (!apiDisponible()) {
        setDatos(leerAlmacenLocal() ?? crearDatosIniciales())
      }
      return
    }
    void cargarDatos()
  }, [sesion?.usuarioId, cargarDatos])

  const recargarLista = useCallback(
    (lista: ListaAlmacen) => cargarLista(lista),
    [cargarLista],
  )

  const recargarAlertas = useCallback(
    () => cargarLista('alertas', { silencioso: true }),
    [cargarLista],
  )

  useEffect(() => {
    if (!apiDisponible()) return
    const intervalo = window.setInterval(() => {
      if (!sesion?.usuarioId) return
      void recargarAlertas()
    }, 60_000)
    return () => window.clearInterval(intervalo)
  }, [recargarAlertas, sesion?.usuarioId])

  useEffect(() => {
    return suscribirProgramasActualizados(() => {
      void cargarLista('programas', { silencioso: true })
    })
  }, [cargarLista])

  const persistir = useCallback((actualizador: (prev: DatosPrototipo) => DatosPrototipo) => {
    setDatos((prev) => {
      const actualizado = actualizador(prev)
      guardarAlmacenLocal(actualizado)
      return actualizado
    })
  }, [])

  const crearEvidencia = useCallback(
    async (
      evidencia: Omit<Evidencia, 'id' | 'fechaCarga' | 'estado'>,
      archivo?: File,
      opciones?: { requiereChecklistMaestro?: boolean; codigoGuia?: string },
    ) => {
      if (!apiDisponible()) {
        throw new Error('Las evidencias solo se pueden cargar con la API disponible.')
      }
      if (!archivo) {
        throw new Error('Selecciona el archivo de la evidencia.')
      }
      const formData = new FormData()
      formData.append('nombre', evidencia.nombre)
      if (evidencia.programaId) {
        formData.append('programaId', evidencia.programaId)
      }
      formData.append('periodo', evidencia.periodo)
      formData.append('archivo', archivo)
      if (opciones?.codigoGuia) {
        formData.append('codigoGuia', opciones.codigoGuia)
      } else if (opciones?.requiereChecklistMaestro) {
        formData.append('requiereChecklistMaestro', 'true')
      }

      const creada = await crearEvidenciaApi(formData)
      const mapeada = mapearEvidenciaDesdeApi(creada)
      persistir((prev) => ({ ...prev, evidencias: [mapeada, ...prev.evidencias] }))
      return mapeada
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

  /**
   * §5.4: solo actualiza el estado local. La petición POST /evidencias/:id/dictamen
   * la hace la página del revisor (`dictaminarEvidenciaApi`) una sola vez.
   */
  const dictaminarEvidencia = useCallback(
    (
      id: string,
      resultado: {
        estado: Extract<EstadoEvidencia, 'Cumple' | 'ConObservaciones' | 'Validado' | 'Rechazado'>
        observaciones?: string
        puntajeActual?: number | null
        totalCondicionesActual?: number | null
      },
    ) => {
      persistir((prev) => ({
        ...prev,
        evidencias: prev.evidencias.map((e) =>
          e.id === id
            ? {
                ...e,
                estado: resultado.estado,
                observaciones: resultado.observaciones ?? e.observaciones,
                puntajeActual: resultado.puntajeActual ?? e.puntajeActual,
                totalCondicionesActual:
                  resultado.totalCondicionesActual ?? e.totalCondicionesActual,
              }
            : e,
        ),
      }))
    },
    [persistir],
  )

  const crearPlantilla = useCallback(
    async (plantilla: Omit<Plantilla, 'id'>, archivo?: File) => {
      if (!apiDisponible()) {
        throw new Error('Las plantillas solo se pueden crear con la API disponible.')
      }
      if (!archivo) {
        throw new Error('Selecciona un archivo .docx para la plantilla.')
      }
      const formData = new FormData()
      formData.append('nombre', plantilla.nombre)
      formData.append('codigoGuia', plantilla.codigoGuia)
      formData.append('formato', 'DOCX')
      formData.append('version', plantilla.version)
      formData.append('categoria', plantilla.categoria)
      if (plantilla.descripcion) formData.append('descripcion', plantilla.descripcion)
      if (plantilla.tipoTramite) formData.append('tipoTramite', plantilla.tipoTramite)
      if (plantilla.esGuiaDocumentoMaestro) {
        formData.append('esGuiaDocumentoMaestro', 'true')
      }
      formData.append('archivo', archivo)
      const creada = await crearPlantillaApi(formData)
      persistir((prev) => ({
        ...prev,
        plantillas: [creada, ...prev.plantillas.filter((p) => p.id !== creada.id)],
      }))
      return creada
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
    async (id: string) => {
      if (apiDisponible()) {
        try {
          await eliminarPlantillaApi(id)
        } catch {
          // Continúa con eliminación local
        }
      }
      persistir((prev) => ({
        ...prev,
        plantillas: prev.plantillas.map((p) =>
          p.id === id ? { ...p, vigente: false } : p,
        ),
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

  const marcarTodasAlertasLeidas = useCallback(() => {
    persistir((prev) => ({
      ...prev,
      alertas: prev.alertas.map((a) => ({ ...a, leida: true })),
    }))
    if (apiDisponible()) {
      marcarTodasNotificacionesLeidasApi().catch(() => {})
    }
  }, [persistir])

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
      estadoListas,
      recargarLista,
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
      marcarTodasAlertasLeidas,
      recargarAlertas,
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
      estadoListas,
      recargarLista,
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
      marcarTodasAlertasLeidas,
      recargarAlertas,
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

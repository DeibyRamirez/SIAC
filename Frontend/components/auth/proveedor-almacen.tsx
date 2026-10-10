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
  guardarAlmacenLocal,
  leerAlmacenLocal,
  type DatosPrototipo,
} from '@/lib/almacen-prototipo'
import { apiDisponible } from '@/lib/servicios/cliente-api'
import {
  listarEvidenciasApi,
  crearEvidenciaApi,
  dictaminarEvidenciaApi,
  type CondicionDictamenPayload,
  type PuntajeVerificacion,
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
import { suscribirProgramasActualizados } from '@/lib/utilidades/eventos-programas'
import { mapearEvidenciaDesdeApi } from '@/lib/utilidades-siac'

interface ContextoAlmacen {
  datos: DatosPrototipo
  crearEvidencia: (
    evidencia: Omit<Evidencia, 'id' | 'fechaCarga' | 'estado'>,
    archivo?: File,
    opciones?: { requiereChecklistMaestro?: boolean; codigoGuia?: string },
  ) => Promise<Evidencia>
  actualizarEvidencia: (id: string, cambios: Partial<Evidencia>) => void
  eliminarEvidencia: (id: string) => void
  dictaminarEvidencia: (
    id: string,
    estado: Exclude<EstadoEvidencia, 'Borrador' | 'EnRevision'>,
    observaciones?: string,
    condiciones?: CondicionDictamenPayload[],
    puntaje?: PuntajeVerificacion,
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

export function ProveedorAlmacen({ children }: { children: React.ReactNode }) {
  const [datos, setDatos] = useState<DatosPrototipo>(crearDatosIniciales)

  useEffect(() => {
    async function cargarDatos() {
      const local = leerAlmacenLocal() ?? crearDatosIniciales()

      if (apiDisponible()) {
        const [evResult, plantillasResult, anexosResult, alertasResult, programasResult] =
          await Promise.allSettled([
            // Sincronización inicial para KPIs; los listados tabulares usan paginación propia (10).
            listarEvidenciasApi({ limite: 100 }),
            listarPlantillasApi(),
            listarVigenciasApi(),
            listarNotificacionesApi(),
            listarProgramasApi(),
          ])

        const evResp =
          evResult.status === 'fulfilled'
            ? evResult.value
            : { datos: [] as Evidencia[], total: 0, pagina: 1, limite: 100 }
        const plantillas =
          plantillasResult.status === 'fulfilled' ? plantillasResult.value : []
        const anexos = anexosResult.status === 'fulfilled' ? anexosResult.value : []
        const alertas =
          alertasResult.status === 'fulfilled' ? alertasResult.value : []
        const programas =
          programasResult.status === 'fulfilled' ? programasResult.value : []

        const evidencias: Evidencia[] = evResp.datos.map((e) => mapearEvidenciaDesdeApi(e))

        const anexosMapeados: AnexoVigencia[] = (anexos as AnexoVigencia[]).map((a) => ({
          ...a,
          fechaVencimiento: typeof a.fechaVencimiento === 'string'
            ? a.fechaVencimiento.slice(0, 10)
            : a.fechaVencimiento,
        }))

        const alertasMapeadas = (
          alertas as { id: string; mensaje: string; leida: boolean; createdAt: string }[]
        ).map((a) => ({
          id: a.id,
          mensaje: a.mensaje,
          leida: a.leida,
          fecha: a.createdAt.slice(0, 10),
        }))

        setDatos({
          ...local,
          programas,
          evidencias,
          plantillas,
          anexosVigencia: anexosMapeados,
          alertas: alertasMapeadas,
        })
        return
      }

      setDatos({
        ...local,
        evidencias: [],
        plantillas: [],
      })
    }

    cargarDatos()
  }, [])

  useEffect(() => {
    return suscribirProgramasActualizados(() => {
      if (!apiDisponible()) return
      void listarProgramasApi().then((programas) => {
        setDatos((prev) => ({ ...prev, programas }))
      })
    })
  }, [])

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

  const dictaminarEvidencia = useCallback(
    async (
      id: string,
      estado: Exclude<EstadoEvidencia, 'Borrador' | 'EnRevision'>,
      observaciones?: string,
      condiciones?: CondicionDictamenPayload[],
      puntaje?: PuntajeVerificacion,
    ) => {
      if (apiDisponible()) {
        try {
          await dictaminarEvidenciaApi(id, {
            estado:
              condiciones?.length || (estado !== 'Validado' && estado !== 'Rechazado')
                ? undefined
                : estado,
            observaciones,
            condiciones,
          })
        } catch {
          // Continúa con actualización local
        }
      }
      persistir((prev) => ({
        ...prev,
        evidencias: prev.evidencias.map((e) =>
          e.id === id
            ? {
                ...e,
                estado,
                observaciones: observaciones ?? e.observaciones,
                puntajeActual: puntaje?.puntajeActual ?? e.puntajeActual,
                totalCondicionesActual:
                  puntaje?.totalCondicionesActual ?? e.totalCondicionesActual,
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

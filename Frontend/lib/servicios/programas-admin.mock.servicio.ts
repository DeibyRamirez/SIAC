import {
  crearDatosSemilla,
  entidadAFilaPanel,
  entidadAPrograma,
  construirProgreso,
  sincronizarMetricas,
  ID_INSTITUCION_MOCK,
  type EntidadMockAdmin,
} from '@/lib/datos-mock/programas-admin.mock'
import type { FilaPanelPrograma, RespuestaPanelProgramas } from '@/lib/servicios/panel-programas.servicio'
import type { ProgresoProcesoSIAC } from '@/lib/servicios/progreso-programa.servicio'
import type { NivelPrograma, Programa, SemaforoPrograma } from '@/lib/tipos'
import type { TipoTramiteSIAC } from '@/lib/utilidades/catalogo-tramites-siac'

const CLAVE_STORAGE = 'siac-programas-mock-v1'

let cacheMemoria: EntidadMockAdmin[] | null = null

function cargarEntidades(): EntidadMockAdmin[] {
  if (cacheMemoria) return cacheMemoria

  if (typeof window !== 'undefined') {
    try {
      const guardado = localStorage.getItem(CLAVE_STORAGE)
      if (guardado) {
        cacheMemoria = JSON.parse(guardado) as EntidadMockAdmin[]
        return cacheMemoria
      }
    } catch {
      /* usar semilla */
    }
  }

  cacheMemoria = crearDatosSemilla()
  persistir()
  return cacheMemoria
}

function persistir(): void {
  if (typeof window === 'undefined' || !cacheMemoria) return
  try {
    localStorage.setItem(CLAVE_STORAGE, JSON.stringify(cacheMemoria))
  } catch {
    /* quota o modo privado */
  }
}

function obtenerEntidad(id: string): EntidadMockAdmin | undefined {
  return cargarEntidades().find((e) => e.id === id)
}

function actualizarEntidad(id: string, cambios: Partial<EntidadMockAdmin>): EntidadMockAdmin {
  const entidades = cargarEntidades()
  const indice = entidades.findIndex((e) => e.id === id)
  if (indice < 0) throw new Error('Entidad no encontrada.')

  const actualizada = sincronizarMetricas({ ...entidades[indice], ...cambios })
  entidades[indice] = actualizada
  persistir()
  return actualizada
}

export type FiltroEstadoPrograma = 'activos' | 'inactivos' | 'todos'

export interface FiltrosPanelMock {
  page?: number
  limit?: number
  tramite?: TipoTramiteSIAC
  semaforo?: SemaforoPrograma
  semestre?: string
  estado?: FiltroEstadoPrograma
  busqueda?: string
}

export async function listarPanelProgramasMock(
  filtros: FiltrosPanelMock = {},
): Promise<RespuestaPanelProgramas> {
  const page = filtros.page ?? 1
  const limit = filtros.limit ?? 12
  const estado = filtros.estado ?? 'activos'

  let programas = cargarEntidades().filter((e) => e.alcance === 'Programa')

  if (estado === 'activos') {
    programas = programas.filter((e) => e.activo !== false)
  } else if (estado === 'inactivos') {
    programas = programas.filter((e) => e.activo === false)
  }

  if (filtros.tramite) {
    programas = programas.filter((e) => e.tipoTramite === filtros.tramite)
  }

  if (filtros.semaforo) {
    programas = programas.filter((e) => e.semaforoGeneral === filtros.semaforo)
  }

  if (filtros.busqueda?.trim()) {
    const texto = filtros.busqueda.toLowerCase()
    programas = programas.filter(
      (e) =>
        e.nombre.toLowerCase().includes(texto) ||
        e.codigo.toLowerCase().includes(texto) ||
        (e.facultad?.toLowerCase().includes(texto) ?? false),
    )
  }

  const total = programas.length
  const inicio = (page - 1) * limit
  const paginados = programas.slice(inicio, inicio + limit).map(entidadAFilaPanel)

  return {
    datos: paginados,
    total,
    page,
    limit,
    totalPaginas: Math.max(1, Math.ceil(total / limit)),
  }
}

export async function obtenerInstitucionMock(): Promise<FilaPanelPrograma> {
  const institucion = obtenerEntidad(ID_INSTITUCION_MOCK)
  if (!institucion) throw new Error('Institución no encontrada.')
  return entidadAFilaPanel(institucion)
}

export async function obtenerProgramaMock(id: string): Promise<
  Programa & {
    fechaResolucion?: string | null
    tipoTramite?: TipoTramiteSIAC
    alcance?: 'Programa' | 'Institucion'
    evidencias?: { estado: string }[]
    anexos?: { estado: string }[]
  }
> {
  const entidad = obtenerEntidad(id)
  if (!entidad) throw new Error('Programa no encontrado.')
  return {
    ...entidadAPrograma(entidad),
    evidencias: [],
    anexos: [],
  }
}

export async function obtenerProgresoProgramaMock(programaId: string): Promise<ProgresoProcesoSIAC> {
  const entidad = obtenerEntidad(programaId)
  if (!entidad) throw new Error('Programa no encontrado.')
  return construirProgreso(entidad)
}

export interface CrearProgramaMockDto {
  nombre: string
  nivel: NivelPrograma
  facultad?: string
  tipoTramite: TipoTramiteSIAC
}

export async function crearProgramaMock(dto: CrearProgramaMockDto): Promise<Programa> {
  const entidades = cargarEntidades()
  const slug = dto.nombre
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

  const codigo = dto.nombre
    .split(/\s+/)
    .map((p) => p.slice(0, 3).toUpperCase())
    .join('-')
    .slice(0, 12)

  const nueva = sincronizarMetricas({
    id: `prog-${slug}-${Date.now()}`,
    nombre: dto.nombre.trim(),
    codigo,
    nivel: dto.nivel,
    semaforo: 'Rojo',
    porcentajeAvance: 0,
    estadoProceso: 'En progreso',
    facultad: dto.facultad ?? null,
    slug,
    activo: true,
    alcance: 'Programa',
    tipoTramite: dto.tipoTramite,
    fechaResolucion: null,
    documentosInternos: { G1: 0, G2: 0, G3: 0, G4: 0 },
    semaforoAvance: 'Rojo',
    semaforoVigencia: 'Verde',
    semaforoGeneral: 'Rojo',
  })

  entidades.push(nueva)
  persistir()
  return entidadAPrograma(nueva)
}

export async function actualizarProgramaMock(
  id: string,
  datos: {
    nombre?: string
    facultad?: string
    nivel?: NivelPrograma
    tipoTramiteActivo?: TipoTramiteSIAC
  },
): Promise<Programa> {
  const actualizada = actualizarEntidad(id, {
    nombre: datos.nombre,
    facultad: datos.facultad,
    nivel: datos.nivel,
    tipoTramite: datos.tipoTramiteActivo,
  })
  return entidadAPrograma(actualizada)
}

export async function actualizarEstadoProgramaMock(id: string, activo: boolean): Promise<Programa> {
  const actualizada = actualizarEntidad(id, { activo })
  return entidadAPrograma(actualizada)
}

export async function activarVigenciaMock(id: string): Promise<Programa> {
  const entidad = obtenerEntidad(id)
  if (!entidad) throw new Error('Entidad no encontrada.')
  if (entidad.porcentajeAvance < 100) {
    throw new Error('El proceso documental debe estar al 100% antes de activar la vigencia.')
  }
  if (entidad.fechaResolucion) {
    throw new Error('La vigencia ya está activa.')
  }

  const actualizada = actualizarEntidad(id, {
    fechaResolucion: new Date().toISOString(),
  })
  return entidadAPrograma(actualizada)
}

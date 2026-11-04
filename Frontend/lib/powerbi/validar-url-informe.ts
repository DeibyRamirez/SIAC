/**
 * Validación estricta de enlaces de informe Power BI (HU-009).
 * Mantener la misma regla en Backend/src/powerbi/validar-url-informe.ts.
 *
 * Solo https y el host app.powerbi.com, sin usuario, contraseña, puerto ni
 * fragmento. La ruta es /view (parámetro r) o /reportEmbed (reportId y ctid
 * GUID obligatorios, groupId GUID opcional, autoAuth opcional y solo "true").
 * Cualquier otro host, ruta, esquema o parámetro se rechaza.
 */

const HOST = 'app.powerbi.com'
const RUTAS = new Set(['/view', '/reportEmbed'])
const RE_GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const RE_CLAVE = /^[A-Za-z][A-Za-z0-9]*$/

export type TipoEnlaceInformePowerBi = 'publico' | 'seguro'

export interface EnlaceInformePowerBi {
  tipo: TipoEnlaceInformePowerBi
  url: string
}

export function analizarUrlInformePowerBi(
  valor: string | null | undefined,
): EnlaceInformePowerBi | null {
  const limpia = valor?.trim() ?? ''
  if (!limpia || !/^https:\/\//i.test(limpia)) return null
  if (/[\s\\<>"'`]/.test(limpia) || limpia.includes('#')) return null
  if (/[\u0000-\u001f\u007f]/.test(limpia)) return null

  let analizada: URL
  try {
    analizada = new URL(limpia)
  } catch {
    return null
  }

  if (analizada.protocol !== 'https:') return null
  if (analizada.username !== '' || analizada.password !== '') return null
  if (analizada.hostname !== HOST || analizada.port !== '') return null
  if (analizada.hash !== '') return null

  const despuesDelEsquema = limpia.slice(limpia.indexOf('://') + 3)
  const corteAutoridad = despuesDelEsquema.search(/[/?#]/)
  if (corteAutoridad <= 0) return null
  const autoridad = despuesDelEsquema.slice(0, corteAutoridad)
  if (autoridad.toLowerCase() !== HOST) return null

  const resto = despuesDelEsquema.slice(corteAutoridad)
  const corteConsulta = resto.indexOf('?')
  const ruta = corteConsulta === -1 ? resto : resto.slice(0, corteConsulta)
  if (ruta !== analizada.pathname || !RUTAS.has(ruta)) return null

  const consulta = corteConsulta === -1 ? '' : resto.slice(corteConsulta + 1)
  const parametros = leerParametros(consulta)
  if (!parametros) return null

  if (ruta === '/view') {
    if (parametros.size !== 1 || !parametros.has('r')) return null
    const token = parametros.get('r') ?? ''
    if (!token || /[\s<>"'\\]/.test(token)) return null
    return { tipo: 'publico', url: limpia }
  }

  const reportId = parametros.get('reportId')
  const ctid = parametros.get('ctid')
  if (!reportId || !ctid || !esGuid(reportId) || !esGuid(ctid)) return null

  const permitidas = new Set(['reportId', 'ctid'])
  if (parametros.has('groupId')) {
    const groupId = parametros.get('groupId') ?? ''
    if (!esGuid(groupId)) return null
    permitidas.add('groupId')
  }
  if (parametros.has('autoAuth')) {
    if (parametros.get('autoAuth') !== 'true') return null
    permitidas.add('autoAuth')
  }
  for (const clave of parametros.keys()) {
    if (!permitidas.has(clave)) return null
  }
  return { tipo: 'seguro', url: limpia }
}

export function clasificarUrlInformePowerBi(
  valor: string | null | undefined,
): TipoEnlaceInformePowerBi | null {
  return analizarUrlInformePowerBi(valor)?.tipo ?? null
}

/** Acepta la URL limpia o el HTML del iframe pegado desde Power BI. */
export function prepararUrlInformePowerBi(valor: string | null | undefined): string {
  const crudo = valor?.trim() ?? ''
  if (!crudo) return ''

  const directo = analizarUrlInformePowerBi(crudo)
  if (directo) return directo.url

  const srcs = extraerSrc(crudo)
  if (srcs.length > 0) {
    return analizarUrlInformePowerBi(decodificarEntidadesHtml(srcs[0]))?.url ?? ''
  }

  if (/^[a-z][a-z0-9+.-]*:/i.test(crudo) || /<[a-z!/]/i.test(crudo)) return ''

  const coincidencias =
    crudo.match(/https:\/\/app\.powerbi\.com\/(?:view|reportEmbed)\?[^\s"'<>]+/gi) ?? []
  if (coincidencias.length !== 1) return ''
  return analizarUrlInformePowerBi(coincidencias[0])?.url ?? ''
}

function esGuid(valor: string): boolean {
  return RE_GUID.test(valor)
}

function leerParametros(consulta: string): Map<string, string> | null {
  if (!consulta) return new Map()
  const mapa = new Map<string, string>()
  for (const par of consulta.split('&')) {
    if (!par) return null
    const eq = par.indexOf('=')
    if (eq <= 0) return null
    const clave = par.slice(0, eq)
    const valorCrudo = par.slice(eq + 1)
    if (!RE_CLAVE.test(clave) || mapa.has(clave)) return null
    let valor: string
    try {
      valor = decodeURIComponent(valorCrudo.replace(/\+/g, '%2B'))
    } catch {
      return null
    }
    mapa.set(clave, valor)
  }
  return mapa
}

function extraerSrc(html: string): string[] {
  const encontrados: string[] = []
  const patron = /\ssrc\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi
  let coincidencia: RegExpExecArray | null
  while ((coincidencia = patron.exec(html)) !== null) {
    const src = (coincidencia[1] ?? coincidencia[2] ?? coincidencia[3] ?? '').trim()
    if (src) encontrados.push(src)
  }
  return encontrados
}

function decodificarEntidadesHtml(valor: string): string {
  return valor
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#0*39;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
}

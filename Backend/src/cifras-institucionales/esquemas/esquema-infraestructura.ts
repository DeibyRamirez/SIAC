import { ESTADOS_INFRAESTRUCTURA } from './enums';
import { EsquemaCategoriaCifras } from './tipos';

const entero = (clave: string, encabezado: string, campoPrisma: string, alias?: string[]) => ({
  encabezado,
  clave,
  tipo: 'entero' as const,
  obligatoria: true,
  min: 0,
  alias,
  campoPrisma,
});

const decimal = (clave: string, encabezado: string, campoPrisma: string, alias?: string[]) => ({
  encabezado,
  clave,
  tipo: 'decimal' as const,
  obligatoria: true,
  min: 0,
  alias,
  campoPrisma,
});

export const ESQUEMA_INFRAESTRUCTURA: EsquemaCategoriaCifras = {
  categoriaId: 'infraestructura',
  hoja: 'infraestructura',
  titulo: 'Infraestructura',
  claveReemplazo: 'sede',
  columnas: [
    {
      encabezado: 'Sede',
      clave: 'sede',
      tipo: 'texto',
      obligatoria: true,
      maxCaracteres: 200,
      campoPrisma: 'sede',
    },
    {
      encabezado: 'Dirección',
      clave: 'direccion',
      tipo: 'texto',
      obligatoria: true,
      maxCaracteres: 400,
      campoPrisma: 'direccion',
    },
    entero('numero_pisos', 'Número de pisos', 'numeroPisos', ['numero de pisos']),
    {
      encabezado: 'Estado',
      clave: 'estado',
      tipo: 'enum',
      obligatoria: true,
      enum: ESTADOS_INFRAESTRUCTURA,
      campoPrisma: 'estado',
    },
    decimal('total_m2_area_construida', 'Área construida total (m²)', 'totalM2AreaConstruida', [
      'total m2 area construida',
    ]),
    decimal('total_m2_area_terreno', 'Área de terreno total (m²)', 'totalM2AreaTerreno', [
      'total m2 area terreno',
    ]),
    entero('cantidad_salones_clase', 'Cantidad de salones de clase', 'cantidadSalonesClase', [
      'cantidad salones de clase',
    ]),
    decimal('area_m2_salon_clase', 'Área de salones de clase (m²)', 'areaM2SalonClase', [
      'area m2 salon de clase',
    ]),
    entero('cantidad_salas_sistemas', 'Cantidad de salas de sistemas', 'cantidadSalasSistemas', [
      'cantidad salas de sistemas',
    ]),
    decimal('area_m2_salas_sistemas', 'Área de salas de sistemas (m²)', 'areaM2SalasSistemas', [
      'area m2 salas de sistemas',
    ]),
    entero('cantidad_laboratorios', 'Cantidad de laboratorios', 'cantidadLaboratorios', [
      'cantidad laboratorios',
    ]),
    decimal('area_m2_laboratorios', 'Área de laboratorios (m²)', 'areaM2Laboratorios', [
      'area m2 laboratorios',
    ]),
    entero('cantidad_auditorios', 'Cantidad de auditorios', 'cantidadAuditorios', [
      'cantidad auditorios',
    ]),
    decimal('area_m2_auditorios', 'Área de auditorios (m²)', 'areaM2Auditorios', [
      'area m2 auditorios',
    ]),
    entero('cantidad_salas_lectura', 'Cantidad de salas de lectura', 'cantidadSalasLectura', [
      'cantidad salas de lectura',
    ]),
    decimal('area_m2_salas_lectura', 'Área de salas de lectura (m²)', 'areaM2SalasLectura', [
      'area m2 salas de lectura',
    ]),
    entero('cantidad_zonas_deportivas', 'Cantidad de zonas deportivas', 'cantidadZonasDeportivas', [
      'cantidad zonas deportivas',
    ]),
    decimal('area_m2_zonas_deportivas', 'Área de zonas deportivas (m²)', 'areaM2ZonasDeportivas', [
      'area m2 zonas deportivas',
    ]),
    entero('cantidad_cafeterias', 'Cantidad de cafeterías', 'cantidadCafeterias', [
      'cantidad cafeterias',
    ]),
    entero('cantidad_zonas_estudio', 'Cantidad de zonas de estudio', 'cantidadZonasEstudio', [
      'cantidad zonas de estudio',
    ]),
    entero('cantidad_zonas_recreativas', 'Cantidad de zonas recreativas', 'cantidadZonasRecreativas', [
      'cantidad zonas recreativas',
    ]),
  ],
};

import {

  Injectable,

  NotFoundException,

  ForbiddenException,

  BadRequestException,

} from '@nestjs/common';

import {
  CodigoDocumentoGuia,
  RolUsuario,
  EstadoEvidencia,
} from '@prisma/client';

import { EvidenciaRepositorio, FiltrosEvidencia } from './evidencia.repositorio';

import { AlmacenamientoService } from '../almacenamiento/almacenamiento.service';

import { NotificacionesService } from '../notificaciones/notificaciones.service';

import { CrearEvidenciaDto, ActualizarEvidenciaDto } from './dto/evidencia.dto';

import { DictaminarDto } from '../aprobacion/dto/dictaminar.dto';

import { AvanceProgramaService } from '../programas/avance-programa.service';

import {

  CODIGOS_CONDICION_DOCUMENTO_MAESTRO,

  TOTAL_CONDICIONES_DOCUMENTO_MAESTRO,

  etiquetaCondicion,

} from '../dominio/condiciones-documento-maestro';

import {

  CODIGOS_CONDICION_INSTITUCIONAL,

  TOTAL_CONDICIONES_INSTITUCIONALES,

  etiquetaCondicionInstitucional,

} from '../dominio/condiciones-institucionales';

import {
  formatearPuntaje,
  resolverChecklist,
} from '../dominio/puntaje-condiciones';

import { ServicioManipulacionDocx } from '../docx/servicio-manipulacion-docx.service';

import {
  rolPuedeDictaminar,
  ServicioAlcancePrograma,
} from '../common/alcance/servicio-alcance-programa';

import { esGuiaInstitucional } from '../dominio/alcance-guia';

import { InstitucionesService } from '../instituciones/instituciones.service';



const TIPOS_PERMITIDOS = [

  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',

];

const TAMANO_MAXIMO = 20 * 1024 * 1024;

/** Estados desde los que el Cargador corrige: sube una versión nueva y la reenvía a revisión. */
const ESTADOS_QUE_ADMITEN_CORRECCION: EstadoEvidencia[] = [
  EstadoEvidencia.Borrador,
  EstadoEvidencia.ConObservaciones,
  EstadoEvidencia.Rechazado,
];



interface UsuarioToken {

  id: string;

  rol: RolUsuario;

}



@Injectable()

export class DocumentosService {

  constructor(

    private readonly evidenciaRepo: EvidenciaRepositorio,

    private readonly almacenamiento: AlmacenamientoService,

    private readonly notificaciones: NotificacionesService,

    private readonly avancePrograma: AvanceProgramaService,

    private readonly docx: ServicioManipulacionDocx,

    private readonly alcance: ServicioAlcancePrograma,

    private readonly instituciones: InstitucionesService,

  ) {}



  async crearConArchivo(

    dto: CrearEvidenciaDto,

    archivo: Express.Multer.File,

    usuario: UsuarioToken,

  ) {

    this.validarArchivo(archivo);



    const requiereChecklistLegacy =
      dto.requiereChecklistMaestro === 'true' ||
      dto.requiereChecklistMaestro === '1';

    const codigoGuia =
      dto.codigoGuia ??
      (requiereChecklistLegacy ? CodigoDocumentoGuia.G1 : undefined);

    const propietario = await this.resolverPropietario(dto, codigoGuia, usuario);

    const evidencia = await this.evidenciaRepo.crear({

      nombre: dto.nombre,

      ...propietario,

      periodo: dto.periodo,

      factor: dto.factor,

      indicador: dto.indicador,

      autor: { connect: { id: usuario.id } },

      nombreArchivo: archivo.originalname,

      responsable: dto.responsable,

      estado: EstadoEvidencia.Borrador,

      requiereChecklistMaestro: codigoGuia === CodigoDocumentoGuia.G1,

      codigoGuia,

      ...(dto.documentoRequeridoId

        ? {

            documentoRequerido: { connect: { id: dto.documentoRequeridoId } },

          }

        : {}),

    });



    const clave = this.almacenamiento.generarClaveEvidencia(

      evidencia.id,

      archivo.originalname,

      1,

    );



    try {

      await this.evidenciaRepo.actualizar(evidencia.id, {

        rutaArchivo: clave,

        mimeType: archivo.mimetype,

        tamanoBytes: archivo.size,

        version: 1,

      });



      await this.evidenciaRepo.registrarVersion({

        evidenciaId: evidencia.id,

        numero: 1,

        nombreArchivo: archivo.originalname,

        rutaArchivo: clave,

        mimeType: archivo.mimetype,

        tamanoBytes: archivo.size,

        subidoPorId: usuario.id,

      });



      await this.almacenamiento.subirArchivo(

        archivo.buffer,

        clave,

        'evidencias',

        archivo.mimetype,

      );



      await this.evidenciaRepo.registrarHistorial(

        evidencia.id,

        EstadoEvidencia.Borrador,

        'Evidencia cargada',

        usuario.id,

      );



      const actualizada = await this.evidenciaRepo.buscarPorId(evidencia.id);

      if (!actualizada) throw new NotFoundException('Evidencia no encontrada tras la carga.');

      return actualizada;

    } catch (err) {

      await this.evidenciaRepo.eliminar(evidencia.id).catch(() => undefined);

      throw err;

    }

  }



  private esSuperAdmin(usuario: UsuarioToken): boolean {

    return usuario.rol === RolUsuario.SuperAdmin;

  }



  async listar(usuario: UsuarioToken, filtros: FiltrosEvidencia) {

    const filtrosAplicados: FiltrosEvidencia = {

      ...filtros,

      alcance: await this.alcance.filtroVisibilidad(usuario),

    };

    const [datos, total] = await this.evidenciaRepo.listar(filtrosAplicados);

    return {

      datos,

      total,

      pagina: filtros.pagina ?? 1,

      limite: filtros.limite ?? 20,

    };

  }



  async conteosPorEstado(usuario: UsuarioToken) {

    const grupos = await this.evidenciaRepo.contarPorEstado(

      await this.alcance.filtroVisibilidad(usuario),

    );

    const conteos = {
      borrador: 0,
      enRevision: 0,
      conObservaciones: 0,
      cumple: 0,
      validado: 0,
      rechazado: 0,
    };

    for (const grupo of grupos) {

      if (grupo.estado === EstadoEvidencia.Borrador) conteos.borrador = grupo._count._all;

      if (grupo.estado === EstadoEvidencia.EnRevision) conteos.enRevision = grupo._count._all;

      if (grupo.estado === EstadoEvidencia.Validado) conteos.validado = grupo._count._all;

      if (grupo.estado === EstadoEvidencia.Rechazado) conteos.rechazado = grupo._count._all;

      if (grupo.estado === EstadoEvidencia.ConObservaciones) {
        conteos.conObservaciones = grupo._count._all;
      }
      if (grupo.estado === EstadoEvidencia.Cumple) conteos.cumple = grupo._count._all;

    }

    return conteos;

  }



  async obtenerPorId(id: string, usuario: UsuarioToken) {

    const evidencia = await this.evidenciaRepo.buscarPorId(id);

    if (!evidencia) throw new NotFoundException('Evidencia no encontrada.');



    await this.verificarAccesoLectura(evidencia, usuario);

    return evidencia;

  }



  async actualizar(id: string, dto: ActualizarEvidenciaDto, usuario: UsuarioToken) {

    const evidencia = await this.obtenerPorId(id, usuario);

    this.verificarEdicion(evidencia, usuario);



    return this.evidenciaRepo.actualizar(id, dto);

  }



  async reemplazarArchivo(

    id: string,

    archivo: Express.Multer.File,

    usuario: UsuarioToken,

  ) {

    this.validarArchivo(archivo);



    const evidencia = await this.obtenerPorId(id, usuario);

    this.verificarEdicion(evidencia, usuario);



    const versionActual = evidencia.version ?? 1;

    const versionRegistro = await this.evidenciaRepo.buscarVersion(

      id,

      versionActual,

    );

    if (versionRegistro?.firmaDescarga) {

      const evaluaciones = await this.evidenciaRepo.listarEvaluacionesCondicion(id);

      const etiquetasZona = evaluaciones

        .filter((e) => !e.cumple)

        .map((e) => etiquetaCondicion(e.codigoCondicion));

      await this.docx.validarFirmaYDiff(

        archivo.buffer,

        versionRegistro.firmaDescarga,

        versionRegistro.textoBaseAuditoria,

        etiquetasZona,

      );

    }



    if (!ESTADOS_QUE_ADMITEN_CORRECCION.includes(evidencia.estado)) {

      throw new BadRequestException(

        'Solo se puede cargar una nueva versión en borrador, con observaciones o rechazado.',

      );

    }



    if (

      !this.esSuperAdmin(usuario) &&

      usuario.rol === RolUsuario.Cargador &&

      evidencia.autorId !== usuario.id

    ) {

      throw new ForbiddenException('Solo puede actualizar sus propias evidencias.');

    }



    const nuevaVersion = (evidencia.version ?? 1) + 1;

    const clave = this.almacenamiento.generarClaveEvidencia(

      id,

      archivo.originalname,

      nuevaVersion,

    );

    const snapshotAnterior = {

      nombreArchivo: evidencia.nombreArchivo,

      rutaArchivo: evidencia.rutaArchivo,

      mimeType: evidencia.mimeType,

      tamanoBytes: evidencia.tamanoBytes,

      version: evidencia.version ?? 1,

    };



    try {

      await this.evidenciaRepo.registrarVersion({

        evidenciaId: id,

        numero: nuevaVersion,

        nombreArchivo: archivo.originalname,

        rutaArchivo: clave,

        mimeType: archivo.mimetype,

        tamanoBytes: archivo.size,

        subidoPorId: usuario.id,

      });



      await this.evidenciaRepo.actualizar(id, {

        nombreArchivo: archivo.originalname,

        rutaArchivo: clave,

        mimeType: archivo.mimetype,

        tamanoBytes: archivo.size,

        version: nuevaVersion,

        fechaCarga: new Date(),

      });



      await this.almacenamiento.subirArchivo(

        archivo.buffer,

        clave,

        'evidencias',

        archivo.mimetype,

      );



      await this.evidenciaRepo.registrarHistorial(

        id,

        evidencia.estado,

        `Versión ${nuevaVersion} cargada`,

        usuario.id,

      );



      const actualizada = await this.evidenciaRepo.buscarPorId(id);

      if (!actualizada) throw new NotFoundException('Evidencia no encontrada tras la nueva versión.');

      return actualizada;

    } catch (err) {

      await this.evidenciaRepo

        .eliminarVersion(id, nuevaVersion)

        .catch(() => undefined);

      await this.evidenciaRepo.actualizar(id, snapshotAnterior).catch(() => undefined);

      throw err;

    }

  }



  async eliminar(id: string, usuario: UsuarioToken) {

    const evidencia = await this.obtenerPorId(id, usuario);

    this.verificarEdicion(evidencia, usuario);



    if (evidencia.rutaArchivo) {

      await this.almacenamiento.eliminarArchivo(evidencia.rutaArchivo, 'evidencias');

    }



    return this.evidenciaRepo.eliminar(id);

  }



  async enviarRevision(id: string, usuario: UsuarioToken) {

    const evidencia = await this.obtenerPorId(id, usuario);



    if (!ESTADOS_QUE_ADMITEN_CORRECCION.includes(evidencia.estado)) {

      throw new BadRequestException(

        'Solo borradores, documentos con observaciones o rechazados pueden enviarse a revisión.',

      );

    }



    if (

      !this.esSuperAdmin(usuario) &&

      usuario.rol === RolUsuario.Cargador &&

      evidencia.autorId !== usuario.id

    ) {

      throw new ForbiddenException('Solo puede enviar sus propias evidencias.');

    }



    const actualizada = await this.evidenciaRepo.actualizar(id, {

      estado: EstadoEvidencia.EnRevision,

      observaciones: null,

    });



    await this.evidenciaRepo.registrarHistorial(

      id,

      EstadoEvidencia.EnRevision,

      'Enviada a revisión',

      usuario.id,

    );



    return actualizada;

  }



  async dictaminar(id: string, dto: DictaminarDto, revisor: UsuarioToken) {

    if (!rolPuedeDictaminar(revisor.rol)) {

      throw new ForbiddenException(

        'Solo el revisor asignado al programa puede dictaminar evidencias.',

      );

    }



    const evidencia = await this.evidenciaRepo.buscarPorId(id);

    if (!evidencia) throw new NotFoundException('Evidencia no encontrada.');



    // HU-010: los documentos institucionales (G3/G4) no tienen programa; los dictamina
    // cualquier Revisor (o el SuperAdmin). Los de programa siguen exigiendo la asignación.
    if (evidencia.programaId) {
      await this.exigirProgramaAsignado(revisor, evidencia.programaId);
    }



    if (evidencia.estado !== EstadoEvidencia.EnRevision) {

      throw new BadRequestException('Solo se pueden dictaminar evidencias en revisión.');

    }



    const guiaDocumento = this.resolverGuiaEvidencia(evidencia);

    const usaChecklistPrograma =
      guiaDocumento === CodigoDocumentoGuia.G1 ||
      (dto.condiciones && dto.condiciones.length > 0);

    const usaChecklistInstitucional =
      guiaDocumento === CodigoDocumentoGuia.G3 ||
      (dto.condicionesInstitucionales &&
        dto.condicionesInstitucionales.length > 0);



    let estadoFinal = dto.estado;
    let puntajeActual: number | null = null;
    let totalCondicionesActual: number | null = null;
    let observacionesResumen = dto.observaciones;

    if (usaChecklistPrograma) {
      if (!dto.condiciones || dto.condiciones.length !== CODIGOS_CONDICION_DOCUMENTO_MAESTRO.length) {
        throw new BadRequestException(
          'Debe evaluar las 9 condiciones del documento maestro de programa (G1).',
        );
      }

      const codigosRecibidos = new Set(dto.condiciones.map((c) => c.codigo));
      for (const codigo of CODIGOS_CONDICION_DOCUMENTO_MAESTRO) {
        if (!codigosRecibidos.has(codigo)) {
          throw new BadRequestException(
            `Falta la condición ${etiquetaCondicion(codigo)} en el dictamen.`,
          );
        }
      }

      for (const condicion of dto.condiciones) {
        if (!condicion.cumple && !condicion.observacion?.trim()) {
          throw new BadRequestException(
            `Registra una observación para la condición «${etiquetaCondicion(condicion.codigo)}».`,
          );
        }
      }

      // D1: el checklist produce Cumple (9/9) o Con observaciones (n<9); nunca Rechazado.
      const resultado = resolverChecklist(dto.condiciones, TOTAL_CONDICIONES_DOCUMENTO_MAESTRO);
      puntajeActual = resultado.puntaje;
      totalCondicionesActual = resultado.totalCondiciones;
      estadoFinal = resultado.estado;

      await this.evidenciaRepo.guardarEvaluacionesCondicion(
        id,
        evidencia.version,
        revisor.id,
        dto.condiciones.map((c) => ({
          codigoCondicion: c.codigo,
          cumple: c.cumple,
          observacion: c.observacion,
        })),
      );

      const lineasObservacion = dto.condiciones
        .filter((c) => !c.cumple && c.observacion?.trim())
        .map((c) => `• ${etiquetaCondicion(c.codigo)}: ${c.observacion?.trim()}`);
      observacionesResumen =
        lineasObservacion.length > 0 ? lineasObservacion.join('\n') : dto.observaciones;
    } else if (usaChecklistInstitucional) {
      if (
        !dto.condicionesInstitucionales ||
        dto.condicionesInstitucionales.length !==
          CODIGOS_CONDICION_INSTITUCIONAL.length
      ) {
        throw new BadRequestException(
          'Debe evaluar las 6 condiciones institucionales del documento maestro (G3).',
        );
      }

      const codigosRecibidos = new Set(
        dto.condicionesInstitucionales.map((c) => c.codigo),
      );
      for (const codigo of CODIGOS_CONDICION_INSTITUCIONAL) {
        if (!codigosRecibidos.has(codigo)) {
          throw new BadRequestException(
            `Falta la condición ${etiquetaCondicionInstitucional(codigo)} en el dictamen.`,
          );
        }
      }

      for (const condicion of dto.condicionesInstitucionales) {
        if (!condicion.cumple && !condicion.observacion?.trim()) {
          throw new BadRequestException(
            `Registra una observación para la condición «${etiquetaCondicionInstitucional(condicion.codigo)}».`,
          );
        }
      }

      // D1 aplicado a G3: Cumple (6/6) o Con observaciones (n<6).
      const resultado = resolverChecklist(
        dto.condicionesInstitucionales,
        TOTAL_CONDICIONES_INSTITUCIONALES,
      );
      puntajeActual = resultado.puntaje;
      totalCondicionesActual = resultado.totalCondiciones;
      estadoFinal = resultado.estado;

      await this.evidenciaRepo.guardarEvaluacionesCondicionInstitucional(
        id,
        evidencia.version,
        revisor.id,
        dto.condicionesInstitucionales.map((c) => ({
          codigoCondicion: c.codigo,
          cumple: c.cumple,
          observacion: c.observacion,
        })),
      );

      const lineasObservacion = dto.condicionesInstitucionales
        .filter((c) => !c.cumple && c.observacion?.trim())
        .map(
          (c) =>
            `• ${etiquetaCondicionInstitucional(c.codigo)}: ${c.observacion?.trim()}`,
        );
      observacionesResumen =
        lineasObservacion.length > 0 ? lineasObservacion.join('\n') : dto.observaciones;
    } else {
      // Documentos sin checklist (G2, G4 u otros): decisión explícita del Revisor.
      if (
        estadoFinal !== EstadoEvidencia.Validado &&
        estadoFinal !== EstadoEvidencia.Rechazado
      ) {
        throw new BadRequestException('El dictamen debe ser Validado o Rechazado.');
      }
    }

    if (!estadoFinal) {
      throw new BadRequestException('El dictamen debe incluir un estado válido.');
    }

    await this.evidenciaRepo.actualizar(id, {
      estado: estadoFinal,
      observaciones: observacionesResumen,
      ...(puntajeActual !== null && totalCondicionesActual !== null
        ? { puntajeActual, totalCondicionesActual }
        : {}),
    });

    await this.evidenciaRepo.registrarHistorial(
      id,
      estadoFinal,
      observacionesResumen,
      revisor.id,
    );

    // El avance institucional se calcula al leer (GET /instituciones/:id/progreso).
    if (evidencia.programaId) {
      await this.avancePrograma.recalcularPorcentajeAvance(evidencia.programaId);
    }

    const { tipo, mensaje } = this.construirNotificacionDictamen(
      evidencia.nombre,
      estadoFinal,
      observacionesResumen,
      puntajeActual,
      totalCondicionesActual,
    );

    await this.notificaciones.crear(evidencia.autorId, mensaje, tipo);

    if (
      estadoFinal === EstadoEvidencia.ConObservaciones &&
      usaChecklistPrograma &&
      dto.condiciones &&
      evidencia.rutaArchivo
    ) {
      await this.procesarDocxConObservaciones(
        id,
        evidencia.version ?? 1,
        evidencia.rutaArchivo,
        dto.condiciones,
        revisor.id,
        revisor.rol,
      );
    }

    return this.evidenciaRepo.buscarPorId(id);
  }

  private construirNotificacionDictamen(
    nombre: string,
    estado: EstadoEvidencia,
    observaciones: string | undefined,
    puntaje: number | null,
    totalCondiciones: number | null,
  ): { tipo: string; mensaje: string } {
    const textoPuntaje =
      puntaje !== null && totalCondiciones !== null
        ? ` (${formatearPuntaje(puntaje, totalCondiciones)})`
        : '';
    const detalle = observaciones ?? 'Revisa las condiciones marcadas.';

    switch (estado) {
      case EstadoEvidencia.Cumple:
        return {
          tipo: 'aprobacion',
          mensaje: `Tu evidencia "${nombre}" cumple todas las condiciones${textoPuntaje}.`,
        };
      case EstadoEvidencia.ConObservaciones:
        return {
          tipo: 'observaciones',
          mensaje: `Tu evidencia "${nombre}" quedó con observaciones${textoPuntaje}: ${detalle}`,
        };
      case EstadoEvidencia.Validado:
        return { tipo: 'aprobacion', mensaje: `Tu evidencia "${nombre}" fue aprobada.` };
      default:
        return {
          tipo: 'rechazo',
          mensaje: `Tu evidencia "${nombre}" fue rechazada: ${detalle}`,
        };
    }
  }



  async listarMisRevisionesRevisor(

    usuario: UsuarioToken,

    pagina = 1,

    limite = 20,

  ) {

    if (!rolPuedeDictaminar(usuario.rol)) {

      throw new ForbiddenException('Solo el revisor puede consultar sus revisiones.');

    }

    const programaIds = this.esSuperAdmin(usuario)

      ? undefined

      : await this.alcance.idsProgramasAsignados(usuario.id);

    return this.evidenciaRepo.listarEnviosRevisionParaRevisor(pagina, limite, programaIds);

  }



  private async procesarDocxConObservaciones(

    evidenciaId: string,

    numeroVersion: number,

    rutaArchivo: string,

    condiciones: DictaminarDto['condiciones'],

    revisorId: string,

    _rolRevisor: RolUsuario,

  ) {

    if (!condiciones?.length) return;



    const bufferOriginal = await this.almacenamiento.obtenerBuffer(

      rutaArchivo,

      'evidencias',

    );



    const zonas = condiciones

      .filter((c) => !c.cumple)

      .map((c, indice) => ({

        codigoCondicion: c.codigo,

        etiqueta: etiquetaCondicion(c.codigo),

        observacion: c.observacion?.trim() ?? '',

        idPermiso: 100 + indice,

      }));



    const procesado = await this.docx.procesarDocxPostDictamen(

      bufferOriginal,

      evidenciaId,

      numeroVersion,

      zonas,

    );



    await this.almacenamiento.subirArchivo(

      procesado.buffer,

      rutaArchivo,

      'evidencias',

      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',

    );



    await this.evidenciaRepo.actualizarVersion(evidenciaId, numeroVersion, {

      firmaDescarga: procesado.firmaDescarga,

      textoBaseAuditoria: procesado.textoBaseAuditoria,

      tamanoBytes: procesado.buffer.length,

    });

  }



  async obtenerEvaluacionesCondicion(
    id: string,
    usuario: UsuarioToken,
    numeroRevision?: number,
  ) {

    await this.obtenerPorId(id, usuario);

    const evaluaciones = await this.evidenciaRepo.listarEvaluacionesCondicion(
      id,
      numeroRevision,
    );

    if (evaluaciones.length === 0) return [];

    if (numeroRevision !== undefined) {

      return evaluaciones.filter((e) => e.numeroRevision === numeroRevision);

    }

    const ultimaRevision = evaluaciones[0].numeroRevision;

    return evaluaciones.filter((e) => e.numeroRevision === ultimaRevision);

  }

  async obtenerEvaluacionesCondicionInstitucional(
    id: string,
    usuario: UsuarioToken,
    numeroRevision?: number,
  ) {
    await this.obtenerPorId(id, usuario);

    const evaluaciones =
      await this.evidenciaRepo.listarEvaluacionesCondicionInstitucional(
        id,
        numeroRevision,
      );

    if (evaluaciones.length === 0) return [];

    if (numeroRevision !== undefined) {
      return evaluaciones.filter((e) => e.numeroRevision === numeroRevision);
    }

    const ultimaRevision = evaluaciones[0].numeroRevision;
    return evaluaciones.filter((e) => e.numeroRevision === ultimaRevision);
  }



  async obtenerHistorial(id: string, usuario: UsuarioToken) {

    await this.obtenerPorId(id, usuario);

    return this.evidenciaRepo.obtenerHistorial(id);

  }



  async listarVersiones(id: string, usuario: UsuarioToken) {

    await this.obtenerPorId(id, usuario);

    return this.evidenciaRepo.listarVersiones(id);

  }



  async obtenerUrlDescarga(id: string, usuario: UsuarioToken, version?: number) {

    const evidencia = await this.obtenerPorId(id, usuario);



    if (version !== undefined) {

      const versionRegistro = await this.evidenciaRepo.buscarVersion(id, version);

      if (!versionRegistro) {

        throw new NotFoundException('Versión no encontrada.');

      }

      return this.almacenamiento.generarUrlFirmada(versionRegistro.rutaArchivo, 'evidencias');

    }



    if (!evidencia.rutaArchivo) {

      throw new NotFoundException('Archivo no disponible.');

    }



    return this.almacenamiento.generarUrlFirmada(evidencia.rutaArchivo, 'evidencias');

  }



  async obtenerContenidoArchivo(

    id: string,

    usuario: UsuarioToken,

    version?: number,

  ): Promise<{ buffer: Buffer; nombreArchivo: string; mimeType: string }> {

    const evidencia = await this.obtenerPorId(id, usuario);

    let rutaArchivo = evidencia.rutaArchivo;

    let nombreArchivo = evidencia.nombreArchivo;

    let mimeType =

      evidencia.mimeType ??

      'application/vnd.openxmlformats-officedocument.wordprocessingml.document';



    if (version !== undefined) {

      const versionRegistro = await this.evidenciaRepo.buscarVersion(id, version);

      if (!versionRegistro) {

        throw new NotFoundException('Versión no encontrada.');

      }

      rutaArchivo = versionRegistro.rutaArchivo;

      nombreArchivo = versionRegistro.nombreArchivo;

      mimeType =

        versionRegistro.mimeType ??

        'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

    }



    if (!rutaArchivo) {

      throw new NotFoundException('Archivo no disponible.');

    }



    const buffer = await this.almacenamiento.obtenerBuffer(rutaArchivo, 'evidencias');

    return { buffer, nombreArchivo, mimeType };

  }



  private validarArchivo(archivo: Express.Multer.File) {

    if (!archivo) throw new BadRequestException('Se requiere un archivo.');

    const extension = archivo.originalname.split('.').pop()?.toLowerCase();

    if (extension !== 'docx') {

      throw new BadRequestException(

        'Solo se permiten documentos Word (.docx) para que el revisor pueda editarlos.',

      );

    }

    if (!TIPOS_PERMITIDOS.includes(archivo.mimetype)) {

      throw new BadRequestException(

        'Formato no válido. Suba un archivo .docx de Microsoft Word.',

      );

    }

    this.docx.validarEsDocxZip(archivo.buffer);

    if (archivo.size > TAMANO_MAXIMO) {

      throw new BadRequestException('El archivo supera el tamaño máximo de 20 MB.');

    }

  }



  private async verificarAccesoLectura(

    evidencia: {
      id: string;
      estado: EstadoEvidencia;
      autorId: string;
      programaId: string | null;
      institucionId?: string | null;
    },

    usuario: UsuarioToken,

  ) {

    if (this.esSuperAdmin(usuario)) return;



    if (usuario.rol === RolUsuario.ParAcademico) {

      if (evidencia.estado !== EstadoEvidencia.Validado) {

        throw new ForbiddenException('El par académico solo consulta evidencias validadas.');

      }

      return;

    }



    if (usuario.rol === RolUsuario.Cargador) {

      if (evidencia.autorId !== usuario.id) {

        throw new ForbiddenException('No tiene acceso a esta evidencia.');

      }

      // Documento institucional: basta con ser el autor (no depende de un programa).
      if (evidencia.programaId) {
        await this.exigirProgramaAsignado(usuario, evidencia.programaId);
      }

      return;

    }



    if (usuario.rol === RolUsuario.Revisor) {

      if (evidencia.estado === EstadoEvidencia.Borrador) {

        throw new ForbiddenException('El revisor no consulta borradores.');

      }

      // Documento institucional: visible para cualquier Revisor (HU-010).
      if (evidencia.programaId) {
        await this.exigirProgramaAsignado(usuario, evidencia.programaId);
      }

      return;

    }



    if (usuario.rol === RolUsuario.Administrador && evidencia.estado === EstadoEvidencia.Borrador) {

      const yaRevisado = await this.evidenciaRepo.tieneHistorialDistintoDeBorrador(evidencia.id);

      if (!yaRevisado) {

        throw new ForbiddenException(

          'El administrador no consulta borradores que nunca se enviaron a revisión.',

        );

      }

    }

  }



  private async exigirProgramaAsignado(usuario: UsuarioToken, programaId: string) {

    if (this.esSuperAdmin(usuario)) return;

    const asignado = await this.alcance.estaAsignado(usuario.id, programaId);

    if (!asignado) {

      throw new ForbiddenException('No tiene este programa asignado.');

    }

  }



  private verificarEdicion(

    evidencia: { estado: EstadoEvidencia; autorId: string },

    usuario: UsuarioToken,

  ) {

    if (this.esSuperAdmin(usuario)) return;



    if (evidencia.estado === EstadoEvidencia.Validado) {

      throw new ForbiddenException('No se puede modificar una evidencia validada.');

    }

    if (evidencia.estado === EstadoEvidencia.Cumple) {
      throw new ForbiddenException(
        'No se puede modificar una evidencia que cumple todas las condiciones.',
      );
    }

    if (usuario.rol === RolUsuario.Cargador && evidencia.autorId !== usuario.id) {

      throw new ForbiddenException('Solo puede editar sus propias evidencias.');

    }

    if (

      usuario.rol === RolUsuario.Administrador ||

      usuario.rol === RolUsuario.ParAcademico

    ) {

      throw new ForbiddenException('No tiene permiso para editar evidencias.');

    }

  }

  /**
   * HU-010: define el propietario de la evidencia según la guía.
   * - G3/G4 → institución (la indicada o la CUAC). No se aceptan con programa.
   * - G1/G2 o sin guía → programa asignado al Cargador. No se aceptan con institución.
   * El Cargador que carga documentos institucionales debe tener al menos un programa
   * asignado (misma condición que exigía el modelo del programa de referencia).
   */
  private async resolverPropietario(
    dto: CrearEvidenciaDto,
    codigoGuia: CodigoDocumentoGuia | undefined,
    usuario: UsuarioToken,
  ): Promise<
    | { programa: { connect: { id: string } } }
    | { institucion: { connect: { id: string } } }
  > {
    if (esGuiaInstitucional(codigoGuia)) {
      if (dto.programaId) {
        throw new BadRequestException(
          'Los documentos institucionales (G3 y G4) se asocian a la institución, no a un programa.',
        );
      }

      const institucion = dto.institucionId
        ? await this.instituciones.obtenerPorId(dto.institucionId)
        : await this.instituciones.obtenerPrincipal();

      if (!this.esSuperAdmin(usuario)) {
        const asignados = await this.alcance.idsProgramasAsignados(usuario.id);
        if (asignados.length === 0) {
          throw new ForbiddenException(
            'Necesita al menos un programa asignado para cargar documentos institucionales.',
          );
        }
      }

      return { institucion: { connect: { id: institucion.id } } };
    }

    if (dto.institucionId) {
      throw new BadRequestException(
        'Solo los documentos G3 y G4 se asocian a la institución.',
      );
    }

    if (!dto.programaId) {
      throw new BadRequestException('Seleccione el programa del documento.');
    }

    await this.exigirProgramaAsignado(usuario, dto.programaId);

    return { programa: { connect: { id: dto.programaId } } };
  }

  private resolverGuiaEvidencia(evidencia: {
    codigoGuia?: CodigoDocumentoGuia | null;
    requiereChecklistMaestro: boolean;
  }): CodigoDocumentoGuia | null {
    if (evidencia.codigoGuia) return evidencia.codigoGuia;
    if (evidencia.requiereChecklistMaestro) return CodigoDocumentoGuia.G1;
    return null;
  }

}



import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';

import {
  CodigoDocumentoGuia,
  RolUsuario,
  EstadoEvidencia,
} from '@prisma/client';

import { EvidenciaRepositorio, FiltrosEvidencia } from './evidencia.repositorio';
import { PrismaService } from '../prisma/prisma.module';

import { AlmacenamientoService } from '../almacenamiento/almacenamiento.service';

import { NotificacionesService } from '../notificaciones/notificaciones.service';

import {
  CrearEvidenciaDto,
  ActualizarEvidenciaDto,
  FiltrosEvidenciaDto,
} from './dto/evidencia.dto';
import { parsearParametrosConsultaEvidencias } from './parametros-consulta-evidencias';

import { DictaminarDto } from '../aprobacion/dto/dictaminar.dto';

import { AvanceProgramaService } from '../programas/avance-programa.service';
import { esGuiaSinPuntaje } from '../dominio/guias-documento';

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

import { decodificarNombreArchivoMultipart } from '../almacenamiento/utilidades-nombre-archivo';

import {
  rolPuedeDictaminar,
  ServicioAlcancePrograma,
} from '../common/alcance/servicio-alcance-programa';

import { esGuiaInstitucional } from '../dominio/alcance-guia';



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
  private readonly logger = new Logger(DocumentosService.name);

  constructor(

    private readonly evidenciaRepo: EvidenciaRepositorio,

    private readonly almacenamiento: AlmacenamientoService,

    private readonly notificaciones: NotificacionesService,

    private readonly avancePrograma: AvanceProgramaService,

    private readonly docx: ServicioManipulacionDocx,

    private readonly alcance: ServicioAlcancePrograma,

    private readonly prisma: PrismaService,

  ) {}



  async crearConArchivo(

    dto: CrearEvidenciaDto,

    archivo: Express.Multer.File,

    usuario: UsuarioToken,

  ) {

    this.validarArchivo(archivo);

    if (dto.documentoRequeridoId) {
      const documento = await this.evidenciaRepo.buscarDocumentoRequerido(
        dto.documentoRequeridoId,
      );
      if (!documento) {
        throw new BadRequestException('El documento requerido no existe.');
      }
    }

    const requiereChecklistLegacy =
      dto.requiereChecklistMaestro === 'true' ||
      dto.requiereChecklistMaestro === '1';

    const codigoGuia =
      dto.codigoGuia ??
      (requiereChecklistLegacy ? CodigoDocumentoGuia.G1 : undefined);

    // HU-010: la guía define el propietario (G1/G2 → programa; G3/G4 → institución).
    const propietario = await this.resolverPropietario(dto, codigoGuia, usuario);

    const evidencia = await this.evidenciaRepo.crear({

      nombre: dto.nombre,

      ...propietario,

      periodo: dto.periodo,

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



  async listar(usuario: UsuarioToken, query: FiltrosEvidenciaDto) {
    const filtrosAplicados = parsearParametrosConsultaEvidencias(query, {
      rolUsuario: usuario.rol,
      usarFts: true,
    });
    filtrosAplicados.estado = this.normalizarEstadoFiltro(filtrosAplicados.estado);
    filtrosAplicados.alcance = await this.alcance.filtroVisibilidad(usuario);

    const [datos, total] = await this.evidenciaRepo.listar(filtrosAplicados);

    return {
      datos,
      total,
      pagina: filtrosAplicados.pagina ?? 1,
      limite: filtrosAplicados.limite ?? 20,
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
      await this.docx.validarFirmaSubida(
        archivo.buffer,
        versionRegistro.firmaDescarga,
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

    // El nombre del archivo no se renombra al subir correcciones: se conserva el
    // nombre original de la versión (evita stems distintos o "(2).docx" del SO).
    const nombreArchivoOriginal =
      versionRegistro?.nombreArchivo?.trim() ||
      evidencia.nombreArchivo?.trim() ||
      decodificarNombreArchivoMultipart(archivo.originalname);

    const clave = this.almacenamiento.generarClaveEvidencia(

      id,

      nombreArchivoOriginal,

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

        nombreArchivo: nombreArchivoOriginal,

        rutaArchivo: clave,

        mimeType: archivo.mimetype,

        tamanoBytes: archivo.size,

        subidoPorId: usuario.id,

      });



      await this.evidenciaRepo.actualizar(id, {

        nombreArchivo: nombreArchivoOriginal,

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



    await this.exigirProgramaAsignadoSiAplica(revisor, evidencia.programaId);



    if (evidencia.estado !== EstadoEvidencia.EnRevision) {

      throw new BadRequestException('Solo se pueden dictaminar evidencias en revisión.');

    }



    const guiaDocumento = this.resolverGuiaEvidencia(evidencia);
    // Decisión del PO (06/10): G2 y G4 no se puntúan por condiciones.
    const guiaSinPuntaje = esGuiaSinPuntaje(guiaDocumento);

    if (guiaSinPuntaje && (dto.condiciones?.length || dto.condicionesInstitucionales?.length)) {
      throw new BadRequestException(
        `El ${guiaDocumento} no se evalúa por condiciones: apruébelo o déjelo «Con observaciones» con el texto de corrección.`,
      );
    }

    const usaChecklistPrograma =
      !guiaSinPuntaje &&
      (guiaDocumento === CodigoDocumentoGuia.G1 ||
        (dto.condiciones && dto.condiciones.length > 0));

    const usaChecklistInstitucional =
      !guiaSinPuntaje &&
      (guiaDocumento === CodigoDocumentoGuia.G3 ||
        (dto.condicionesInstitucionales &&
          dto.condicionesInstitucionales.length > 0));



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
    } else if (guiaSinPuntaje) {
      // G2/G4: aprobar (Validado) o «Con observaciones» con texto de corrección; el Cargador
      // corrige y sube una versión nueva (mismo ciclo que G1). Ya no se usa «Rechazado».
      if (estadoFinal !== EstadoEvidencia.Validado && estadoFinal !== EstadoEvidencia.ConObservaciones) {
        throw new BadRequestException(
          `El dictamen del ${guiaDocumento} debe ser «Validado» (aprobado) o «Con observaciones».`,
        );
      }
      const tieneTextoCorreccion =
        !!dto.observaciones?.trim() || !!dto.comentariosInline?.some((c) => c.texto?.trim());
      if (estadoFinal === EstadoEvidencia.ConObservaciones && !tieneTextoCorreccion) {
        throw new BadRequestException(
          'Registra el texto de corrección para dejar el documento «Con observaciones».',
        );
      }
    } else {
      // Documentos sin guía (legado): decisión explícita del Revisor.
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


    observacionesResumen = this.combinarComentariosInline(
      observacionesResumen,
      dto.comentariosInline,
    );

    if (dto.comentariosInline?.length) {
      const usuarioRevisor = await this.evidenciaRepo
        .buscarUsuarioNombre(revisor.id)
        .catch(() => null);
      const autor = usuarioRevisor?.nombre?.trim() || 'Revisor SIAC';
      const comentariosPersistir = dto.comentariosInline
        .filter((c) => c.texto?.trim())
        .map((c) => ({
          hunkId: c.hunkId?.trim() || undefined,
          anchor: c.anchor?.trim() || undefined,
          quote: c.quote?.trim() || c.cita?.trim() || undefined,
          texto: c.texto.trim(),
          autor,
        }));
      if (comentariosPersistir.length > 0) {
        try {
          await this.evidenciaRepo.guardarComentariosVersion(
            id,
            evidencia.version ?? 1,
            revisor.id,
            comentariosPersistir,
          );
        } catch (err) {
          this.logger.error(
            `No se pudieron persistir ${comentariosPersistir.length} comentarios de evidencia ${id} v${evidencia.version ?? 1}. Ejecute pnpm prisma:repair-schema. Detalle: ${err instanceof Error ? err.message : err}`,
          );
        }
      }
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

    let numeroVersion = evidencia.version ?? 1;

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

      numeroVersion = versionRegistro.numero;

      mimeType =

        versionRegistro.mimeType ??

        'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

    }



    if (!rutaArchivo) {

      throw new NotFoundException('Archivo no disponible.');

    }



    let buffer = await this.almacenamiento.obtenerBuffer(rutaArchivo, 'evidencias');



    // Comentarios del revisor acumulados (v1..vN) anclados en Word.
    const comentarios = await this.evidenciaRepo.listarComentariosHastaVersion(
      id,
      numeroVersion,
    );

    if (comentarios.length > 0) {
      try {
        const resultado = await this.docx.inyectarComentariosWord(
          buffer,
          comentarios.map((c) => ({
            quote: c.quote ?? '',
            body: c.texto,
            autor: c.autor,
            fecha: c.createdAt,
          })),
        );
        buffer = resultado.buffer;
        if (resultado.inyectados === 0) {
          const soloDeEstaVersion = comentarios.every(
            (c) => (c.numeroVersion ?? numeroVersion) === numeroVersion,
          );
          this.logger.error(
            `Comentarios de evidencia ${id} v<=${numeroVersion}: 0 de ${comentarios.length} anclados (${resultado.omitidos} omitidos).`,
          );
          if (soloDeEstaVersion) {
            throw new BadRequestException(
              'No se pudieron anclar los comentarios del revisor en el documento. Intente de nuevo o contacte al administrador.',
            );
          }
          this.logger.warn(
            `Se sirve v${numeroVersion} sin comentarios de versiones previas (texto ya corregido).`,
          );
        }
        if (resultado.omitidos > 0) {
          this.logger.warn(
            `Comentarios de evidencia ${id} v<=${numeroVersion}: ${resultado.omitidos} omitidos por cita sin coincidencia.`,
          );
        }
      } catch (err) {
        if (err instanceof BadRequestException) throw err;
        this.logger.error(
          `No se pudieron inyectar comentarios en evidencia ${id} v<=${numeroVersion}: ${err instanceof Error ? err.message : err}`,
        );
        throw new BadRequestException(
          'No se pudo preparar el documento con los comentarios del revisor. Intente de nuevo o contacte al administrador.',
        );
      }
    }

    // Firma única por descarga: liga el archivo servido a esta evidencia/versión.
    const firmaDescarga = this.docx.generarValorFirma(id, numeroVersion);

    try {

      buffer = await this.docx.firmarDescarga(buffer, firmaDescarga);

      await this.evidenciaRepo.actualizarVersion(id, numeroVersion, {

        firmaDescarga,

      });

    } catch (err) {

      this.logger.warn(

        `No se pudo firmar la descarga de evidencia ${id} v${numeroVersion}: ${err instanceof Error ? err.message : err}`,

      );

    }



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

      const mime = (archivo.mimetype ?? '').toLowerCase();

      const mimeAceptado =

        mime === '' ||

        mime === 'application/octet-stream' ||

        mime === 'application/zip' ||

        mime === 'application/x-zip-compressed';

      if (!mimeAceptado) {

        throw new BadRequestException(

          'Formato no válido. Suba un archivo .docx de Microsoft Word.',

        );

      }

    }

    this.docx.validarEsDocxZip(archivo.buffer);

    if (archivo.size > TAMANO_MAXIMO) {

      throw new BadRequestException('El archivo supera el tamaño máximo de 20 MB.');

    }

  }



  private async verificarAccesoLectura(

    evidencia: { id: string; estado: EstadoEvidencia; autorId: string; programaId: string | null },

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

      await this.exigirProgramaAsignadoSiAplica(usuario, evidencia.programaId);

      return;

    }



    if (usuario.rol === RolUsuario.Revisor) {

      if (evidencia.estado === EstadoEvidencia.Borrador) {

        throw new ForbiddenException('El revisor no consulta borradores.');

      }

      await this.exigirProgramaAsignadoSiAplica(usuario, evidencia.programaId);

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



  /** Evidencias G3/G4 (institucionales) no tienen programaId; omitir verificación de alcance. */

  private async exigirProgramaAsignadoSiAplica(usuario: UsuarioToken, programaId: string | null) {

    if (!programaId) return;

    await this.exigirProgramaAsignado(usuario, programaId);

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
   * - G3/G4 → institución (la indicada o la única configurada, la CUAC). No aceptan programa.
   * - G1/G2 o sin guía → programa asignado al Cargador. No aceptan institución.
   * Quien carga documentos institucionales debe tener al menos un programa asignado
   * (salvo el SuperAdmin), la misma condición que exigía el «programa de referencia».
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
        ? await this.prisma.institucion.findUnique({ where: { id: dto.institucionId } })
        : await this.prisma.institucion.findFirst({ orderBy: { createdAt: 'asc' } });
      if (!institucion) {
        throw new BadRequestException(
          dto.institucionId
            ? 'La institución indicada no existe.'
            : 'No hay institución configurada para evidencias G3/G4.',
        );
      }

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
      throw new BadRequestException('Solo los documentos G3 y G4 se asocian a la institución.');
    }

    if (!dto.programaId) {
      throw new BadRequestException('Seleccione el programa del documento.');
    }

    await this.exigirProgramaAsignado(usuario, dto.programaId);

    const programa = await this.evidenciaRepo.buscarPrograma(dto.programaId);
    if (!programa) {
      throw new BadRequestException(
        'El programa seleccionado no existe. Actualice la lista de programas y vuelva a intentarlo.',
      );
    }

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


  private normalizarEstadoFiltro(
    estado: FiltrosEvidencia['estado'] | string | undefined,
  ): EstadoEvidencia | undefined {
    if (!estado) return undefined;
    const mapa: Record<string, EstadoEvidencia> = {
      Borrador: EstadoEvidencia.Borrador,
      EnRevision: EstadoEvidencia.EnRevision,
      Validado: EstadoEvidencia.Validado,
      Rechazado: EstadoEvidencia.Rechazado,
      ConObservaciones: EstadoEvidencia.ConObservaciones,
      Cumple: EstadoEvidencia.Cumple,
      // Aliases legacy → estados canónicos actuales (HU-003 D1).
      Aprobado: EstadoEvidencia.Validado,
      Validada: EstadoEvidencia.Validado,
      NoCumple: EstadoEvidencia.ConObservaciones,
      EnCorreccion: EstadoEvidencia.ConObservaciones,
      Correccion: EstadoEvidencia.ConObservaciones,
      Rechazada: EstadoEvidencia.Rechazado,
      Pendiente: EstadoEvidencia.EnRevision,
      EnProceso: EstadoEvidencia.EnRevision,
      'EnRevisión': EstadoEvidencia.EnRevision,
    };
    return mapa[estado];
  }


  private combinarComentariosInline(

    observaciones: string | null | undefined,

    comentarios?: DictaminarDto['comentariosInline'],

  ): string | undefined {

    const validos = (comentarios ?? []).filter((c) => c.texto?.trim());

    if (validos.length === 0) return observaciones ?? undefined;

    const bloque = [

      'Comentarios sobre el documento:',

      ...validos.map((comentario) => {

        const cita = comentario.quote?.trim() || comentario.cita?.trim();

        return `• ${cita ? `«${cita}» — ` : ''}${comentario.texto.trim()}`;

      }),

    ].join('\n');

    return observaciones?.trim() ? `${observaciones}\n\n${bloque}` : bloque;

  }


  async compararVersiones(

    id: string,

    versionA: number,

    versionB: number,

    usuario: UsuarioToken,

  ) {

    await this.obtenerPorId(id, usuario);



    if (

      !Number.isInteger(versionA) ||

      !Number.isInteger(versionB) ||

      versionA < 1 ||

      versionB < 1

    ) {

      throw new BadRequestException(

        'Las versiones a comparar deben ser números enteros positivos.',

      );

    }

    if (versionA === versionB) {

      throw new BadRequestException(

        'Seleccione dos versiones diferentes para comparar.',

      );

    }



    const [registroA, registroB] = await Promise.all([

      this.evidenciaRepo.buscarVersion(id, versionA),

      this.evidenciaRepo.buscarVersion(id, versionB),

    ]);

    if (!registroA) throw new NotFoundException(`Versión ${versionA} no encontrada.`);

    if (!registroB) throw new NotFoundException(`Versión ${versionB} no encontrada.`);



    const [bufferA, bufferB] = await Promise.all([

      this.almacenamiento.obtenerBuffer(registroA.rutaArchivo, 'evidencias'),

      this.almacenamiento.obtenerBuffer(registroB.rutaArchivo, 'evidencias'),

    ]);



    const diff = await this.docx.compararVersiones(bufferA, bufferB);

    return {

      ...diff,

      versionA,

      versionB,

      nombreArchivoA: registroA.nombreArchivo,

      nombreArchivoB: registroB.nombreArchivo,

    };

  }


  async listarComentarios(id: string, usuario: UsuarioToken, version?: number) {

    const evidencia = await this.obtenerPorId(id, usuario);

    const numeroVersion = version ?? evidencia.version ?? 1;

    return this.evidenciaRepo.listarComentariosVersion(id, numeroVersion);

  }


  private async procesarDocxTrasRechazo(

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

}

import {

  Injectable,

  NotFoundException,

  ForbiddenException,

  BadRequestException,

  Logger,

} from '@nestjs/common';

import { RolUsuario, EstadoEvidencia } from '@prisma/client';

import { EvidenciaRepositorio, FiltrosEvidencia } from './evidencia.repositorio';

import { AlmacenamientoService } from '../almacenamiento/almacenamiento.service';

import { NotificacionesService } from '../notificaciones/notificaciones.service';

import { CrearEvidenciaDto, ActualizarEvidenciaDto } from './dto/evidencia.dto';

import { DictaminarDto } from '../aprobacion/dto/dictaminar.dto';

import { AvanceProgramaService } from '../programas/avance-programa.service';

import {

  CODIGOS_CONDICION_DOCUMENTO_MAESTRO,

  calcularPorcentajeCondiciones,

  etiquetaCondicion,

} from '../dominio/condiciones-documento-maestro';

import { ServicioManipulacionDocx } from '../docx/servicio-manipulacion-docx.service';



const TIPOS_PERMITIDOS = [

  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',

];

const TAMANO_MAXIMO = 20 * 1024 * 1024;



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

  ) {}



  async crearConArchivo(

    dto: CrearEvidenciaDto,

    archivo: Express.Multer.File,

    usuario: UsuarioToken,

  ) {

    this.validarArchivo(archivo);



    const programa = await this.evidenciaRepo.buscarPrograma(dto.programaId);

    if (!programa) {

      throw new BadRequestException(

        'El programa seleccionado no existe. Actualice la lista de programas y vuelva a intentarlo.',

      );

    }



    if (dto.documentoRequeridoId) {

      const documento = await this.evidenciaRepo.buscarDocumentoRequerido(

        dto.documentoRequeridoId,

      );

      if (!documento) {

        throw new BadRequestException('El documento requerido no existe.');

      }

    }



    const requiereChecklist =
      dto.requiereChecklistMaestro === 'true' ||
      dto.requiereChecklistMaestro === '1';

    const evidencia = await this.evidenciaRepo.crear({

      nombre: dto.nombre,

      programa: { connect: { id: dto.programaId } },

      periodo: dto.periodo,

      factor: dto.factor,

      indicador: dto.indicador,

      autor: { connect: { id: usuario.id } },

      nombreArchivo: archivo.originalname,

      responsable: dto.responsable,

      estado: EstadoEvidencia.Borrador,

      requiereChecklistMaestro: requiereChecklist,

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

    const filtrosAplicados = { ...filtros };

    filtrosAplicados.estado = this.normalizarEstadoFiltro(filtros.estado);



    if (this.esSuperAdmin(usuario)) {

      const [datos, total] = await this.evidenciaRepo.listar(filtrosAplicados);

      return {

        datos,

        total,

        pagina: filtros.pagina ?? 1,

        limite: filtros.limite ?? 20,

      };

    }



    if (usuario.rol === RolUsuario.Cargador) {

      filtrosAplicados.autorId = usuario.id;

    }



    if (usuario.rol === RolUsuario.ParAcademico) {

      filtrosAplicados.soloValidados = true;

    }



    const [datos, total] = await this.evidenciaRepo.listar(filtrosAplicados);

    return {

      datos,

      total,

      pagina: filtros.pagina ?? 1,

      limite: filtros.limite ?? 20,

    };

  }



  async obtenerPorId(id: string, usuario: UsuarioToken) {

    const evidencia = await this.evidenciaRepo.buscarPorId(id);

    if (!evidencia) throw new NotFoundException('Evidencia no encontrada.');



    this.verificarAccesoLectura(evidencia, usuario);

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



    if (

      evidencia.estado !== EstadoEvidencia.Borrador &&

      evidencia.estado !== EstadoEvidencia.Rechazado

    ) {

      throw new BadRequestException(

        'Solo se puede cargar una nueva versión en borrador o rechazado.',

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



    if (evidencia.estado !== EstadoEvidencia.Borrador && evidencia.estado !== EstadoEvidencia.Rechazado) {

      throw new BadRequestException('Solo borradores o rechazados pueden enviarse a revisión.');

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

    if (

      !this.esSuperAdmin(revisor) &&

      revisor.rol !== RolUsuario.Revisor &&

      revisor.rol !== RolUsuario.Administrador

    ) {

      throw new ForbiddenException('Solo revisores pueden dictaminar evidencias.');

    }



    const evidencia = await this.evidenciaRepo.buscarPorId(id);

    if (!evidencia) throw new NotFoundException('Evidencia no encontrada.');



    if (evidencia.estado !== EstadoEvidencia.EnRevision) {

      throw new BadRequestException('Solo se pueden dictaminar evidencias en revisión.');

    }



    const usaChecklist =

      evidencia.requiereChecklistMaestro ||

      (dto.condiciones && dto.condiciones.length > 0);



    let estadoFinal = dto.estado;

    let porcentajeCompletitud = evidencia.porcentajeCompletitud;

    let observacionesResumen = dto.observaciones;



    if (usaChecklist) {

      if (!dto.condiciones || dto.condiciones.length !== CODIGOS_CONDICION_DOCUMENTO_MAESTRO.length) {

        throw new BadRequestException(

          'Debe evaluar las 9 condiciones del Documento Maestro.',

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



      const cumplidas = dto.condiciones.filter((c) => c.cumple).length;

      porcentajeCompletitud = calcularPorcentajeCondiciones(cumplidas);

      estadoFinal =

        cumplidas === CODIGOS_CONDICION_DOCUMENTO_MAESTRO.length

          ? EstadoEvidencia.Validado

          : EstadoEvidencia.Rechazado;



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

        .map(

          (c) =>

            `• ${etiquetaCondicion(c.codigo)}: ${c.observacion?.trim()}`,

        );

      observacionesResumen =

        lineasObservacion.length > 0

          ? lineasObservacion.join('\n')

          : dto.observaciones;

    } else {

      if (

        estadoFinal !== EstadoEvidencia.Validado &&

        estadoFinal !== EstadoEvidencia.Rechazado

      ) {

        throw new BadRequestException('El dictamen debe ser Validado o Rechazado.');

      }

      porcentajeCompletitud =

        estadoFinal === EstadoEvidencia.Validado ? 100 : porcentajeCompletitud;

    }



    if (!estadoFinal) {

      throw new BadRequestException('El dictamen debe incluir un estado válido.');

    }



    observacionesResumen = this.combinarComentariosInline(

      observacionesResumen,

      dto.comentariosInline,

    );



    if (estadoFinal === EstadoEvidencia.Rechazado && dto.comentariosInline?.length) {

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



    const actualizada = await this.evidenciaRepo.actualizar(id, {

      estado: estadoFinal,

      observaciones: observacionesResumen,

      porcentajeCompletitud,

    });



    await this.evidenciaRepo.registrarHistorial(

      id,

      estadoFinal,

      observacionesResumen,

      revisor.id,

    );



    await this.avancePrograma.recalcularPorcentajeAvance(evidencia.programaId);



    const tipo = estadoFinal === EstadoEvidencia.Validado ? 'aprobacion' : 'rechazo';

    const mensaje =

      estadoFinal === EstadoEvidencia.Validado

        ? `Tu evidencia "${evidencia.nombre}" fue aprobada (${porcentajeCompletitud}%).`

        : `Tu evidencia "${evidencia.nombre}" requiere corrección (${porcentajeCompletitud}%): ${observacionesResumen ?? 'Revisa las condiciones marcadas.'}`;



    await this.notificaciones.crear(evidencia.autorId, mensaje, tipo);



    if (

      estadoFinal === EstadoEvidencia.Rechazado &&

      usaChecklist &&

      dto.condiciones &&

      evidencia.rutaArchivo

    ) {

      await this.procesarDocxTrasRechazo(

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



  async listarMisRevisionesRevisor(

    usuario: UsuarioToken,

    pagina = 1,

    limite = 20,

  ) {

    if (

      !this.esSuperAdmin(usuario) &&

      usuario.rol !== RolUsuario.Revisor &&

      usuario.rol !== RolUsuario.Administrador

    ) {

      throw new ForbiddenException('Solo revisores pueden consultar este historial.');

    }

    return this.evidenciaRepo.listarEnviosRevisionParaRevisor(pagina, limite);

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



  async obtenerEvaluacionesCondicion(id: string, usuario: UsuarioToken) {

    await this.obtenerPorId(id, usuario);

    const evaluaciones = await this.evidenciaRepo.listarEvaluacionesCondicion(id);

    if (evaluaciones.length === 0) return [];

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

          })),

        );

        buffer = resultado.buffer;

        if (resultado.inyectados === 0) {

          this.logger.error(

            `Comentarios de evidencia ${id} v<=${numeroVersion}: 0 de ${comentarios.length} anclados (${resultado.omitidos} omitidos).`,

          );

          throw new BadRequestException(

            'No se pudieron anclar los comentarios del revisor en el documento. Intente de nuevo o contacte al administrador.',

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



  async listarComentarios(id: string, usuario: UsuarioToken, version?: number) {

    const evidencia = await this.obtenerPorId(id, usuario);

    const numeroVersion = version ?? evidencia.version ?? 1;

    return this.evidenciaRepo.listarComentariosVersion(id, numeroVersion);

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
      Cumple: EstadoEvidencia.Validado,
      Aprobado: EstadoEvidencia.Validado,
      Validada: EstadoEvidencia.Validado,
      ConObservaciones: EstadoEvidencia.Rechazado,
      NoCumple: EstadoEvidencia.Rechazado,
      EnCorreccion: EstadoEvidencia.Rechazado,
      Correccion: EstadoEvidencia.Rechazado,
      Rechazada: EstadoEvidencia.Rechazado,
      Pendiente: EstadoEvidencia.EnRevision,
      EnProceso: EstadoEvidencia.EnRevision,
      'EnRevisión': EstadoEvidencia.EnRevision,
    };
    return mapa[estado];
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



  private verificarAccesoLectura(

    evidencia: { estado: EstadoEvidencia; autorId: string },

    usuario: UsuarioToken,

  ) {

    if (this.esSuperAdmin(usuario)) return;



    if (

      usuario.rol === RolUsuario.ParAcademico &&

      evidencia.estado !== EstadoEvidencia.Validado

    ) {

      throw new ForbiddenException('No tiene permiso para ver borradores.');

    }

    if (usuario.rol === RolUsuario.Cargador && evidencia.autorId !== usuario.id) {

      throw new ForbiddenException('No tiene acceso a esta evidencia.');

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

}



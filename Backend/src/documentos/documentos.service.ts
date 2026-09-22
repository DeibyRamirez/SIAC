import {

  Injectable,

  NotFoundException,

  ForbiddenException,

  BadRequestException,

} from '@nestjs/common';

import { RolUsuario, EstadoEvidencia } from '@prisma/client';

import { EvidenciaRepositorio, FiltrosEvidencia } from './evidencia.repositorio';

import { AlmacenamientoService } from '../almacenamiento/almacenamiento.service';

import { NotificacionesService } from '../notificaciones/notificaciones.service';

import { CrearEvidenciaDto, ActualizarEvidenciaDto } from './dto/evidencia.dto';

import { DictaminarDto } from '../aprobacion/dto/dictaminar.dto';
import { decodificarNombreArchivoMultipart } from '../almacenamiento/utilidades-nombre-archivo';



const TIPOS_PERMITIDOS = [

  'application/pdf',

  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',

  'application/vnd.ms-excel',

];

const TAMANO_MAXIMO = 20 * 1024 * 1024;



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

  ) {}



  async crearConArchivo(

    dto: CrearEvidenciaDto,

    archivo: Express.Multer.File,

    usuario: UsuarioToken,

  ) {

    this.validarArchivo(archivo);

    const nombreArchivo = decodificarNombreArchivoMultipart(archivo.originalname);

    const evidencia = await this.evidenciaRepo.crear({

      nombre: dto.nombre,

      programa: { connect: { id: dto.programaId } },

      periodo: dto.periodo,

      factor: dto.factor,

      indicador: dto.indicador,

      autor: { connect: { id: usuario.id } },

      nombreArchivo,

      responsable: dto.responsable,

      estado: EstadoEvidencia.Borrador,

    });



    const clave = this.almacenamiento.generarClaveEvidencia(

      evidencia.id,

      nombreArchivo,

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

        nombreArchivo,

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

    const nombreArchivo = decodificarNombreArchivoMultipart(archivo.originalname);

    const evidencia = await this.obtenerPorId(id, usuario);

    this.verificarEdicion(evidencia, usuario);



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

      nombreArchivo,

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

        nombreArchivo,

        rutaArchivo: clave,

        mimeType: archivo.mimetype,

        tamanoBytes: archivo.size,

        subidoPorId: usuario.id,

      });



      await this.evidenciaRepo.actualizar(id, {

        nombreArchivo,

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



    if (

      dto.estado !== EstadoEvidencia.Validado &&

      dto.estado !== EstadoEvidencia.Rechazado

    ) {

      throw new BadRequestException('El dictamen debe ser Validado o Rechazado.');

    }



    const evidencia = await this.evidenciaRepo.buscarPorId(id);

    if (!evidencia) throw new NotFoundException('Evidencia no encontrada.');



    if (evidencia.estado !== EstadoEvidencia.EnRevision) {

      throw new BadRequestException('Solo se pueden dictaminar evidencias en revisión.');

    }



    const actualizada = await this.evidenciaRepo.actualizar(id, {

      estado: dto.estado,

      observaciones: dto.observaciones,

    });



    await this.evidenciaRepo.registrarHistorial(

      id,

      dto.estado,

      dto.observaciones,

      revisor.id,

    );



    const tipo = dto.estado === EstadoEvidencia.Validado ? 'aprobacion' : 'rechazo';

    const mensaje =

      dto.estado === EstadoEvidencia.Validado

        ? `Tu evidencia "${evidencia.nombre}" fue aprobada.`

        : `Tu evidencia "${evidencia.nombre}" fue rechazada: ${dto.observaciones ?? 'Sin observaciones.'}`;



    await this.notificaciones.crear(evidencia.autorId, mensaje, tipo);



    return actualizada;

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



  private validarArchivo(archivo: Express.Multer.File) {

    if (!archivo) throw new BadRequestException('Se requiere un archivo.');

    if (!TIPOS_PERMITIDOS.includes(archivo.mimetype)) {

      throw new BadRequestException('Solo se permiten PDF o XLSX.');

    }

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

}



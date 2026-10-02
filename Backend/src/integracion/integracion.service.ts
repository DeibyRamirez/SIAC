import { Injectable, BadGatewayException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.module';
import { OrigenDato, RolUsuario, TipoTramiteSIAC } from '@prisma/client';
import { generarSlug } from '../common/alcance/generar-slug';
import {
  mapearCarrerasExternas,
  ProgramaCatalogoExterno,
  RespuestaCarrerasExternasDto,
} from './mapear-carrera-externa';

const URL_CARRERAS_DEFECTO = 'https://backend-lac-theta-94.vercel.app/carreras';

interface ProgramaExterno {
  idExterno: string;
  codigo: string;
  nombre: string;
  nivel: string;
  modalidad?: string;
  codigoSnies?: string;
}

interface UsuarioExterno {
  idExterno: string;
  correo: string;
  nombre: string;
  cargo?: string;
  dependencia?: string;
  codigoInstitucional?: string;
  activo?: boolean;
}

interface VinculoExterno {
  usuarioIdExterno: string;
  programaCodigo: string;
}

@Injectable()
export class IntegracionService {
  private readonly logger = new Logger(IntegracionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async sincronizarDesdeTi(): Promise<{
    programas: number;
    usuarios: number;
    vinculos: number;
    origen: OrigenDato;
  }> {
    const urlTi = this.config.get<string>('TI_API_URL');

    if (!urlTi) {
      return this.sincronizarDesdeDatosLocales();
    }

    try {
      const token = this.config.get<string>('TI_API_TOKEN');
      const respuesta = await fetch(urlTi, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (!respuesta.ok) {
        throw new Error(`API TI respondió ${respuesta.status}`);
      }

      const datos = (await respuesta.json()) as {
        programas?: ProgramaExterno[];
        usuarios?: UsuarioExterno[];
        vinculos?: VinculoExterno[];
      };

      const programas = await this.upsertProgramas(datos.programas ?? [], OrigenDato.API);
      const usuarios = await this.upsertUsuarios(datos.usuarios ?? [], OrigenDato.API);
      const vinculos = await this.upsertVinculos(datos.vinculos ?? []);

      return { programas, usuarios, vinculos, origen: OrigenDato.API };
    } catch (error) {
      this.logger.error('Fallo sincronización TI', error);
      throw new BadGatewayException(
        'No se pudo sincronizar con el sistema institucional. Se mantiene la última copia local.',
      );
    }
  }

  async sincronizarDesdeCarreras(): Promise<{
    importados: number;
    actualizados: number;
    desactivados: number;
    total: number;
    totalEnBd: number;
    origen: OrigenDato;
  }> {
    const url =
      this.config.get<string>('CARRERAS_API_URL')?.trim() || URL_CARRERAS_DEFECTO;

    try {
      const respuesta = await fetch(url);
      if (!respuesta.ok) {
        throw new Error(`API de carreras respondió ${respuesta.status}`);
      }

      const datos = (await respuesta.json()) as RespuestaCarrerasExternasDto;
      if (!datos.success || !Array.isArray(datos.carreras)) {
        throw new Error('Respuesta inválida de la API de carreras.');
      }

      const baseImagenes =
        this.config.get<string>('CARRERAS_IMAGENES_BASE_URL')?.trim() ||
        'http://localhost:3000';
      const catalogo = mapearCarrerasExternas(datos.carreras, { baseImagenes });
      const { importados, actualizados } = await this.upsertCatalogoProgramas(
        catalogo,
        OrigenDato.API,
      );
      const desactivados = await this.desactivarProgramasAusentesDelCatalogo(
        catalogo.map((item) => item.idExterno),
      );
      const totalEnBd = await this.prisma.programa.count({
        where: { origenDato: OrigenDato.API },
      });

      this.logger.log(
        `Carreras sincronizadas: ${importados} nuevas, ${actualizados} actualizadas, ${desactivados} desactivadas (${catalogo.length} en API, ${totalEnBd} en BD).`,
      );

      return {
        importados,
        actualizados,
        desactivados,
        total: catalogo.length,
        totalEnBd,
        origen: OrigenDato.API,
      };
    } catch (error) {
      this.logger.error('Fallo sincronización de carreras', error);
      throw new BadGatewayException(
        'No se pudo sincronizar el catálogo de carreras desde la API externa.',
      );
    }
  }

  async sincronizarDesdeCsv(contenido: string): Promise<{
    programas: number;
    usuarios: number;
    vinculos: number;
    origen: OrigenDato;
  }> {
    const lineas = contenido.trim().split('\n').slice(1);
    const programas: ProgramaExterno[] = [];

    for (const linea of lineas) {
      const [codigo, nombre, nivel, modalidad] = linea.split(',').map((c) => c.trim());
      if (!codigo || !nombre) continue;
      programas.push({
        idExterno: codigo,
        codigo,
        nombre,
        nivel: nivel ?? 'Pregrado',
        modalidad,
      });
    }

    const count = await this.upsertProgramas(programas, OrigenDato.CSV);
    return { programas: count, usuarios: 0, vinculos: 0, origen: OrigenDato.CSV };
  }

  private async sincronizarDesdeDatosLocales() {
    const programas = await this.prisma.programa.count();
    const usuarios = await this.prisma.usuario.count();
    const vinculos = await this.prisma.usuarioPrograma.count();
    return { programas, usuarios, vinculos, origen: OrigenDato.Manual };
  }

  private async upsertCatalogoProgramas(
    items: ProgramaCatalogoExterno[],
    origen: OrigenDato,
  ): Promise<{ importados: number; actualizados: number }> {
    let importados = 0;
    let actualizados = 0;
    const ahora = new Date();

    for (const item of items) {
      const datosCatalogo = {
        nombre: item.nombre,
        nivel: item.nivel,
        modalidad: item.modalidad,
        facultad: item.facultad,
        duracionSemestres: item.duracionSemestres,
        urlImagen: item.urlImagen,
        activo: item.activo,
        idExterno: item.idExterno,
        origenDato: origen,
        fechaSincronizacion: ahora,
      };

      const porIdExterno = await this.prisma.programa.findUnique({
        where: { idExterno: item.idExterno },
      });

      if (porIdExterno) {
        await this.prisma.programa.update({
          where: { id: porIdExterno.id },
          data: datosCatalogo,
        });
        actualizados++;
        continue;
      }

      const porCodigo = await this.prisma.programa.findUnique({
        where: { codigo: item.codigo },
      });

      if (porCodigo) {
        await this.prisma.programa.update({
          where: { id: porCodigo.id },
          data: datosCatalogo,
        });
        actualizados++;
        continue;
      }

      const porSlug = await this.prisma.programa.findUnique({
        where: { slug: item.slug },
      });

      if (porSlug) {
        await this.prisma.programa.update({
          where: { id: porSlug.id },
          data: datosCatalogo,
        });
        actualizados++;
        continue;
      }

      const slugLibre = await this.resolverSlugEnBaseDeDatos(item.slug, item.idExterno, item.nombre);

      await this.prisma.programa.create({
        data: {
          codigo: item.codigo,
          nombre: item.nombre,
          slug: slugLibre,
          nivel: item.nivel,
          modalidad: item.modalidad,
          facultad: item.facultad,
          duracionSemestres: item.duracionSemestres,
          urlImagen: item.urlImagen,
          activo: item.activo,
          idExterno: item.idExterno,
          origenDato: origen,
          fechaSincronizacion: ahora,
          tipoTramiteActivo: TipoTramiteSIAC.RenovacionRegistroCalificado,
          porcentajeAvance: 0,
          estadoProceso: 'En progreso',
        },
      });
      importados++;
    }

    return { importados, actualizados };
  }

  /**
   * Marca inactivos los programas importados de API que ya no aparecen en el catálogo externo.
   * No borra filas ni toca evidencias ni asignaciones.
   */
  private async desactivarProgramasAusentesDelCatalogo(
    idsExternosActivos: string[],
  ): Promise<number> {
    const resultado = await this.prisma.programa.updateMany({
      where: {
        origenDato: OrigenDato.API,
        idExterno: { not: null, notIn: idsExternosActivos },
        activo: true,
      },
      data: { activo: false },
    });
    return resultado.count;
  }

  /** Evita colisión de slug con programas manuales u otras carreras ya persistidas. */
  private async resolverSlugEnBaseDeDatos(
    slugBase: string,
    idExterno: string,
    nombre: string,
  ): Promise<string> {
    const candidatos = [
      slugBase,
      generarSlug(`${nombre}-${idExterno.slice(-6)}`),
      generarSlug(idExterno),
    ];

    for (const candidato of candidatos) {
      const ocupado = await this.prisma.programa.findUnique({
        where: { slug: candidato },
        select: { id: true },
      });
      if (!ocupado) return candidato;
    }

    return generarSlug(`${idExterno}-${Date.now()}`);
  }

  private async upsertProgramas(items: ProgramaExterno[], origen: OrigenDato): Promise<number> {
    let count = 0;
    const ahora = new Date();

    for (const item of items) {
      await this.prisma.programa.upsert({
        where: { codigo: item.codigo },
        update: {
          nombre: item.nombre,
          nivel: item.nivel,
          modalidad: item.modalidad,
          codigoSnies: item.codigoSnies,
          idExterno: item.idExterno,
          origenDato: origen,
          fechaSincronizacion: ahora,
        },
        create: {
          codigo: item.codigo,
          nombre: item.nombre,
          slug: generarSlug(`${item.nombre}-${item.codigo}`),
          nivel: item.nivel,
          modalidad: item.modalidad,
          codigoSnies: item.codigoSnies,
          idExterno: item.idExterno,
          origenDato: origen,
          fechaSincronizacion: ahora,
        },
      });
      count++;
    }

    return count;
  }

  private async upsertUsuarios(items: UsuarioExterno[], origen: OrigenDato): Promise<number> {
    let count = 0;
    const ahora = new Date();

    for (const item of items) {
      await this.prisma.usuario.upsert({
        where: { correo: item.correo },
        update: {
          nombre: item.nombre,
          cargo: item.cargo,
          dependencia: item.dependencia,
          codigoInstitucional: item.codigoInstitucional,
          activo: item.activo ?? true,
          idExterno: item.idExterno,
          origenDato: origen,
          fechaSincronizacion: ahora,
        },
        create: {
          correo: item.correo,
          nombre: item.nombre,
          contrasena: '$2a$10$placeholder.sin.login.ti',
          rol: RolUsuario.Cargador,
          cargo: item.cargo,
          dependencia: item.dependencia,
          codigoInstitucional: item.codigoInstitucional,
          activo: item.activo ?? true,
          idExterno: item.idExterno,
          origenDato: origen,
          fechaSincronizacion: ahora,
        },
      });
      count++;
    }

    return count;
  }

  private async upsertVinculos(items: VinculoExterno[]): Promise<number> {
    let count = 0;

    for (const item of items) {
      const usuario = await this.prisma.usuario.findFirst({
        where: { idExterno: item.usuarioIdExterno },
      });
      const programa = await this.prisma.programa.findUnique({
        where: { codigo: item.programaCodigo },
      });

      if (!usuario || !programa) continue;

      const existente = await this.prisma.usuarioPrograma.findFirst({
        where: { usuarioId: usuario.id, programaId: programa.id },
      });

      if (!existente) {
        await this.prisma.usuarioPrograma.create({
          data: { usuarioId: usuario.id, programaId: programa.id },
        });
        count++;
      }
    }

    return count;
  }
}

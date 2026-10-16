import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { normalizarUrlPublicaPowerBi } from '../common/config/configuracion.env';
import { PrismaService } from '../prisma/prisma.module';
import {
  CATEGORIAS_INFORME_POWERBI,
  esCategoriaInformePowerBi,
} from './categorias-powerbi';
import { hashUrlPublicaPowerBi, prepararUrlPublicaPowerBiEntrada } from './powerbi-url.util';

export interface EmbedTokenRespuesta {
  embedUrl: string;
  embedToken: string | null;
  reportId: string;
  categoriaId: string | null;
  fallback: boolean;
  mensaje?: string;
}

export interface InformePowerBiMetadatos {
  categoriaId: string;
  configurado: boolean;
  urlHash: string | null;
  activo: boolean;
  updatedAt: string | null;
}

export interface InformePowerBiUrlRespuesta {
  categoriaId: string;
  url: string;
  urlHash: string;
}

const CATEGORIAS_EMBED = new Set(['estudiantes']);

@Injectable()
export class PowerBiService {
  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async listarInformes(): Promise<InformePowerBiMetadatos[]> {
    const filas = await this.prisma.configuracionInformePowerBi.findMany();
    const porId = new Map(filas.map((f) => [f.categoriaId, f]));
    return CATEGORIAS_INFORME_POWERBI.map((categoriaId) => {
      const fila = porId.get(categoriaId);
      if (!fila || !fila.activo) {
        return {
          categoriaId,
          configurado: false,
          urlHash: null,
          activo: false,
          updatedAt: null,
        };
      }
      return {
        categoriaId,
        configurado: true,
        urlHash: fila.urlHash,
        activo: fila.activo,
        updatedAt: fila.updatedAt.toISOString(),
      };
    });
  }

  async obtenerUrlPublicaCategoria(categoriaId: string): Promise<InformePowerBiUrlRespuesta> {
    if (!esCategoriaInformePowerBi(categoriaId)) {
      throw new BadRequestException('Categoría de informe no válida.');
    }
    const url = await this.resolverUrlPublicaAlmacenada(categoriaId);
    if (!url) {
      throw new NotFoundException('No hay URL configurada para esta categoría.');
    }
    const fila = await this.prisma.configuracionInformePowerBi.findUnique({
      where: { categoriaId },
    });
    return {
      categoriaId,
      url,
      urlHash: fila?.urlHash ?? hashUrlPublicaPowerBi(url),
    };
  }

  async guardarUrlPublica(
    categoriaId: string,
    entrada: string,
    actualizadoPorId: string,
  ): Promise<InformePowerBiMetadatos> {
    if (!esCategoriaInformePowerBi(categoriaId)) {
      throw new BadRequestException('Categoría de informe no válida.');
    }
    const urlPublica = prepararUrlPublicaPowerBiEntrada(entrada);
    if (!urlPublica) {
      throw new BadRequestException(
        'La URL debe ser de Power BI «Publicar en la web» (https://app.powerbi.com/view?r=...).',
      );
    }
    const urlHash = hashUrlPublicaPowerBi(urlPublica);
    const fila = await this.prisma.configuracionInformePowerBi.upsert({
      where: { categoriaId },
      create: {
        categoriaId,
        urlPublica,
        urlHash,
        activo: true,
        actualizadoPorId,
      },
      update: {
        urlPublica,
        urlHash,
        activo: true,
        actualizadoPorId,
      },
    });
    return {
      categoriaId: fila.categoriaId,
      configurado: true,
      urlHash: fila.urlHash,
      activo: fila.activo,
      updatedAt: fila.updatedAt.toISOString(),
    };
  }

  private async resolverUrlPublicaAlmacenada(categoriaId: string): Promise<string> {
    const fila = await this.prisma.configuracionInformePowerBi.findUnique({
      where: { categoriaId },
    });
    if (fila?.activo && fila.urlPublica) {
      const normalizada = normalizarUrlPublicaPowerBi(fila.urlPublica);
      if (normalizada) return normalizada;
    }
    return '';
  }

  async obtenerEmbedToken(categoriaId?: string): Promise<EmbedTokenRespuesta> {
    const categoria = categoriaId?.trim() || null;

    if (categoria && !CATEGORIAS_EMBED.has(categoria)) {
      throw new BadRequestException(
        `La categoría «${categoria}» aún no tiene informe Power BI configurado.`,
      );
    }

    if (categoria === 'estudiantes') {
      return this.obtenerEmbedEstudiantes();
    }

    const reportId = this.config.get('POWERBI_REPORT_ID') ?? 'demo-report';
    const workspaceId = this.config.get('POWERBI_WORKSPACE_ID') ?? 'demo-workspace';
    const clientId = this.config.get('POWERBI_CLIENT_ID');

    if (!clientId) {
      return {
        embedUrl: '',
        embedToken: null,
        reportId,
        categoriaId: categoria,
        fallback: true,
        mensaje: 'Power BI no configurado. Usar gráficos nativos Recharts.',
      };
    }

    return {
      embedUrl: `https://app.powerbi.com/reportEmbed?reportId=${reportId}&groupId=${workspaceId}`,
      embedToken: 'token-simulado-desarrollo',
      reportId,
      categoriaId: categoria,
      fallback: false,
    };
  }

  private async obtenerEmbedEstudiantes(): Promise<EmbedTokenRespuesta> {
    const reportId = this.config.get<string>('POWERBI_REPORT_ID_ESTUDIANTES')?.trim() ?? '';
    const workspaceId = this.config.get('POWERBI_WORKSPACE_ID') ?? 'demo-workspace';
    const clientId = this.config.get('POWERBI_CLIENT_ID');
    const vistaPublica = await this.resolverUrlPublicaAlmacenada('estudiantes');

    if (!clientId && !vistaPublica) {
      return {
        embedUrl: '',
        embedToken: null,
        reportId,
        categoriaId: 'estudiantes',
        fallback: true,
        mensaje:
          'Informe público de Estudiantes no configurado. Usar gráficos nativos Recharts.',
      };
    }

    if (!clientId || !reportId) {
      if (!vistaPublica) {
        return {
          embedUrl: '',
          embedToken: null,
          reportId,
          categoriaId: 'estudiantes',
          fallback: true,
          mensaje:
            'Informe embebido de Estudiantes sin POWERBI_REPORT_ID_ESTUDIANTES. Usar gráficos nativos Recharts.',
        };
      }
      return {
        embedUrl: vistaPublica,
        embedToken: null,
        reportId,
        categoriaId: 'estudiantes',
        fallback: true,
        mensaje:
          'Modo demostración: informe publicado en iframe. Configure Azure para embed con token.',
      };
    }

    return {
      embedUrl: `https://app.powerbi.com/reportEmbed?reportId=${reportId}&groupId=${workspaceId}`,
      embedToken: 'token-simulado-desarrollo',
      reportId,
      categoriaId: 'estudiantes',
      fallback: false,
    };
  }
}

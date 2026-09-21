import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface EmbedTokenRespuesta {
  embedUrl: string;
  embedToken: string | null;
  reportId: string;
  fallback: boolean;
  mensaje?: string;
}

@Injectable()
export class PowerBiService {
  constructor(private readonly config: ConfigService) {}

  async obtenerEmbedToken(): Promise<EmbedTokenRespuesta> {
    const clientId = this.config.get('POWERBI_CLIENT_ID');
    const reportId = this.config.get('POWERBI_REPORT_ID') ?? 'demo-report';
    const workspaceId = this.config.get('POWERBI_WORKSPACE_ID') ?? 'demo-workspace';

    if (!clientId) {
      return {
        embedUrl: '',
        embedToken: null,
        reportId,
        fallback: true,
        mensaje: 'Power BI no configurado. Usar gráficos nativos Recharts.',
      };
    }

    // En producción: flujo OAuth Azure AD → embed token App Owns Data
    // Placeholder para integración real con Microsoft Graph / Power BI REST API
    return {
      embedUrl: `https://app.powerbi.com/reportEmbed?reportId=${reportId}&groupId=${workspaceId}`,
      embedToken: 'token-simulado-desarrollo',
      reportId,
      fallback: false,
    };
  }
}

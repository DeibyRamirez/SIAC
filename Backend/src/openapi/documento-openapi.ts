import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, OpenAPIObject, SwaggerModule } from '@nestjs/swagger';

/** La interfaz HTML de Swagger no se publica en producción (Render). */
export function exponerInterfazSwagger(nodeEnv: string | undefined = process.env.NODE_ENV): boolean {
  return nodeEnv !== 'production';
}

export function configuracionOpenApi() {
  return new DocumentBuilder()
    .setTitle('SIAC API')
    .setDescription(
      'Sistema Interno de Aseguramiento de la Calidad — CUAC. ' +
        'Contrato OpenAPI 3 de los endpoints existentes. ' +
        'Las rutas incluyen el prefijo /api/v1. ' +
        'La autenticación es Bearer JWT, salvo los endpoints marcados como públicos. ' +
        'El detalle de roles, errores, paginación y el contrato de datos Power BI está en docs/contrato-api/README.md.',
    )
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Token devuelto por POST /api/v1/auth/login. Cabecera: Authorization: Bearer <token>.',
      },
      'jwt',
    )
    .addTag('Autenticación', 'Inicio de sesión y perfil.')
    .addTag('Usuarios', 'Cuentas, roles y alcance por programa.')
    .addTag('Evidencias', 'Documentos guía, versiones, dictamen e ingesta.')
    .addTag('Plantillas', 'Biblioteca de plantillas .docx.')
    .addTag('Programas', 'Catálogo, panel y resolución MEN.')
    .addTag('Institución', 'Condiciones institucionales.')
    .addTag('Búsqueda', 'Búsqueda de evidencias y búsqueda unificada.')
    .addTag('Aprobación', 'Alias de la bandeja en revisión.')
    .addTag('Vigencias', 'Anexos, paquetes y demo del semáforo.')
    .addTag('Notificaciones', 'Alertas en la aplicación y bitácora de correo.')
    .addTag('Power BI', 'URLs públicas y token de embebido. No expone filas de la vista.')
    .addTag('Métricas', 'Alias de embed-token para el administrador.')
    .addTag('Estructura', 'Árbol de etapas, carpetas y documentos requeridos.')
    .addTag('Acreditación', 'Alias de lectura de etapas.')
    .addTag('Integración', 'Sincronización del catálogo institucional.')
    .addTag('Configuración', 'Umbrales del semáforo de vigencia.')
    .addTag('Salud', 'Health check público.')
    .addTag('Almacenamiento', 'Descarga del disco local de desarrollo.')
    .build();
}

export function crearDocumentoOpenApi(app: INestApplication): OpenAPIObject {
  return SwaggerModule.createDocument(app, configuracionOpenApi(), {
    operationIdFactory: (controlador: string, metodo: string) => `${controlador}_${metodo}`,
  });
}

/** Orden estable de claves para comparar el documento generado con el archivo exportado. */
export function canonizarOpenApi(valor: unknown): unknown {
  if (Array.isArray(valor)) return valor.map((item) => canonizarOpenApi(item));
  if (valor && typeof valor === 'object') {
    const origen = valor as Record<string, unknown>;
    const ordenado: Record<string, unknown> = {};
    for (const clave of Object.keys(origen).sort()) {
      ordenado[clave] = canonizarOpenApi(origen[clave]);
    }
    return ordenado;
  }
  return valor;
}

export function serializarOpenApi(documento: OpenAPIObject): string {
  return `${JSON.stringify(canonizarOpenApi(documento), null, 2)}\n`;
}

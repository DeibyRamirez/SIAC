/**
 * Prueba rápida de PutObject contra Supabase S3 (usa Backend/.env).
 * Uso: pnpm exec ts-node scripts/probar-storage.ts
 */
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { AlmacenamientoService } from '../src/almacenamiento/almacenamiento.service';
import { ConfigService } from '@nestjs/config';

function cargarEnvLocal(ruta: string): void {
  const contenido = readFileSync(ruta, 'utf8');
  for (const linea of contenido.split('\n')) {
    const t = linea.trim();
    if (!t || t.startsWith('#')) continue;
    const separador = t.indexOf('=');
    if (separador === -1) continue;
    const clave = t.slice(0, separador).trim();
    let valor = t.slice(separador + 1).trim();
    if (
      (valor.startsWith('"') && valor.endsWith('"')) ||
      (valor.startsWith("'") && valor.endsWith("'"))
    ) {
      valor = valor.slice(1, -1);
    }
    if (process.env[clave] === undefined) {
      process.env[clave] = valor;
    }
  }
}

cargarEnvLocal(resolve(__dirname, '../.env'));

async function main() {
  const configService = new ConfigService();
  const almacenamiento = new AlmacenamientoService(configService);
  const estado = almacenamiento.obtenerEstadoConexion();
  console.log('Modo:', estado.modo, '| Endpoint:', estado.endpoint);
  const resultado = await almacenamiento.probarConexion();
  console.log(resultado.ok ? 'OK' : 'FALLO', resultado.mensaje);
  process.exit(resultado.ok ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

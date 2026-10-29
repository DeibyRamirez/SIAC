import { readFileSync, readdirSync, statSync } from 'fs';
import { join, relative } from 'path';

/**
 * Usabilidad: los mensajes que llegan a la UI (errores, notificaciones, correos, descripciones)
 * dicen «Profesor». El rol interno Cargador, las rutas /cargador y las credenciales no cambian.
 */
function archivos(dir: string): string[] {
  return readdirSync(dir).flatMap((nombre) => {
    const ruta = join(dir, nombre);
    if (statSync(ruta).isDirectory()) return nombre === '__snapshots__' ? [] : archivos(ruta);
    return nombre.endsWith('.ts') && !nombre.endsWith('.spec.ts') ? [ruta] : [];
  });
}

function frasesConCargador(fuente: string): string[] {
  const limpio = fuente.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  return [...limpio.matchAll(/'([^'\n]*)'|"([^"\n]*)"|`([^`]*)`/g)]
    .map((m) => m[1] ?? m[2] ?? m[3] ?? '')
    .filter((t) => /cargador/i.test(t) && /\s/.test(t.trim()));
}

describe('ningún mensaje visible del backend dice Cargador', () => {
  it('src no tiene frases con Cargador', () => {
    const raiz = join(__dirname, '..', '..');
    const hallazgos = archivos(raiz).flatMap((ruta) =>
      frasesConCargador(readFileSync(ruta, 'utf8')).map((t) => `${relative(raiz, ruta)}: ${t.trim()}`),
    );
    expect(hallazgos).toEqual([]);
  });
});

/**
 * Demo en consola (7 min): avanza una «referencia» simulada a lo largo de 7 años
 * y muestra semáforo + % de vigencia de registro (misma regla que panel-siac).
 *
 * Para ver la barra en la UI: registre una resolución MEN con la fecha indicada al inicio.
 *
 * Uso: pnpm demo:semaforo-vigencia
 */
import {
  UMBRALES_SEMAFORO_VIGENCIA_DEFECTO,
  calcularFechaFinVigencia,
  calcularSemaforoVigencia,
} from '../src/dominio/panel-siac';

const MS_POR_ANIO = 365.25 * 24 * 60 * 60 * 1000;
const ITERACIONES = 10;
const INTERVALO_MS = 42_000;
const ANIOS = UMBRALES_SEMAFORO_VIGENCIA_DEFECTO.aniosVigencia;

function calcularPorcentajeVigencia(fechaResolucion: Date, referencia: Date): number {
  const ms = referencia.getTime() - fechaResolucion.getTime();
  const aniosTranscurridos = Math.max(0, ms / MS_POR_ANIO);
  return Math.min(100, Math.round((aniosTranscurridos / ANIOS) * 100));
}

function formatear(fecha: Date): string {
  return fecha.toISOString().slice(0, 10);
}

async function main() {
  const fechaResolucion = new Date('2019-06-01T12:00:00.000Z');
  const inicioSimulado = fechaResolucion.getTime();
  const finSimulado = calcularFechaFinVigencia(fechaResolucion).getTime();
  const duracionSimuladaMs = finSimulado - inicioSimulado;

  console.log('--- Demo semáforo vigencia de registro (SIAC) ---');
  console.log(`Fecha resolución sugerida (prueba UI): ${formatear(fechaResolucion)}`);
  console.log(`Fin de vigencia (7 años): ${formatear(calcularFechaFinVigencia(fechaResolucion))}`);
  console.log(
    `Duración real: ${ITERACIONES} pasos × ${INTERVALO_MS / 1000}s ≈ ${(ITERACIONES * INTERVALO_MS) / 60_000} min\n`,
  );

  for (let paso = 0; paso <= ITERACIONES; paso += 1) {
    const fraccion = paso / ITERACIONES;
    const referencia = new Date(inicioSimulado + duracionSimuladaMs * fraccion);
    const semaforo = calcularSemaforoVigencia(fechaResolucion, referencia);
    const porcentaje = calcularPorcentajeVigencia(fechaResolucion, referencia);
    console.log(
      `[${paso}/${ITERACIONES}] ref=${formatear(referencia)} | semáforo=${semaforo} | barra=${porcentaje}%`,
    );
    if (paso < ITERACIONES) {
      await new Promise((resolve) => setTimeout(resolve, INTERVALO_MS));
    }
  }

  console.log('\nDemo finalizada.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

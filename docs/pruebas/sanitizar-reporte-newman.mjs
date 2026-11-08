#!/usr/bin/env node
/**
 * Elimina tokens, Authorization y contraseñas de reportes Newman (JSON/HTML).
 */
import fs from 'node:fs';

const PATRONES = [
  [/Bearer\s+eyJ[A-Za-z0-9._\-+/=]+/gi, 'Bearer [REDACTED]'],
  [/eyJ[A-Za-z0-9._\-+/=]+\.[A-Za-z0-9._\-+/=]+\.[A-Za-z0-9._\-+/=]+/g, '[REDACTED_JWT]'],
  [/"Authorization"\s*:\s*"[^"]*"/gi, '"Authorization": "[REDACTED]"'],
  [/"token"\s*:\s*"[^"]*"/gi, '"token": "[REDACTED]"'],
  [/"accessToken"\s*:\s*"[^"]*"/gi, '"accessToken": "[REDACTED]"'],
  [/"contrasena"\s*:\s*"[^"]*"/gi, '"contrasena": "[REDACTED]"'],
  [/"clavePrueba"\s*:\s*"[^"]*"/gi, '"clavePrueba": "[REDACTED]"'],
  [/\\"contrasena\\"\s*:\s*\\"[^\\"]*\\"/gi, '\\"contrasena\\": \\"[REDACTED]\\"'],
  [/"value"\s*:\s*"LocalNewman[^"]*"/gi, '"value": "[REDACTED]"'],
  [/LocalNewman[A-Za-z0-9!]+/g, '[REDACTED]'],
  [/&quot;contrasena&quot;\s*:\s*&quot;[^&]*&quot;/gi, '&quot;contrasena&quot;: &quot;[REDACTED]&quot;'],
  [/NEWMAN_CLAVE_PRUEBA[=:]\S+/gi, 'NEWMAN_CLAVE_PRUEBA=[REDACTED]'],
  [/JWT_SECRETO[=:]\S+/gi, 'JWT_SECRETO=[REDACTED]'],
];

function sanitizar(texto) {
  let salida = texto;
  for (const [re, repl] of PATRONES) {
    salida = salida.replace(re, repl);
  }
  return salida;
}

function verificar(limpio, archivo) {
  const problemas = [];
  if (/Bearer\s+eyJ/i.test(limpio)) problemas.push('Bearer JWT');
  if (/eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]+\./.test(limpio)) problemas.push('JWT suelto');
  if (/"contrasena"\s*:\s*"(?!\[REDACTED])/i.test(limpio)) problemas.push('contrasena');
  if (/LocalNewman2026/i.test(limpio)) problemas.push('clave local');
  if (problemas.length) {
    console.error(`[sanitizar] Aún hay secretos en ${archivo}: ${problemas.join(', ')}`);
    return false;
  }
  return true;
}

let fallo = false;
for (const archivo of process.argv.slice(2)) {
  const original = fs.readFileSync(archivo, 'utf8');
  const limpio = sanitizar(original);
  if (!verificar(limpio, archivo)) fallo = true;
  fs.writeFileSync(archivo, limpio);
  console.log(`Sanitizado: ${archivo}`);
}
if (fallo) process.exit(1);

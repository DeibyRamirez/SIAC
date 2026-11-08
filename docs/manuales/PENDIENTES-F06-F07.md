# Pendientes humanos — F-06 / F-07 (Sprint 3)

Elementos marcados `[PENDIENTE: …]` en los manuales `.docx` que requieren decisión o contenido institucional.

## F-06 Manual de usuario

| Ítem | Acción |
|------|--------|
| URL pública de producción | Confirmar dominio Vercel o dominio propio (ver `docs/despliegue.md`). |
| Recuperación de contraseña | Definir flujo (no hay pantalla en el frontend actual) o procedimiento vía SuperAdmin. |
| Capturas `[CAPTURA: …]` | Tomar screenshots en entorno acordado y reemplazar marcadores en el `.docx`. |
| Soporte — responsable, teléfono, horario | Completar datos de Planeación / mesa de ayuda. |

## F-07 Manual técnico

| Ítem | Acción |
|------|--------|
| URLs Render y Vercel en producción | Anotar URLs reales en tabla de infraestructura. |
| Colección Postman / Newman | Versionar en repo si se adopta prueba de contrato manual (hoy no existe). |
| Plan F-05 de pruebas | Enlazar o anexar si se entrega fuera del repositorio. |
| Respaldo y restauración | Runbook institucional (frecuencia, custodia, `pg_dump` / Supabase PITR). |
| Política de retención de logs | Definir con operaciones (Render/Vercel). |
| Contacto equipo — nombre, rol, vigencia acompañamiento | Completar fila de contacto del manual. |
| Roles RLS `siac_app` / `siac_powerbi_lectura` | Si aplica despliegue con RLS, seguir `docs/despliegue.md` §9 (contraseñas en gestor de secretos). |

## Regeneración de los `.docx`

Los entregables se elaboraron a partir de las plantillas adjuntas al ticket (F-06/F-07). Para una nueva versión, editar directamente los `.docx` en este directorio respetando estilos de plantilla.

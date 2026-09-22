# Manual de Usuario — SIAC

## Acceso

1. Abrir http://localhost:3000
2. Ingresar correo `@uniautonoma.edu.co` y contraseña
3. El sistema muestra una pantalla de carga mientras valida la sesión
4. Tras iniciar sesión, redirige al panel según su rol

## Interfaz común

Funciones disponibles para todos los roles autenticados:

- **Barra lateral plegable:** use el botón de colapsar para alternar entre vista compacta (iconos) y vista completa (etiquetas). La preferencia se guarda en el navegador.
- **Búsqueda global:** pulse `Ctrl+K` para abrir el buscador. Escriba el nombre de una ruta o documento; puede filtrar por formato escribiendo `pdf` o `xlsx`. Pulse `Esc` para cerrar.
- **Confirmaciones:** acciones críticas (aprobar, rechazar, eliminar, reenviar, desactivar usuario) solicitan confirmación antes de ejecutarse.

## Roles

### Cargador

Responsable de cargar y corregir evidencias documentales.

**Menú principal**

| Ruta | Función |
|------|---------|
| `/cargador` | Resumen general |
| `/cargador/evidencias/nueva` | Cargar nueva evidencia (PDF o Excel) con metadatos |
| `/cargador/evidencias` | Listado de evidencias propias |
| `/cargador/plantillas` | Biblioteca de plantillas oficiales |

**Capacidades**

- Descargar plantillas vigentes desde la biblioteca
- Subir evidencias con programa, periodo, factor e indicador
- Consultar el estado de cada documento (borrador, en revisión, aprobado, corrección)
- Ver el documento en el visor integrado (URL firmada desde almacenamiento)
- Recibir indicador de **novedades** (badge) cuando tiene evidencias en estado *Corrección* (rechazadas)

**Corrección de rechazos**

1. Abra **Mis evidencias** y entre al detalle de la evidencia rechazada (`/cargador/evidencias/[id]`)
2. Lea las observaciones del revisor
3. Suba una **versión corregida** del archivo (el sistema incrementa el número de versión, p. ej. v1 → v2)
4. Confirme y use **Reenviar a revisión** para volver a poner el documento en la bandeja del revisor

### Revisor

Responsable del dictamen de calidad sobre evidencias en revisión.

**Menú principal**

| Ruta | Función |
|------|---------|
| `/revisor` | Resumen general |
| `/revisor/bandeja` | Bandeja de revisión (badge con pendientes) |

**Capacidades**

- Revisar borradores y evidencias enviadas a revisión
- Visualizar el archivo en el visor integrado antes de decidir
- **Aprobar** o **rechazar** con observaciones obligatorias en caso de rechazo
- Confirmar la acción en el diálogo «¿Está seguro?» antes de registrar el dictamen
- El cargador queda notificado mediante el cambio de estado y las observaciones visibles en su detalle

### Administrador

Supervisa el avance institucional, configura normativa y consulta evidencias validadas. **No carga evidencias** en nombre de terceros.

**Menú principal**

| Ruta | Función |
|------|---------|
| `/administrador` | Resumen general |
| `/administrador/dashboard` | Dashboard de métricas (Power BI embebido o Recharts) |
| `/administrador/programas` | Programas académicos con semáforo de avance |
| `/administrador/evidencias` | Evidencias y documentos (consulta; solo estados permitidos) |
| `/administrador/vigencias` | Vigencias normativas y alertas |
| `/administrador/plantillas` | Biblioteca y gestión de plantillas |
| `/administrador/bandeja-revision` | Bandeja de revisión (consulta/supervisión) |

**Capacidades**

- Consultar evidencias **validadas** en listado y detalle (`/administrador/evidencias/[id]`) con visor de solo lectura
- Supervisar avance por programa (semáforo y tarjetas con imagen)
- Gestionar vigencias, alertas y estructura normativa según permisos del módulo
- Eliminar evidencias solo tras confirmación explícita

### Par académico MEN

Perfil de **consulta externa** (Ministerio de Educación). Comparte rutas con el módulo administrador (`/administrador/...`) pero con restricciones de seguridad:

- Solo puede ver evidencias en estado **Aprobado (Validado)**
- No accede a borradores, documentos en revisión ni rechazados (el sistema responde con acceso denegado)
- No carga ni modifica evidencias
- Puede consultar plantillas vigentes y métricas de avance institucional

> En la aplicación aparece como «Par académico MEN» en la barra lateral.

### Super administrador (SuperAdmin)

Administración técnica del sistema y acceso transversal a todos los módulos.

**Menú principal**

| Ruta | Función |
|------|---------|
| `/superadmin` | Panel SuperAdmin |
| `/superadmin/usuarios` | Gestión de usuarios (crear, editar, desactivar) |
| Accesos directos | Módulos cargador, revisor y administrador |

**Capacidades**

- Crear usuarios con cualquier rol (`Cargador`, `Revisor`, `ParAcademico`, `Administrador`, `SuperAdmin`)
- Desactivar cuentas (con confirmación)
- Navegar a cualquier módulo operativo para soporte o pruebas
- Bypass de restricciones de rol en API para operaciones de mantenimiento

**Usuario de demostración (semilla):** `superadmin@uniautonoma.edu.co`

## Flujo típico

1. El **cargador** descarga la plantilla desde la biblioteca
2. Diligencia el documento externamente (Word, Excel, etc.)
3. Sube la evidencia con metadatos (programa, periodo, factor, indicador) en **Cargar evidencia**
4. Envía a revisión; el estado pasa a *En revisión*
5. El **revisor** abre la bandeja, visualiza el PDF/Excel y aprueba o rechaza con observaciones
6. Si rechaza: el cargador sube una **nueva versión**, corrige según observaciones y reenvía
7. Si aprueba: la evidencia queda *Validada* y es visible para **Administrador** y **Par académico**
8. El **administrador** supervisa avance por programa, vigencias y métricas en el dashboard

## Semáforo de vigencias

| Color | Significado |
|-------|-------------|
| Verde | Vigente (>30 días) |
| Amarillo | Próximo a vencer (≤30 días) |
| Rojo | Vencido |

## Soporte

Contacto: planeacion@uniautonoma.edu.co

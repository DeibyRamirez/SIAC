# Estándar base del proyecto SIAC

> **Proyecto:** Sistema Interno de Aseguramiento de la Calidad (SIAC)  
> **Institución:** Corporación Universitaria Autónoma del Cauca (CUAC)  

> **Autores:** [David Urrutia Ceron](https://github.com/BICHO128) y [Deiby Alejandro Ramirez Galvis](https://github.com/DeibyRamirez)  
> **Repositorio:** [DeibyRamirez/SIAC](https://github.com/DeibyRamirez/SIAC)  
> **Fecha de referencia:** 2 de octubre de 2026  
> **Alcance:** describe cómo está construido SIAC hoy y las reglas que el equipo debe seguir para no romper esa base.

Este documento adapta el formato de un estándar académico de desarrollo de software al estado real del SIAC. No describe otro producto. La paleta detallada sigue en [paleta-colores-frontend.pdf](./paleta-colores-frontend.pdf); aquí se usa como parte de la identidad visual y se resume solo lo necesario para decidir.

## 1. Objetivo

Fijar un lenguaje común para que cualquier integrante (cargador de evidencias, revisor, backend o frontend) pueda leer, extender y entregar código sin reinterpretar el proyecto.

El estándar busca:

- Consistencia entre frontend, API y base de datos.
- Legibilidad en castellano de dominio, con términos técnicos en inglés cuando ya son el nombre de la herramienta.
- Escalabilidad del monolito modular sin mezclar responsabilidades.
- Trabajo en paralelo (varias personas en `develop_v2`) sin pisar firma de documentos, estados ni navegación.
- Mantenimiento: un cambio de color, de estado o de flujo de evidencia se hace en un solo lugar.

## 2. Qué es SIAC hoy

SIAC es la aplicación interna de aseguramiento de la calidad de la CUAC. Los roles de interfaz son **Cargador**, **Revisor**, **Administrador** y **SuperAdmin**. El flujo central es el ciclo de evidencias: carga de un `.docx`, envío a revisión, dictamen, corrección por versiones y descarga con comentarios de Word.

| Capa | Tecnología actual | Dónde vive |
|---|---|---|
| Interfaz | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4, componentes tipo shadcn | `Frontend/` |
| API | NestJS 10, TypeScript, módulos por dominio | `Backend/src/` |
| Datos | PostgreSQL + Prisma | `Backend/prisma/` |
| Archivos | Almacenamiento compatible con S3 (`@aws-sdk/client-s3`: Supabase Storage o MinIO) | módulo `almacenamiento` |
| Documentos Word | ZIP OpenXML con `jszip` (sin IA ni OCR) | módulo `docx` |
| Calidad de entrega | Conventional Commits (`feat:`, `fix:`, `docs:`, `refactor:`) | Git |

Puertos locales de referencia: interfaz en `http://localhost:3000` y API en `http://localhost:3001/api/v1`.

## 3. Principios

1. **Claridad sobre ingenio.** Un nombre de archivo, función o ruta debe decir qué hace sin comentario extra.
2. **Una responsabilidad por unidad.** Un controlador Nest recibe la petición; el servicio decide; el repositorio habla con Prisma; el módulo DOCX solo manipula el ZIP.
3. **No duplicar reglas de negocio.** Estados, firma del documento y comentarios viven en el backend. El frontend los muestra y los envía; no los “inventa” en paralelo.
4. **Castellano de dominio, inglés de plataforma.** Se dice `evidencia`, `revisor`, `dictaminar`. Se dice `service`, `controller`, `page.tsx` porque así está el código.
5. **No mezclar estilos.** Archivos de Next en `kebab-case`. Componentes React en `PascalCase`. No introducir Angular, Java ni una segunda paleta.
6. **Lo visual sale de tokens.** Colores nuevos se agregan en `Frontend/app/globals.css`, no como hex sueltos en cada página.

## 4. Estructura del repositorio

```text
SIAC/
├── Frontend/                 # Next.js
│   ├── app/
│   │   ├── login/
│   │   ├── (app)/
│   │   │   ├── cargador/
│   │   │   ├── revisor/
│   │   │   ├── administrador/
│   │   │   └── superadmin/
│   │   ├── globals.css       # tokens de color
│   │   └── layout.tsx
│   ├── components/
│   │   ├── ui/               # primitivos (botón, badge, diálogo)
│   │   ├── layout/           # barra lateral, shell
│   │   ├── siac/             # piezas de negocio (visor, gráficos)
│   │   └── auth/
│   └── lib/
│       ├── servicios/        # clientes HTTP hacia la API
│       ├── hooks/
│       ├── tipos/
│       ├── constantes/
│       └── utilidades/
├── Backend/
│   ├── prisma/               # schema, migraciones, semilla, repair
│   └── src/
│       ├── documentos/       # evidencias, dictamen, versiones
│       ├── docx/             # firma, comentarios Word, diff
│       ├── programas/
│       ├── auth/  usuarios/  plantillas/  ...
│       └── main.ts
└── docs/
    ├── paleta-colores-frontend.md
    └── estandar-base-siac.md
```

Un módulo de backend nuevo se crea como carpeta en `src/` con `module`, `controller` y `service`. No se mete lógica de evidencias dentro de `programas` ni lógica de Word dentro del controlador HTTP.

## 5. Nomenclatura

### 5.1 Regla general

| Elemento | Forma | Ejemplo en SIAC |
|---|---|---|
| Variable, función, método | `camelCase` | `nombreArchivo`, `dictaminar()`, `obtenerContenidoArchivo()` |
| Componente React, clase, interfaz TypeScript | `PascalCase` | `VisorDocumentoInline`, `DocumentosService` |
| Archivo de página, componente o utilidad | `kebab-case` | `visor-documento-inline.tsx`, `barra-lateral.tsx` |
| Constante de módulo | `UPPER_SNAKE_CASE` | `API_URL` solo si es verdaderamente global |
| Ruta de interfaz | minúsculas, segmentos en español | `/cargador/evidencias`, `/revisor/bandeja` |
| Endpoint REST | minúsculas, plural, prefijo `/api/v1` | `GET /api/v1/evidencias` |
| Modelo Prisma | `PascalCase` singular | `Evidencia`, `EvidenciaComentario`, `Programa` |
| Campo Prisma | `camelCase` | `nombreArchivo`, `numeroVersion`, `firmaDescarga` |
| Commit | Conventional Commits | `fix: restaurar validación de firma SIAC` |

### 5.2 Nombres que sí y nombres que no

Usar palabras que se puedan leer en voz alta y que pertenezcan al problema (evidencia, dictamen, programa, plantilla, vigencia).

| Evitar | Preferir |
|---|---|
| `data`, `info`, `tmp`, `x` | `listaEvidencias`, `comentarioInline`, `bufferDocx` |
| `getUsuarios` en la URL | `GET /api/v1/usuarios` |
| `Manager`, `Helper`, `Data` como nombre de clase | el rol real: `DocumentosService`, `EvidenciaRepositorio` |
| Notación húngara (`strNombre`, `arrLista`) | `nombre`, `evidencias` |
| Dos palabras distintas para lo mismo (`obs` y `comentario`) | una sola: `comentario` en UI y en `EvidenciaComentario` |

Booleanos: prefijo `es`, `tiene` o `puede` (`esDocumentoMaestro`, `tieneFirma`). Funciones: verbo + objeto (`validarFirmaSubida`, `guardarComentariosVersion`, `listarComentariosHastaVersion`).

Índices de bucle pueden ser `i`. El resto de variables de una letra no.

### 5.3 Archivos y componentes

El archivo físico coincide con el componente, en `kebab-case`:

- Componente `HistorialVersionesEvidencia` → `historial-versiones-evidencia.tsx`
- Página de Next: `app/(app)/cargador/evidencias/nueva/page.tsx` exporta la vista de “Cargar evidencia”
- Un componente de `components/ui/` no conoce evidencias. Un componente de `components/siac/` sí.

## 6. Backend (NestJS)

Capas, en este orden y sin saltárselas:

1. **Controller.** Ruta, rol y forma del body. No abre el ZIP ni consulta Prisma directo.
2. **Service.** Reglas: quién puede dictaminar, qué versión es, cuándo hay 400.
3. **Repositorio.** Consultas Prisma y transacciones.
4. **Módulo DOCX.** Leer y escribir OpenXML. No decide estados de negocio.

Errores hacia el usuario:

- Dato de negocio inválido (programa que no existe, firma ausente, documento mal formado): **400** con frase en castellano.
- Conflicto de unicidad: **409**.
- No devolver al navegador un `P2025` o un stack de Prisma.

Prisma se mantiene. No se introduce un segundo ORM. Los scripts oficiales están en `Backend/package.json`: `prisma:generate`, `prisma:migrate`, `prisma:deploy`, `prisma:repair-schema`, `prisma:verify`, `prisma:seed`.

## 7. Frontend (Next.js)

- App Router. Las áreas autenticadas viven bajo `app/(app)/` y se parten por rol: `cargador`, `revisor`, `administrador`, `superadmin`.
- El cliente HTTP está en `lib/servicios/`. Las páginas no arman URLs sueltas si ya existe un servicio.
- Estado de servidor (lista de evidencias, detalle) viene de la API. No se duplica en un store global salvo catálogos de UI.
- Navegación lateral: **un solo ítem activo**. Gana la ruta más específica. El ítem padre no se marca solo porque la URL empiece igual (`/cargador/evidencias` no activa también “Cargar evidencia”).
- Acciones largas (enviar a revisión, preparar descarga del `.docx`) muestran el mismo tipo de espera: overlay o botón deshabilitado con texto (“Preparando documento…”). Sin doble envío.
- Toasts de error en castellano, concretos (“El programa seleccionado no existe”), no “Error 500”.

Formateo: Prettier / formato del editor al guardar (TypeScript, TSX, CSS). No se discuten comillas ni sangría archivo por archivo.

## 8. API REST

Prefijo único: `/api/v1`.

Recursos en plural y sin verbo en la ruta:

| Correcto | Incorrecto |
|---|---|
| `GET /api/v1/evidencias` | `GET /api/v1/getEvidencias` |
| `POST /api/v1/evidencias/:id/dictamen` | `POST /api/v1/dictaminarEvidencia` |
| `GET /api/v1/evidencias/:id/contenido` | mezclar descarga cruda y documento anotado sin decirlo |

Acciones que no son un CRUD puro se nombran como subrecurso (`enviar-revision`, `dictamen`, `contenido`, `versiones`). La descarga que debe llevar comentarios y firma pasa por contenido procesado, no por una URL firmada del archivo crudo.

Un método de servicio hace una cosa. Si supera unas 100 líneas o más de 3 argumentos de negocio, se parte o se agrupa el input en un DTO (`DictaminarDto`).

## 9. Datos y estados

- Tablas las crea Prisma a partir de los modelos. No se renombran columnas a mano en producción.
- Estados canónicos de evidencia que el código y la base deben reconocer juntos: `Borrador`, `EnRevision`, `Validado`, `Rechazado`, `ConObservaciones`, `Cumple`. Alias viejos (`Aprobado`, `NoCumple`, `EnCorreccion`, etc.) solo existen para reparación de datos, no como valores nuevos.
- Un dictamen de corrección guarda **todos** los comentarios enviados, en la versión dictaminada, con autor (nombre del revisor) y texto. No se trunca a uno.
- La hora que ve Word sale en zona `America/Bogota` (offset `-05:00`), tomada del momento del dictamen.
- El nombre del archivo de una versión es el nombre original de esa entrega. Una corrección no rebautiza el `.docx` ni el historial.
- La firma SIAC vive solo en `docProps/core.xml` ya existente. Subir una corrección sin esa firma se rechaza. No se acepta “cualquier Word”.

## 10. Documentos Word (regla corta)

SIAC trata el `.docx` como un ZIP de XML.

- No se aplana el documento a texto plano para “ver cambios”. Las marcas van sobre el preview que conserva tablas y estilos.
- Comentarios de Word: `comments.xml`, relaciones y anclas válidas. Si el conteo de anclas no cuadra, se responde error; no se entrega un archivo que Word tenga que reparar.
- Al abrir la versión N se incluyen los comentarios acumulados de la 1 a la N, con autor y cuerpo.
- Selecciones cortas y citas que cruzan párrafos deben poder anclarse. Un campo largo (`hunkId`) no puede tumbar toda la transacción.

## 11. Identidad visual

Fuente de verdad: `Frontend/app/globals.css` y el detalle en [paleta-colores-frontend.pdf](./paleta-colores-frontend.pdf).

La interfaz es institucional, clara y sobria: azul CUAC para jerarquía y acción primaria; cyan para foco y técnica; esmeralda para avance y cumplimiento; coral, ocre, fucsia y púrpura solo para categorías, informes y alertas. El fondo no es blanco puro: es cálido y claro para que las tarjetas blancas se separen.

### 11.1 Tokens que se usan al diseñar una pantalla

| Rol | Hex | Variable / uso |
|---|---|---|
| Identidad y acción primaria | `#0A3B74` | `--institucional`. Barra, títulos fuertes, botón primario, pie |
| Azul de apoyo | `#0D4A8C` | Degradados de barra y tarjetas destacadas |
| Foco y acción técnica | `#1D70B8` | `--ring`. Anillo de teclado, énfasis |
| Cumplimiento / avance | `#1CBCA6` | Indicadores positivos y etiquetas de sección |
| Atención de categoría | `#F25C30` | Series y acentos cálidos, no botones primarios |
| Seguimiento | `#C28B10` | Advertencia de negocio y series |
| Rechazo / destructivo | `#D82B5A` | `--destructive`. Rechazar, eliminar, alerta prioritaria |
| Texto | `#333333` / `#555555` | Principal y secundario. No negro puro |
| Fondo de app | `#FFF8F6` | `--background` |
| Superficie | `#FFFFFF` | Tarjetas, tablas, formularios |
| Borde | `#C5D8E8` | Separadores y campos |

Degradados ya definidos y que no se reinventan:

- Fondo de aplicación: `#FFF2EE` → `#E8F6F6` → `#EEF4FA`
- Bloque hero: `#0A3B74` → `#0D4A8C` → `#1D70B8`
- Barra lateral: `#0A3B74` → `#0D4A8C` → blanco

Los colores del logo de Google en el login son de esa marca. No se reutilizan como botones del SIAC.

### 11.2 Jerarquía en pantalla

1. Título de página en azul institucional, no en fucsia ni en coral.
2. Una acción primaria por vista (enviar, guardar, dictaminar) en `#0A3B74` con texto blanco.
3. Acciones secundarias en superficie clara con borde `#C5D8E8`.
4. Éxito y “cumplimiento” en esmeralda; advertencia en ocre o ámbar claro; error y rechazo en fucsia `#D82B5A` (texto de validación puede usar el rojo de apoyo `#B91C1C` sobre fondo `#FEF2F2`).
5. Gráficos: series en el orden institucional (`#0A3B74`, `#1CBCA6`, `#1D70B8`, `#C28B10`, `#F25C30`) y neutro `#94A3B8` para lo que no debe competir.
6. Contraste: texto oscuro sobre fondos claros; texto blanco solo sobre azul institucional o equivalentes oscuros.
7. Un componente nuevo usa la variable CSS (`--institucional`, `--esmeralda`, `--destructive`), no un hex copiado.

### 11.3 Lo que no se hace en UI

- Dos ítems del menú activos a la vez.
- Un color fuera de la paleta “porque queda bien en esta pantalla”.
- Spinners distintos para cada botón. Misma espera que “Enviar a revisión” y “Preparando documento…”.
- Renombrar en silencio el archivo que el usuario acaba de subir.

## 12. Commits y ramas

Formato:

```text
feat: descripción corta en infinitivo o resultado
fix: qué se corrigió
docs: solo documentación
refactor: cambio interno sin cambiar comportamiento
```

Ejemplos reales del proyecto: `feat: conservar formato DOCX en Ver cambios…`, `fix: anclar N comentarios Word…`.

- Integración diaria en `develop_v2`.
- No se sube a `main` directo.
- No entra un `.env` ni una clave. Solo `.env.example`.
- El autor del commit es la persona del equipo (cuenta de GitHub), no una herramienta.
- Antes de integrar: `tsc` del front y del back en verde, y pruebas del módulo tocado (`jest` en backend cuando el cambio es de evidencias o DOCX).

## 12.1 Avance por trámite y avance institucional (T-010.2)

Cada programa activo aporta **por igual** al avance institucional mostrado al administrador:

`avanceInstitucional = redondeo( Σ avanceGlobal_programa / N )`, con `N` = programas `activo: true`.

Dentro de cada programa, el `avanceGlobal` del trámite activo es la suma ponderada del avance **interno** (0–100 %) de cada guía:

| Alcance | Trámite | Guías | Peso en el trámite | Avance interno |
|---------|---------|-------|-------------------|----------------|
| Programa | Registro calificado nuevo | G1 | 100 % | Checklist n/9 hasta Cumple/Validado (= 100 %) |
| Programa | Renovación registro calificado | G1 + G2 | **50 % + 50 %** | G2/G4 sin puntaje: 0 % hasta aprobación, luego 100 % |
| Institución | Renovación condiciones | G3 + G4 | 85 % + 15 % | Igual criterio G3 con n/6 |

La resolución MEN inicia vigencia de **7 años** (`ConfiguracionSIAC.aniosVigencia`). Para un **nuevo ciclo** de renovación, el administrador ejecuta `POST /programas/:id/iniciar-ciclo-renovacion` cuando el semáforo de vigencia está en aviso o vencido; a partir de `Programa.inicioCicloTramiteAt` solo cuentan evidencias nuevas. Las versiones anteriores no se borran.

## 13. Comentarios en el código

Se escribe en castellano, en tercera persona, y solo cuando el *porqué* no se ve en el nombre.

- Documentar parámetros y errores de un servicio de dominio cuando el contrato no es obvio (DTO de dictamen, firma, versiones).
- No narrar el qué (“incrementa i”). No dejar código comentado. No usar el comentario como historial: eso es Git.
- No hace falta Javadoc de Java. En TypeScript basta un bloque breve sobre métodos públicos de dominio.

## 14. Duplicación

Si la misma regla aparece en la página del revisor y en el servicio, la regla vive en el servicio. El frontend solo refleja el resultado.

Bloques copiados (validar firma en dos sitios, mapear estados en tres) se unifican antes de dar por cerrada la entrega.

## 15. Checklist antes de dar una entrega por buena

- [ ] Nombres en castellano de dominio y archivos en `kebab-case`.
- [ ] El cambio de color pasó por `globals.css` o por un token ya existente.
- [ ] Menú: un solo activo. Botones largos: una sola espera, sin doble click.
- [ ] Evidencia: firma obligatoria en corrección; N comentarios con autor; hora Bogotá; nombre de archivo estable.
- [ ] Word abre sin “contenido no legible”. “Ver cambios” conserva tablas.
- [ ] Errores de API en castellano (400/409), no códigos Prisma crudos.
- [ ] `tsc` limpio. Pruebas del módulo en verde.
- [ ] Commit `feat:` o `fix:` y push solo a `develop_v2` cuando el smoke local pasó.

## 16. Principio del equipo

El código se entiende sin una explicación al lado. Si hace falta un mensaje largo para decir qué archivo mirar, el nombre o la carpeta están mal.

## 17. Referencias en el repo

- Paleta completa: `docs/paleta-colores-frontend.md`
- Estándar base: `docs/estandar-base-siac.md`
- Tokens: `Frontend/app/globals.css`
- Informes: `Frontend/lib/informes-powerbi.ts`
- Evidencias y dictamen: `Backend/src/documentos/`
- Word: `Backend/src/docx/`
- Esquema: `Backend/prisma/schema.prisma`

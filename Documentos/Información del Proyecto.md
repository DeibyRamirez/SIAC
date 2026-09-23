# Información del Proyecto

**Nombre del proyecto:** Sistema Interno de Aseguramiento de la Calidad (SIAC)

**Institución para la que se desarrolla:** Dependencia de Planeación de la universidad (SIAC)

**Frase representativa:** "Sistema Unificado de Acreditación de Calidad Universitaria"

**Objetivo general:** "Desarrollar un sistema de información web que permita la gestión, centralización y trazabilidad de los indicadores, procesos y evidencias institucionales, alineándose con los estándares de calidad para el proceso de acreditación de la SIAC."

**Prueba:** El usuario indicó en el Acta de Constitución: "Desarrollar un sistema de información web que permita la gestión, centralización y trazabilidad de los indicadores, procesos y evidencias institucionales, alineándose con los estándares de calidad para el proceso de acreditación de la SIAC."

# Problemática y Justificación

**Problemática actual:**
- "La SIAC carece de procedimientos establecidos"
- "Existe una urgencia crítica porque la última auditoría se realizó en 2021 y las vulnerabilidades detectadas en ese informe no se han solucionado"
- "No se cuenta con un sistema que permita la conectividad de los indicadores, evidencias y procesos institucionales con los estándares de calidad"
- Almacenamiento no estructurado en carpetas de Drive

**Justificación:** "La resolución de este problema es de carácter crítico y urgente para garantizar la acreditación institucional de la SIAC. Implementar este sistema proporcionará a la dependencia una plataforma centralizada que automatiza la trazabilidad entre las evidencias documentales, los procesos institucionales y los estándares de calidad. Esto reduce drásticamente el error humano, optimiza los tiempos de preparación para futuras auditorías, permite el monitoreo en tiempo real de los planes de mejora y garantiza un cumplimiento regulatorio organizado y seguro."

**Prueba:** El usuario declaró en el Acta de Constitución la problemática y justificación textualmente.

# Módulos y Usuarios

**Módulos funcionales clave:**

1. **Ingesta de Datos y Alimentación de Dashboards:**
   - Parseo Automático de Excels (formatos .xlsx)
   - Gestión de Evidencias PDF con extracción de metadatos (programa, periodo, factor e indicador)
   - Integración con Power BI mediante Power BI Embedded (método App Owns Data con Embed Tokens)

2. **Biblioteca de Plantillas Oficiales y Flujo por Roles:**
   - Repositorio estandarizado con formatos oficiales organizados por factores e indicadores de acreditación
   - Control de versiones integrado

3. **Flujo de Aprobación por Roles:**
   - Cargador / Responsable: Descarga la plantilla oficial, diligencia la información y sube el archivo borrador
   - Revisor / Calidad: Valida el documento cargado, añade observaciones y aprueba o rechaza
   - Par Académico / Administrador: Visualiza y descarga exclusivamente las evidencias en estado validado/vigente

4. **Control de Vigencias, Contadores y Alertas:**
   - Cálculo de Expiración con tiempo de vigencia definido (ej. actas de grado con 3 años de validez)
   - Indicadores Visuales: Barras de progreso/semáforo (🟢 Vigente, 🟡 Próximo a vencer, 🔴 Vencido)
   - Sistema de Notificaciones con tareas programadas (Cron Jobs) para alertas automáticas por correo electrónico e in-app

5. **Motor de Búsqueda y Filtros Avanzados:**
   - Filtros dinámicos multidimensionales por Programa, Prueba/Factor, Periodo Académico e Indicador
   - Sincronización del estado de búsqueda en la URL para compartir vistas específicas
   - Búsqueda por texto completo (Full-Text Search)

**Prueba:** El usuario definió estos módulos en el Resumen Técnico y Arquitectura y en el Acta de Constitución.

# Avances y Metodología

**Estado del proyecto:** En fase de definición y planificación (Semana 2-3 del cronograma)

**Metodología de trabajo:** Scrum con sprints de 2-3 semanas

**Documentos elaborados:**
- Acta de Constitución (F-00) - Diligenciado en semana 2
- Propuesta Técnica Preliminar (F-01) - Diligenciado en semana 3
- Resumen Técnico y Arquitectura - Documento base

**Cronograma definido (2.5 meses / 12 semanas):**

- **Semanas 3-5:** Configuración Inicial e Ingeniería de Datos (configuración de proyectos NestJS, Next.js, Prisma; modelado relacional en PostgreSQL; autenticación JWT; prototipo de subida/descarga con @aws-sdk/client-s3; diseño de servicios de integración para APIs externas)
- **Semanas 6-8:** Desarrollo de Módulos Núcleo e Integración con APIs (biblioteca de plantillas; parseo de Excel; motor de búsqueda y filtros; cálculo de vigencias; implementación de servicios de integración con APIs externas reales)
- **Semanas 9-10:** Integración, Automatización y Migración (Power BI Embedded; Cron Jobs y notificaciones; flujo de aprobación; migración de credenciales de Supabase al servidor de la universidad)
- **Semanas 11-12:** Pruebas de Aceptación y Entrega Final (pruebas de penetración; ajustes UI/UX; manuales; presentación final)

**Prueba:** El usuario proporcionó el cronograma detallado en la Propuesta Técnica Preliminar (F-01), sección 7.

# Tecnologías e Instrucciones

**Stack tecnológico definido:**

| Capa | Tecnología | Versión |
|------|------------|---------|
| Backend / API | NestJS | v10.x |
| Base de datos | Supabase (PostgreSQL) | 14.x |
| Frontend web | Next.js (React) + Tailwind CSS | 14.x |
| Autenticación | JWT + OAuth2 2.0 (con Passport.js) | N/A |
| Pruebas | Jest (Backend) + React Testing Library (Frontend) | N/A |
| ORM | Prisma / Drizzle | N/A |
| Procesamiento Excel/PDF | exceljs / xlsx | N/A |
| Almacenamiento de archivos | @aws-sdk/client-s3 | N/A |
| Notificaciones programadas | node-cron / BullMQ + Nodemailer | N/A |
| Control de versiones | GitHub | N/A |
| Gestión del proyecto | ClickUp | N/A |

**Infraestructura y despliegue:**
- Desarrollo y prototipado: Supabase (PostgreSQL + S3 Storage) - Capa gratuita
- Frontend y Backend: Vercel (Plan Hobby - gratuito)
- Migración final: Servidor institucional de la universidad (PostgreSQL local + MinIO S3)

**Arquitectura seleccionada:** Cliente-servidor monolítica en capas con frontend y backend separados

**Justificación de la arquitectura:** "NO optar por microservicios. La falta de experiencia del equipo, el plazo ajustado (2.5 meses), la complejidad operativa y el hecho de que las APIs externas son dependencias, no servicios propios, hacen que esta arquitectura sea inadecuada. Sería un sobrediseño que pondría en riesgo la entrega del producto."

**Reglas explícitas solicitadas por el usuario:**

1. "NO sera una SPA en frontend, sera una web normal con apartados y dashboard para visualizar, archivos, las métricas, etc." - El frontend utiliza Next.js con SSR (Server Side Rendering)

2. Integración con APIs externas de la universidad: "las universidad me brindara acceso a sus apis, esta se integraran en el sistema para las consultas"

3. Patrón Adapter/Gateway para los Servicios de Integración que consumen APIs externas: "Cada servicio de integración actúa como un adaptador que transforma la estructura de datos de la API externa al formato interno del sistema"

4. Estrategia de migración: "Se realiza un volcado de tablas (pg_dump) de Supabase hacia el servidor PostgreSQL institucional y se actualiza la variable de entorno DATABASE_URL. Se sustituyen las credenciales S3 del .env para apuntar al servicio local de la universidad (como un contenedor con MinIO) sin necesidad de reescribir la lógica de la aplicación."

5. Frontend y backend completamente separados: "frontend y backend van separados, no van juntos"

6. Patrones de diseño aplicados: Módulos (NestJS), Repository, Adapter/Gateway, DTO, Inyección de Dependencias, Singleton

**Prueba:** El usuario confirmó estos requerimientos durante la conversación y están documentados en la Propuesta Técnica Preliminar (F-01).

Importado de: DeepSeek
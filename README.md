# TaskFlow API

API REST para la gestión de tareas, construida con **NestJS 11**, **Prisma 7** y **PostgreSQL 17**.

Incluye CRUD completo, filtros combinables por estado y responsable, paginación con metadatos,
validación estricta de entrada, manejo de errores centralizado, migraciones reales, documentación
OpenAPI y pruebas unitarias y end-to-end contra una base de datos aislada.

---

## Índice

1. [Stack y versiones](#stack-y-versiones)
2. [Requisitos previos](#requisitos-previos)
3. [Puesta en marcha](#puesta-en-marcha)
4. [Variables de entorno](#variables-de-entorno)
5. [Base de datos y migraciones](#base-de-datos-y-migraciones)
6. [Scripts disponibles](#scripts-disponibles)
7. [Referencia de la API](#referencia-de-la-api)
8. [Documentación Swagger](#documentación-swagger)
9. [Pruebas](#pruebas)
10. [Arquitectura](#arquitectura)
11. [Decisiones técnicas](#decisiones-técnicas)
12. [Posibles mejoras](#posibles-mejoras)

---

## Stack y versiones

| Área          | Tecnología                                                 |
| ------------- | ---------------------------------------------------------- |
| Runtime       | Node.js ≥ 20.19 (probado con 24.x)                         |
| Lenguaje      | TypeScript 5.9 en modo `strict`                            |
| Framework     | NestJS 11 (CommonJS)                                       |
| Base de datos | PostgreSQL 17 (Docker Compose)                             |
| ORM           | Prisma 7.10.1 con adaptador `@prisma/adapter-pg`           |
| Validación    | class-validator + class-transformer                        |
| Documentación | @nestjs/swagger (OpenAPI 3)                                |
| Pruebas       | Jest 30 + ts-jest + Supertest                              |
| Calidad       | ESLint 10 (typescript-eslint, reglas con tipos) + Prettier |

Las razones de cada versión elegida se explican en [Decisiones técnicas](#decisiones-técnicas).

## Requisitos previos

- Node.js 20.19+ y npm 10+
- Docker y Docker Compose (o un PostgreSQL 17 propio)

## Puesta en marcha

```bash
# 1. Instalar dependencias (ejecuta `prisma generate` en postinstall)
npm ci

# 2. Configurar el entorno
cp .env.example .env
cp .env.test.example .env.test

# 3. Levantar PostgreSQL (crea también la base `taskflow_test`)
docker compose up -d

# 4. Aplicar las migraciones
npm run db:migrate

# 5. (Opcional) Cargar el juego de datos de ejemplo: 12 tareas
npm run db:seed

# 6. Arrancar en modo desarrollo
npm run start:dev
```

- API: <http://localhost:3000/api/v1/tasks>
- Swagger UI: <http://localhost:3000/api/docs>

> **¿El puerto 5432 está ocupado** (por ejemplo, por un PostgreSQL instalado localmente)?
> Define `POSTGRES_PORT=5433` en `.env` y usa ese puerto en `DATABASE_URL` en `.env` y `.env.test`.

## Variables de entorno

La configuración se valida al arrancar (`src/config/env.validation.ts`). Si falta o es inválida, la
aplicación termina con un mensaje claro que **nunca muestra los valores**, para no filtrar credenciales.

| Variable            | Obligatoria | Por defecto   | Descripción                                          |
| ------------------- | ----------- | ------------- | ---------------------------------------------------- |
| `DATABASE_URL`      | Sí          | —             | Cadena de conexión `postgresql://…`                  |
| `PORT`              | No          | `3000`        | Puerto HTTP (1–65535)                                |
| `NODE_ENV`          | No          | `development` | `development` \| `production` \| `test`              |
| `POSTGRES_USER`     | No          | `taskflow`    | Usuario del contenedor (solo Docker Compose)         |
| `POSTGRES_PASSWORD` | No          | `taskflow`    | Contraseña del contenedor (solo Docker Compose)      |
| `POSTGRES_DB`       | No          | `taskflow`    | Base principal; también se crea `<POSTGRES_DB>_test` |
| `POSTGRES_PORT`     | No          | `5432`        | Puerto publicado en el host                          |

`.env` y `.env.test` están en `.gitignore`. Solo se versionan las plantillas `*.example`.

## Base de datos y migraciones

El esquema vive en [`prisma/schema.prisma`](prisma/schema.prisma) y las migraciones SQL versionadas
en [`prisma/migrations/`](prisma/migrations/). La conexión se configura en
[`prisma.config.ts`](prisma.config.ts), que lee `DATABASE_URL`.

### Modelo `Task` (tabla `tasks`)

| Campo         | Tipo PostgreSQL    | Restricciones                                                    |
| ------------- | ------------------ | ---------------------------------------------------------------- |
| `id`          | `UUID`             | PK, generado por la aplicación (UUID v4)                         |
| `title`       | `VARCHAR(200)`     | `NOT NULL`, `CHECK` no vacío                                     |
| `description` | `VARCHAR(2000)`    | Opcional                                                         |
| `status`      | enum `task_status` | `PENDING` \| `IN_PROGRESS` \| `COMPLETED`, por defecto `PENDING` |
| `assignee`    | `VARCHAR(100)`     | `NOT NULL`, `CHECK` no vacío                                     |
| `due_date`    | `TIMESTAMPTZ(3)`   | `NOT NULL`                                                       |
| `created_at`  | `TIMESTAMPTZ(3)`   | `DEFAULT CURRENT_TIMESTAMP`                                      |
| `updated_at`  | `TIMESTAMPTZ(3)`   | Actualizado automáticamente por Prisma (`@updatedAt`)            |

Índices:

- `(assignee, status)`: filtro por responsable, solo o combinado con estado.
- `(status)`: filtro solo por estado.
- `(created_at DESC)`: orden por defecto del listado.

### Comandos

```bash
npm run db:migrate          # Aplica las migraciones pendientes (prisma migrate deploy)
npm run db:migrate:status   # Muestra el estado de las migraciones
npm run db:migrate:dev      # Desarrollo: crea una nueva migración a partir de cambios en el schema
npm run prisma:generate     # Regenera el cliente tipado en src/generated/prisma
npm run db:seed             # Carga el juego de datos de ejemplo (idempotente)
npm run db:studio           # Explorador visual de datos
```

Un entorno nuevo reproduce el esquema completo con `docker compose up -d && npm run db:migrate`.

### Datos de ejemplo (seed)

`npm run db:seed` ejecuta [`prisma/seed.ts`](prisma/seed.ts) y carga **12 tareas** con los tres
estados, cuatro responsables (`ana.garcia`, `luis.martinez`, `carmen.lopez` y `jorge.ruiz`) y
tareas con y sin descripción. Sirve para probar los filtros y la paginación desde el primer
momento, por ejemplo con `GET /api/v1/tasks?status=PENDING&assignee=carmen.lopez`, que devuelve
2 tareas.

- **Idempotente:** cada tarea tiene un UUID fijo y se inserta o actualiza con `upsert`. Ejecutarlo
  varias veces no duplica filas ni borra las tareas que hayas creado por la API.
- **Seguro:** se niega a ejecutarse con `NODE_ENV=production`.

> El script de inicialización `docker/postgres/init/01-create-test-database.sh` solo se ejecuta la
> **primera vez** que se crea el volumen. Si el volumen ya existía, crea la base de pruebas a mano:
> `docker compose exec postgres createdb -U taskflow taskflow_test`.

## Scripts disponibles

| Script                 | Descripción                                   |
| ---------------------- | --------------------------------------------- |
| `npm run start:dev`    | Desarrollo con recarga en caliente            |
| `npm run build`        | Compila a `dist/`                             |
| `npm run start:prod`   | Ejecuta la versión compilada                  |
| `npm test`             | Pruebas unitarias                             |
| `npm run test:cov`     | Pruebas unitarias con cobertura               |
| `npm run test:e2e`     | Pruebas end-to-end contra la base de pruebas  |
| `npm run lint`         | ESLint (reglas con información de tipos)      |
| `npm run format:check` | Comprueba el formato con Prettier             |
| `npm run typecheck`    | Compilación de TypeScript sin emitir archivos |

## Referencia de la API

Prefijo global: **`/api/v1`**. Todas las fechas se aceptan y se devuelven en **ISO 8601**.

| Método   | Ruta         | Descripción                      | Éxito            |
| -------- | ------------ | -------------------------------- | ---------------- |
| `POST`   | `/tasks`     | Crea una tarea                   | `201 Created`    |
| `GET`    | `/tasks`     | Lista paginada y filtrable       | `200 OK`         |
| `GET`    | `/tasks/:id` | Obtiene una tarea por UUID       | `200 OK`         |
| `PATCH`  | `/tasks/:id` | Actualiza parcialmente una tarea | `200 OK`         |
| `DELETE` | `/tasks/:id` | Elimina una tarea                | `204 No Content` |

### Crear una tarea

```bash
curl -X POST http://localhost:3000/api/v1/tasks \
  -H 'Content-Type: application/json' \
  -d '{
        "title": "Preparar la sprint review",
        "description": "Recopilar las demos de cada equipo",
        "assignee": "ana.garcia",
        "dueDate": "2026-12-31T17:00:00Z"
      }'
```

```json
{
  "id": "3f2b8c1e-6d4a-4e2f-9b7a-1c5d8e9f0a12",
  "title": "Preparar la sprint review",
  "description": "Recopilar las demos de cada equipo",
  "status": "PENDING",
  "assignee": "ana.garcia",
  "dueDate": "2026-12-31T17:00:00.000Z",
  "createdAt": "2026-11-14T10:00:00.000Z",
  "updatedAt": "2026-11-14T10:00:00.000Z"
}
```

### Listar, filtrar y paginar

```bash
curl 'http://localhost:3000/api/v1/tasks?status=PENDING&assignee=ana.garcia&page=1&limit=20'
```

| Parámetro  | Tipo    | Por defecto | Reglas                                      |
| ---------- | ------- | ----------- | ------------------------------------------- |
| `status`   | enum    | —           | `PENDING`, `IN_PROGRESS` o `COMPLETED`      |
| `assignee` | string  | —           | Coincidencia exacta; de 1 a 100 caracteres  |
| `page`     | integer | `1`         | Entre 1 y 1 000 000                         |
| `limit`    | integer | `10`        | Entre 1 y **100** (tamaño máximo de página) |

Los filtros son combinables. El resultado se ordena por `createdAt` descendente, con `id` como
desempate, para que las páginas sean estables. Los parámetros desconocidos se rechazan con `400`.

```json
{
  "data": [{ "id": "…", "title": "…" }],
  "meta": { "total": 42, "page": 1, "limit": 20, "totalPages": 3 }
}
```

### Actualizar parcialmente

```bash
curl -X PATCH http://localhost:3000/api/v1/tasks/<id> \
  -H 'Content-Type: application/json' \
  -d '{ "status": "COMPLETED", "description": null }'
```

Solo se modifican los campos enviados. `description: null` borra la descripción. Enviar `null` en
un campo obligatorio (`title`, `assignee`, `status`, `dueDate`) devuelve `400`.

### Reglas de validación

- `title` y `assignee`: strings obligatorios. Se recortan los espacios, no pueden quedar vacíos y
  tienen un máximo de 200 y 100 caracteres, respectivamente.
- `description`: string opcional de hasta 2000 caracteres, o `null`.
- `status`: uno de los valores del enum.
- `dueDate`: ISO 8601 **estricto**, ya sea una fecha (`2026-12-31`, que se interpreta como medianoche
  UTC) o una fecha-hora con zona (`2026-12-31T17:00:00+02:00`). Se rechazan fechas imposibles
  (`2026-02-30`), formatos locales (`31/12/2026`) y timestamps numéricos.
- `:id`: debe ser un UUID válido.
- Las propiedades no declaradas en el DTO se rechazan (`forbidNonWhitelisted`).

### Formato de error

Todas las respuestas de error comparten la misma estructura:

```json
{
  "statusCode": 400,
  "error": "Bad Request",
  "message": ["title should not be empty", "dueDate must be a valid ISO 8601 date string"],
  "path": "/api/v1/tasks",
  "timestamp": "2026-11-14T10:00:00.000Z"
}
```

| Código | Cuándo                                                                                                 |
| ------ | ------------------------------------------------------------------------------------------------------ |
| `400`  | Body, query o UUID inválidos; JSON mal formado; propiedades desconocidas                               |
| `404`  | La tarea no existe o la ruta no existe                                                                 |
| `500`  | Error inesperado. Se devuelve un mensaje genérico y el detalle solo se registra en el log del servidor |

Los errores internos (SQL, errores del driver, stack traces, configuración) **nunca** se exponen al
cliente.

## Documentación Swagger

- UI interactiva: <http://localhost:3000/api/docs>
- Especificación OpenAPI en JSON: <http://localhost:3000/api/docs-json>

Documenta cada endpoint, los DTOs de request (con ejemplos y restricciones), los esquemas de
respuesta (tarea, página y error), los parámetros de query y los códigos HTTP posibles.

## Pruebas

```bash
npm test            # Unitarias (no necesitan base de datos)
npm run test:cov    # Unitarias con informe de cobertura
npm run test:e2e    # End-to-end (necesitan PostgreSQL en marcha y .env.test)
```

**Unitarias** (`src/**/*.spec.ts`, 35 casos):

- `TasksService` con Prisma simulado: filtros combinados, cálculo de `skip`/`take` y metadatos,
  404, traducción del error P2025 y propagación de errores inesperados.
- DTOs: recorte de espacios, fechas ISO estrictas, campos vacíos, tipos incorrectos, enum, límites
  de longitud, `null` en PATCH y paginación.
- `AllExceptionsFilter`: formato del error, 4xx sin cambios y 500 genérico sin filtraciones.
- Validación de variables de entorno.

**End-to-end** (`test/*.e2e-spec.ts`, 27 casos): levantan la aplicación completa con el mismo pipeline que
producción (`configureApp`) y la prueban con Supertest contra PostgreSQL real. Cubren la creación
correcta e incorrecta, la obtención de tareas inexistentes y de UUIDs inválidos, los filtros
individuales y combinados, la paginación (metadatos, páginas sin solapamiento, parámetros
inválidos), la actualización y la eliminación.

### Aislamiento de la base de pruebas

- Las pruebas e2e usan exclusivamente la `DATABASE_URL` de `.env.test` (base `taskflow_test`).
- Antes de ejecutarse, [`test/setup/test-env.ts`](test/setup/test-env.ts) **aborta si el nombre de
  la base no termina en `_test`**. Así es imposible lanzar las pruebas destructivas contra la base de
  desarrollo o la de producción.
- `globalSetup` aplica las migraciones reales (`prisma migrate deploy`) sobre la base de pruebas.
- Cada test parte de una tabla vacía. Las pruebas se ejecutan en serie (`--runInBand`).

## Arquitectura

```
src/
├── main.ts                     # Bootstrap: pipeline HTTP, Swagger y puerto
├── app.module.ts               # Módulo raíz: Config, Prisma, Tasks y filtro global
├── app.setup.ts                # Prefijo /api/v1 y ValidationPipe (compartido con los e2e)
├── swagger.ts                  # Configuración de OpenAPI
├── config/
│   └── env.validation.ts       # Validación de variables de entorno al arrancar
├── prisma/
│   ├── prisma.module.ts        # Módulo global
│   └── prisma.service.ts       # PrismaClient inyectable (adaptador pg)
├── common/
│   ├── dto/error-response.dto.ts
│   ├── filters/all-exceptions.filter.ts
│   ├── pagination/             # Tipos, helpers y DTO de metadatos
│   └── transformers/           # Trim y conversión estricta de fechas ISO
└── tasks/
    ├── tasks.module.ts
    ├── tasks.controller.ts     # Solo HTTP: rutas, pipes y documentación
    ├── tasks.service.ts        # Lógica de negocio y acceso a datos vía Prisma
    ├── tasks.constants.ts      # Límites compartidos por DTOs y esquema
    └── dto/                    # Create, Update, ListQuery y Response
prisma/
├── schema.prisma
└── migrations/
test/
├── setup/                      # Carga de .env.test, salvaguarda y migraciones
└── tasks.e2e-spec.ts
```

Flujo de una petición: **ValidationPipe** (transforma y valida el DTO) → **Controller** (solo HTTP)
→ **Service** (reglas de negocio) → **PrismaService** (acceso a datos). Cualquier excepción termina
en **AllExceptionsFilter**, que le da un formato uniforme.

## Decisiones técnicas

- **NestJS 11 en lugar de 12.** NestJS 12 (agosto de 2026) se publica solo como ESM. Con él, Jest
  tendría que usar su modo ESM experimental. La línea 11.x sigue recibiendo mantenimiento y funciona
  de forma estable con Jest, ts-jest y el cliente de Prisma en modo CJS.
- **Prisma 7.10.1 fijado.** En npm, el dist-tag `latest` del CLI `prisma` apuntaba a una release
  candidate (`8.0.0-rc`). Se fijó la última versión estable, la misma para el CLI, el cliente y el
  adaptador.
- **TypeScript 5.9.** TypeScript 7 todavía no es compatible con ts-jest (`<7`) ni con
  typescript-eslint (`<6.1`).
- **Sin capa de repositorio.** `PrismaService` ya aísla el acceso a datos y se inyecta por DI. Una
  interfaz de repositorio adicional solo añadiría indirección sin ningún beneficio en un dominio con
  una única entidad.
- **404 sin una consulta previa.** `update` y `delete` traducen el error `P2025` de Prisma a 404 en
  lugar de hacer un `SELECT` antes. Es una sola ida y vuelta a la base y evita condiciones de
  carrera.
- **Listado consistente.** `findMany` y `count` se ejecutan en la misma transacción, y el orden
  incluye `id` como desempate para que la paginación sea estable.
- **Defensa en profundidad.** Además de la validación en los DTOs, la migración añade restricciones
  `CHECK` que impiden guardar `title` o `assignee` vacíos.
- **Fechas.** Se usa `TIMESTAMPTZ(3)` y se exige ISO 8601 estricto. No se usa `new Date(valor)`
  directamente porque aceptaría formatos ambiguos o números.
- **Mismo pipeline en producción y en los tests.** `configureApp()` se reutiliza en `main.ts` y en
  los e2e, y el filtro de errores se registra con `APP_FILTER`.
- **`prisma.config.ts` tolerante.** Lee `process.env.DATABASE_URL` sin lanzar error si falta, para
  que `npm ci` (que ejecuta `prisma generate` en `postinstall`) funcione en CI sin base de datos.

## Posibles mejoras

- Autenticación y autorización (JWT), y un modelo `User` real para `assignee`.
- Búsqueda de responsable sin distinguir mayúsculas (índice sobre `lower(assignee)`) y búsqueda de
  texto en `title`.
- Ordenación configurable y paginación por cursor para volúmenes grandes.
- Pipeline de CI (lint, typecheck, unitarias y e2e con un servicio de PostgreSQL).
- Dockerfile de la aplicación, healthcheck (`@nestjs/terminus`), rate limiting y `helmet`.
- Logging estructurado (pino) con identificadores de correlación.

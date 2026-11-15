# TaskFlow API

API REST para la gestión de tareas, construida con **NestJS 11**, **Prisma 7** y **PostgreSQL 17**.

Incluye CRUD completo, filtros combinables por estado y responsable, paginación con metadatos,
validación estricta de entrada, manejo de errores centralizado, migraciones reales, documentación
OpenAPI y pruebas unitarias y end-to-end contra una base de datos aislada.

### Requisitos de la prueba técnica

| Requisito                                                                             | Dónde se cumple                                                                                                                                                           |
| ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| API REST con Node.js + TypeScript (NestJS o Express)                                  | NestJS 11 con TypeScript en modo estricto                                                                                                                                 |
| Crear, listar, ver, editar y borrar tareas                                            | `POST`, `GET`, `GET /:id`, `PATCH /:id` y `DELETE /:id` en `/api/v1/tasks` ([referencia](#referencia-de-la-api))                                                          |
| Título, descripción, estado (pendiente, en curso o hecha), responsable y fecha límite | `title`, `description`, `status` (`PENDING` / `IN_PROGRESS` / `COMPLETED`), `assignee` y `dueDate` ([modelo](#modelo-task-tabla-tasks))                                   |
| Filtros por estado y por responsable, con paginación                                  | `?status=&assignee=&page=&limit=`, combinables, con metadatos `total/page/limit/totalPages`                                                                               |
| Validación de datos y errores con los códigos HTTP correctos                          | DTOs con class-validator; `200`, `201`, `204`, `400`, `404` y `500` con un formato de error uniforme ([errores](#formato-de-error))                                       |
| PostgreSQL o SQLite con migraciones                                                   | PostgreSQL 17 (Docker Compose) y migraciones de Prisma en `prisma/migrations/`                                                                                            |
| Al menos 3 tests                                                                      | 35 tests unitarios y 30 end-to-end ([pruebas](#pruebas))                                                                                                                  |
| README: cómo ejecutarlo, decisiones, qué haría con más tiempo y cómo usé la IA        | [Puesta en marcha](#puesta-en-marcha), [Decisiones técnicas](#decisiones-técnicas), [Qué haría con más tiempo](#qué-haría-con-más-tiempo) y [Uso de la IA](#uso-de-la-ia) |
| Commits a medida que se avanza                                                        | Historial con un commit por hito ([Conventional Commits](https://www.conventionalcommits.org/))                                                                           |

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
12. [Uso de la IA](#uso-de-la-ia)
13. [Qué haría con más tiempo](#qué-haría-con-más-tiempo)

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

Ejecuta los pasos en orden desde la carpeta del proyecto. Cada paso indica qué deberías ver.

**1. Instalar dependencias**

```bash
npm ci
```

Al terminar se ejecuta `prisma generate`, que crea el cliente tipado en `src/generated/prisma`.

**2. Crear los archivos de configuración** a partir de las plantillas (`.env` y `.env.test` no se
versionan)

| Terminal               | Comandos                                                                |
| ---------------------- | ----------------------------------------------------------------------- |
| Linux, macOS, Git Bash | `cp .env.example .env` y `cp .env.test.example .env.test`               |
| Windows PowerShell     | `Copy-Item .env.example .env` y `Copy-Item .env.test.example .env.test` |
| Windows CMD            | `copy .env.example .env` y `copy .env.test.example .env.test`           |

Si el puerto 5432 ya está ocupado, consulta [Solución de problemas](#solución-de-problemas).

**3. Levantar PostgreSQL**

```bash
docker compose up -d
docker compose ps
```

El contenedor `taskflow-postgres` debe aparecer como `healthy`. La primera vez se crean también la
base `taskflow` y la base de pruebas `taskflow_test`.

**4. Aplicar las migraciones**

```bash
npm run db:migrate
```

Debe mostrar `All migrations have been successfully applied.`

**5. Cargar el juego de datos de ejemplo (recomendado)**

```bash
npm run db:seed
```

Debe mostrar `Seed completed: 12 sample tasks upserted (12 in total).`

> Sin este paso la API funciona igual, pero la base está vacía y `GET /api/v1/tasks` devuelve
> `{"data":[],"meta":{"total":0,...}}`.

**6. Arrancar la API**

```bash
npm run start:dev
```

Debe mostrar `TaskFlow API listening on port 3000`. Después comprueba:

- <http://localhost:3000/api/v1/tasks>: 10 tareas y `"meta":{"total":12,"page":1,"limit":10,"totalPages":2}`.
- <http://localhost:3000/api/docs>: Swagger UI.

**7. Ejecutar las pruebas (opcional)**

```bash
npm test            # 35 tests unitarios
npm run test:e2e    # 30 tests end-to-end (la base taskflow_test se migra sola)
```

### Solución de problemas

| Síntoma                                                                | Causa y solución                                                                                                                                  |
| ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `docker compose up` falla con _port is already allocated_              | El puerto 5432 lo usa otro PostgreSQL. Define `POSTGRES_PORT=5433` en `.env` y usa `localhost:5433` en `DATABASE_URL` en `.env` y `.env.test`.    |
| `docker` no responde o _cannot connect to the Docker daemon_           | Docker Desktop no está arrancado. Ábrelo y espera a que el motor esté en marcha.                                                                  |
| La app termina con _Invalid environment configuration_                 | Falta `.env` o tiene un valor inválido. El mensaje indica qué variable revisar.                                                                   |
| `npm run test:e2e` falla con _database "taskflow_test" does not exist_ | El volumen se creó antes de que existiera el script de inicialización. Ejecuta `docker compose exec postgres createdb -U taskflow taskflow_test`. |
| `npm run test:e2e` termina con _Refusing to run e2e tests_             | Salvaguarda activa: la `DATABASE_URL` de `.env.test` no apunta a una base `*_test`.                                                               |
| _EADDRINUSE: address already in use :::3000_                           | Otro proceso usa el puerto 3000. Cambia `PORT` en `.env`.                                                                                         |
| `GET /api/v1/tasks` devuelve `"total":0`                               | La base está vacía porque no se cargó el juego de datos. Ejecuta `npm run db:seed` (no hace falta reiniciar la API).                              |
| `"cp" no se reconoce como un comando…`                                 | Estás en Windows CMD. Usa `copy` (CMD) o `Copy-Item` (PowerShell), como se indica en el paso 2.                                                   |

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

Los ejemplos con `curl` funcionan en Linux, macOS y Git Bash. En **Windows PowerShell**, `curl` es
un alias de `Invoke-WebRequest`, y además PowerShell 5.1 rompe las comillas del JSON al pasarlo a
`curl.exe`. Usa Swagger UI o el comando nativo `Invoke-RestMethod`:

```powershell
$base = 'http://localhost:3000/api/v1/tasks'

# Crear
$task = Invoke-RestMethod -Method Post -Uri $base -ContentType 'application/json' `
  -Body '{"title":"Demo","assignee":"ana.garcia","dueDate":"2026-12-31"}'

# Listar con filtros y paginación
Invoke-RestMethod "$($base)?status=PENDING&assignee=carmen.lopez&page=1&limit=10"

# Obtener, actualizar y eliminar
Invoke-RestMethod "$base/$($task.id)"
Invoke-RestMethod -Method Patch -Uri "$base/$($task.id)" -ContentType 'application/json' -Body '{"status":"COMPLETED"}'
Invoke-RestMethod -Method Delete -Uri "$base/$($task.id)"
```

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

Swagger UI es la forma más rápida de explorar y probar la API sin herramientas externas.

- **UI interactiva:** <http://localhost:3000/api/docs>
- **Especificación OpenAPI 3 (JSON):** <http://localhost:3000/api/docs-json>. Se puede importar en
  Postman, Insomnia o un generador de clientes.

### Qué incluye

| Elemento            | Contenido                                                                                                                                                          |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Portada             | Convenciones de la API: prefijo, fechas, paginación, validación, formato de error y códigos                                                                        |
| Cada operación      | Resumen y descripción del comportamiento (reglas de validación, valores por defecto, casos límite)                                                                 |
| Parámetros          | `id` (UUID), `status` (desplegable con los valores del enum), `assignee`, `page` y `limit`, con mínimos, máximos y valores por defecto                             |
| Cuerpos de petición | Ejemplos seleccionables. **POST:** solo obligatorios / todos los campos / payload inválido. **PATCH:** completar / reasignar y reprogramar / borrar la descripción |
| Respuestas          | Esquema y ejemplo de cada código posible: `200`/`201`/`204`, `400` (con varios ejemplos), `404` y `500`                                                            |
| Schemas             | `CreateTaskDto`, `UpdateTaskDto`, `TaskResponseDto`, `PaginatedTasksResponseDto`, `PaginationMetaDto`, `ErrorResponseDto` y `TaskStatus`                           |

### Cómo probar un endpoint

1. Arranca la API (`npm run start:dev`) y abre <http://localhost:3000/api/docs>.
2. Despliega una operación, por ejemplo **POST /api/v1/tasks**. "Try it out" ya viene activado.
3. En **Examples**, elige un ejemplo de cuerpo (por ejemplo, _Required fields only_) o edítalo.
4. Pulsa **Execute**. Verás el comando `curl` equivalente, la URL, el código de respuesta, el cuerpo,
   las cabeceras y la duración de la petición.
5. Prueba el ejemplo _Invalid payload_ para ver la respuesta `400` con todos los errores de validación.
6. Copia el `id` de la respuesta y úsalo en **GET / PATCH / DELETE /api/v1/tasks/{id}**.

Con el juego de datos cargado (`npm run db:seed`), prueba **GET /api/v1/tasks** con
`status=PENDING` y `assignee=carmen.lopez`: devuelve 2 tareas con su `meta` de paginación.

### Dónde se define

- [`src/swagger.ts`](src/swagger.ts): título, versión, la descripción de la portada y las opciones de
  la UI.
- [`src/tasks/tasks.swagger.ts`](src/tasks/tasks.swagger.ts): un decorador por operación
  (`@ApiCreateTask()`, `@ApiListTasks()`, etc.) con los ejemplos y las respuestas. Así el controlador
  queda limpio.
- DTOs (`@ApiProperty`): descripción, ejemplo, límites y formato de cada campo. Los límites usan las
  mismas constantes que la validación, así que la documentación no puede desincronizarse.
- [`test/swagger.e2e-spec.ts`](test/swagger.e2e-spec.ts): comprueba de forma automática que la UI se
  sirve, que cada operación documenta sus códigos HTTP y que no hay referencias a schemas
  inexistentes.

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

**End-to-end** (`test/*.e2e-spec.ts`, 30 casos: 27 de la API y 3 de Swagger): levantan la aplicación completa con el mismo pipeline que
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
    ├── tasks.controller.ts     # Solo HTTP: rutas, códigos de estado y pipes
    ├── tasks.service.ts        # Lógica de negocio y acceso a datos vía Prisma
    ├── tasks.swagger.ts        # Documentación OpenAPI de cada operación (ejemplos y respuestas)
    ├── tasks.constants.ts      # Límites compartidos por DTOs y esquema
    └── dto/                    # Create, Update, ListQuery y Response
prisma/
├── schema.prisma
├── seed.ts                     # Juego de datos de ejemplo (idempotente)
└── migrations/
test/
├── setup/                      # Carga de .env.test, salvaguarda y migraciones
├── tasks.e2e-spec.ts           # Comportamiento de la API contra PostgreSQL real
└── swagger.e2e-spec.ts         # Contrato OpenAPI publicado
```

Las clases y los métodos públicos (servicio, controlador, filtro, helpers y configuración) están
documentados con **JSDoc**: qué hacen, qué esperan, qué devuelven, qué excepciones lanzan y el
porqué de las decisiones que no son obvias.

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

## Uso de la IA

Desarrollé el proyecto con **Claude Code** (modelo Claude Opus 5.5) dentro de VS Code, como asistente
de _pair programming_: la IA proponía y escribía código, y yo definía los requisitos, revisaba cada
hito, decidía y probaba. Los commits en los que participó llevan la línea
`Co-Authored-By: Claude`.

### Qué le pedí

- Un prompt inicial detallado: el stack (NestJS, Prisma, PostgreSQL, Jest, Swagger), los principios
  de arquitectura (capas separadas, DTOs, inyección de dependencias, sin abstracciones innecesarias),
  los requisitos de validación, errores y tests, y una disciplina de Git estricta: un commit por hito,
  comprobaciones antes de cada commit y nunca reescribir el historial.
- Que verificara la compatibilidad de las versiones antes de instalar nada.
- Tras la primera versión: un juego de datos de ejemplo, una documentación Swagger más completa y
  JSDoc en servicios y métodos, para que otro programador pudiera entender el código.
- Que no se subiera al repositorio su carpeta de configuración local (`.claude/`).

### Qué acepté

- La arquitectura por capas (controlador → servicio → `PrismaService`) sin capa de repositorio, y el
  filtro de excepciones global.
- Las decisiones de versiones que me propuso tras comprobar la compatibilidad, con sus motivos (ver
  [Decisiones técnicas](#decisiones-técnicas)): NestJS 11 en lugar de 12, Prisma 7.10.1 fijado y
  TypeScript 5.9.
- La estrategia de tests: unitarios con Prisma simulado y e2e contra una base `_test` aislada, con una
  salvaguarda que aborta si la base no es de pruebas.

### Qué corregí

Revisé cada hito y probé el proyecto desde cero, como lo haría alguien que lo descarga por primera
vez. Eso me permitió detectar cosas que la IA había dado por buenas:

- **Instrucciones que no funcionaban en Windows:** el paso `cp` fallaba en CMD y el ejemplo de
  `curl` para PowerShell no funcionaba. Se sustituyeron por comandos comprobados.
- **Seed poco visible:** el paso para cargar los datos de ejemplo estaba marcado como opcional y, sin
  él, la lista salía vacía sin ninguna pista. Ahora está marcado como recomendado.
- **Fechas y zonas horarias:** detecté que una fecha sin hora se interpreta como medianoche UTC, lo
  que en mi zona horaria (UTC−4) la muestra como el día anterior. Lo documenté como mejora.
- **Documentación insuficiente:** pedí ampliar Swagger y documentar servicios y métodos con JSDoc,
  porque el código tiene que poder entenderlo otro programador. Al revisar Swagger en el navegador
  aparecieron esquemas que faltaban, y se corrigieron con un test que lo valida.

Además, antes de cada commit se ejecutaban lint, typecheck, build y tests, lo que permitió detectar a
tiempo errores como una compilación incompleta, corregida en un commit `fix` aparte.

### Cómo lo verifiqué

Al final cloné el repositorio en una carpeta nueva e hice una prueba completa para comprobar que las instrucciones del README le
funcionan a otra persona: instalación, Docker, migración, seed, prueba manual de cada endpoint (en
Swagger y en PowerShell) y ejecución de los tests.

## Qué haría con más tiempo

- Autenticación y autorización (JWT), y un modelo `User` real para `assignee`.
- Guardar `dueDate` como fecha de calendario (`DATE`, formato `YYYY-MM-DD`) en lugar de
  `TIMESTAMPTZ`. Hoy un vencimiento enviado como `2026-11-13` se guarda como medianoche UTC, y un
  cliente en una zona por detrás de UTC (por ejemplo, UTC−4) lo mostraría como el 12 a las 20:00.
  Con `DATE` el vencimiento sería el mismo día en cualquier zona horaria. `createdAt` y `updatedAt`
  seguirían en `TIMESTAMPTZ`, porque sí representan un instante exacto.
- Búsqueda de responsable sin distinguir mayúsculas (índice sobre `lower(assignee)`) y búsqueda de
  texto en `title`.
- Ordenación configurable y paginación por cursor para volúmenes grandes.
- Pipeline de CI (lint, typecheck, unitarias y e2e con un servicio de PostgreSQL).
- Dockerfile de la aplicación, healthcheck (`@nestjs/terminus`), rate limiting y `helmet`.
- Logging estructurado (pino) con identificadores de correlación.

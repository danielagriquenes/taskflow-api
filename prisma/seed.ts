/**
 * Development seed data for TaskFlow.
 *
 * Idempotent: every task has a fixed UUID and is upserted, so running
 * `npm run db:seed` repeatedly never duplicates rows and never deletes tasks
 * created through the API. Refuses to run with NODE_ENV=production.
 */
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { type Prisma, PrismaClient } from '../src/generated/prisma/client';
import { TaskStatus } from '../src/generated/prisma/enums';

type SeedTask = Prisma.TaskCreateInput & { id: string };

const SEED_TASKS: SeedTask[] = [
  {
    id: '0b7e2a5c-1f4d-4c8e-9a3b-000000000001',
    title: 'Definir el alcance del MVP',
    description: 'Acordar con producto las funcionalidades de la primera versión.',
    status: TaskStatus.COMPLETED,
    assignee: 'ana.garcia',
    dueDate: new Date('2026-11-02T17:00:00.000Z'),
  },
  {
    id: '0b7e2a5c-1f4d-4c8e-9a3b-000000000002',
    title: 'Diseñar el modelo de datos',
    description: 'Entidades, relaciones e índices necesarios para las consultas principales.',
    status: TaskStatus.COMPLETED,
    assignee: 'luis.martinez',
    dueDate: new Date('2026-11-06T17:00:00.000Z'),
  },
  {
    id: '0b7e2a5c-1f4d-4c8e-9a3b-000000000003',
    title: 'Configurar el pipeline de CI',
    description: 'Lint, typecheck, tests unitarios y e2e en cada pull request.',
    status: TaskStatus.IN_PROGRESS,
    assignee: 'luis.martinez',
    dueDate: new Date('2026-11-20T17:00:00.000Z'),
  },
  {
    id: '0b7e2a5c-1f4d-4c8e-9a3b-000000000004',
    title: 'Implementar autenticación JWT',
    description: null,
    status: TaskStatus.PENDING,
    assignee: 'ana.garcia',
    dueDate: new Date('2026-12-04T17:00:00.000Z'),
  },
  {
    id: '0b7e2a5c-1f4d-4c8e-9a3b-000000000005',
    title: 'Revisar la documentación de Swagger',
    description: 'Comprobar ejemplos, códigos de respuesta y descripciones de cada endpoint.',
    status: TaskStatus.IN_PROGRESS,
    assignee: 'ana.garcia',
    dueDate: new Date('2026-11-18T12:00:00.000Z'),
  },
  {
    id: '0b7e2a5c-1f4d-4c8e-9a3b-000000000006',
    title: 'Preparar la demo para el cliente',
    description: 'Guion, datos de ejemplo y entorno de demostración estable.',
    status: TaskStatus.PENDING,
    assignee: 'carmen.lopez',
    dueDate: new Date('2026-11-27T09:00:00.000Z'),
  },
  {
    id: '0b7e2a5c-1f4d-4c8e-9a3b-000000000007',
    title: 'Corregir el cálculo de páginas vacías',
    description: null,
    status: TaskStatus.COMPLETED,
    assignee: 'carmen.lopez',
    dueDate: new Date('2026-11-10T17:00:00.000Z'),
  },
  {
    id: '0b7e2a5c-1f4d-4c8e-9a3b-000000000008',
    title: 'Configurar copias de seguridad de la base de datos',
    description: 'Backups diarios con retención de 30 días y prueba de restauración.',
    status: TaskStatus.PENDING,
    assignee: 'jorge.ruiz',
    dueDate: new Date('2026-12-15T17:00:00.000Z'),
  },
  {
    id: '0b7e2a5c-1f4d-4c8e-9a3b-000000000009',
    title: 'Añadir monitorización y alertas',
    description: 'Métricas de latencia y errores 5xx con alertas en el canal del equipo.',
    status: TaskStatus.IN_PROGRESS,
    assignee: 'jorge.ruiz',
    dueDate: new Date('2026-12-01T17:00:00.000Z'),
  },
  {
    id: '0b7e2a5c-1f4d-4c8e-9a3b-000000000010',
    title: 'Planificar la sprint 12',
    description: null,
    status: TaskStatus.PENDING,
    assignee: 'luis.martinez',
    dueDate: new Date('2026-11-24T10:00:00.000Z'),
  },
  {
    id: '0b7e2a5c-1f4d-4c8e-9a3b-000000000011',
    title: 'Actualizar dependencias de seguridad',
    description: 'Revisar el informe de npm audit y aplicar parches compatibles.',
    status: TaskStatus.PENDING,
    assignee: 'carmen.lopez',
    dueDate: new Date('2026-12-10T17:00:00.000Z'),
  },
  {
    id: '0b7e2a5c-1f4d-4c8e-9a3b-000000000012',
    title: 'Redactar la guía de onboarding',
    description: 'Puesta en marcha del entorno local y convenciones del equipo.',
    status: TaskStatus.COMPLETED,
    assignee: 'jorge.ruiz',
    dueDate: new Date('2026-11-12T17:00:00.000Z'),
  },
];

async function main(): Promise<void> {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Refusing to seed a production database (NODE_ENV=production).');
  }
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is not set. Copy .env.example to .env first.');
  }

  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
  try {
    for (const { id, ...data } of SEED_TASKS) {
      await prisma.task.upsert({ where: { id }, create: { id, ...data }, update: data });
    }
    const total = await prisma.task.count();
    console.log(`Seed completed: ${SEED_TASKS.length} sample tasks upserted (${total} in total).`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});

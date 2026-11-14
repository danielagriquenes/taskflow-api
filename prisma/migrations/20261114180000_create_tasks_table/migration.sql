-- CreateEnum
CREATE TYPE "task_status" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED');

-- CreateTable
CREATE TABLE "tasks" (
    "id" UUID NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "description" VARCHAR(2000),
    "status" "task_status" NOT NULL DEFAULT 'PENDING',
    "assignee" VARCHAR(100) NOT NULL,
    "due_date" TIMESTAMPTZ(3) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "tasks_pkey" PRIMARY KEY ("id")
);

-- Data integrity constraints not expressible in the Prisma schema.
-- Defence in depth: the API validates these too, but the database must never
-- store blank required text.
ALTER TABLE "tasks"
    ADD CONSTRAINT "tasks_title_not_blank_chk" CHECK (btrim("title") <> ''),
    ADD CONSTRAINT "tasks_assignee_not_blank_chk" CHECK (btrim("assignee") <> '');

-- CreateIndex
CREATE INDEX "tasks_assignee_status_idx" ON "tasks"("assignee", "status");

-- CreateIndex
CREATE INDEX "tasks_status_idx" ON "tasks"("status");

-- CreateIndex
CREATE INDEX "tasks_created_at_idx" ON "tasks"("created_at" DESC);

import { Module } from '@nestjs/common';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';

/**
 * Tasks feature module. `PrismaService` is not imported here because
 * `PrismaModule` is global.
 */
@Module({
  controllers: [TasksController],
  providers: [TasksService],
})
export class TasksModule {}

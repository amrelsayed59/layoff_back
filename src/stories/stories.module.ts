import { Module } from '@nestjs/common';
import { StoriesService } from './stories.service';
import { StoriesController } from './stories.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { ItemsController } from '../items/items.controller';
import { AdminController } from '../admin/admin.controller';

@Module({
  imports: [PrismaModule],
  controllers: [StoriesController, ItemsController, AdminController],
  providers: [StoriesService],
})
export class StoriesModule {}

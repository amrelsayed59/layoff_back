import {
  Body,
  Controller,
  Get,
  Patch,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';

import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { StoriesService } from '../stories/stories.service';
import { AdminStoriesQueryDto } from './dto/admin-stories-query.dto';
import { BulkUpdateDto } from './dto/bulk-update.dto';

interface AuthedRequest extends Request {
  user?: { id?: string | number; email?: string; role?: string };
}

/**
 * Admin moderation endpoints.
 */
@Controller('admin/stories')
export class AdminController {
  constructor(private readonly storiesService: StoriesService) {}

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  @Get()
  list(@Query() query: AdminStoriesQueryDto) {
    return this.storiesService.adminListStories(query.view);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  @Patch('bulk-update')
  bulkUpdate(@Req() req: AuthedRequest, @Body() dto: BulkUpdateDto) {
    // JwtStrategy sets `{ id, email, role }`.
    const actorId = Number(req.user?.id);
    return this.storiesService.adminBulkUpdate(actorId, dto);
  }
}

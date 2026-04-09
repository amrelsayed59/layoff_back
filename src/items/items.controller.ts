import { Controller, Patch, Param, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { StoriesService } from '../stories/stories.service';

@Controller('items')
export class ItemsController {
  constructor(private readonly storiesService: StoriesService) {}

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  @Patch(':id/unapprove')
  unapprove(@Param('id') id: string) {
    // Alias endpoint for "items" -> story unapprove.
    return this.storiesService.unapprove(id);
  }
}

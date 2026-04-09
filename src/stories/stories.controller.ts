import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { StoriesService } from './stories.service';
import { CreateStoryDto } from './dto/create-story.dto';
import { CreateReportDto } from './dto/create-report.dto';
import { UpdateStatusDto } from './dto/update-status.dto';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('stories')
export class StoriesController {
  constructor(private readonly storiesService: StoriesService) {}

  @Post()
  create(@Body() createStoryDto: CreateStoryDto) {
    return this.storiesService.createStory(createStoryDto);
  }

  @Post(':id/report')
  report(@Param('id') id: string, @Body() dto: CreateReportDto) {
    return this.storiesService.reportStory(id, dto);
  }

  @Get()
  getApproved(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('industry') industry?: string,
    @Query('reason') reason?: string,
  ) {
    return this.storiesService.getApprovedStories({
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      search,
      industry,
      reason,
    });
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  @Get('pending')
  getPending() {
    return this.storiesService.getPendingStories();
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Body() updateStatusDto: UpdateStatusDto,
  ) {
    return this.storiesService.updateStatus(id, updateStatusDto.status);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  @Patch(':id/unapprove')
  unapprove(@Param('id') id: string) {
    return this.storiesService.unapprove(id);
  }
}

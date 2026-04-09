import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateStoryDto } from './dto/create-story.dto';
import { LayoffStory } from '@prisma/client';

export interface ApprovedStoriesQuery {
  page?: number;
  limit?: number;
  search?: string;
  industry?: string;
  reason?: string;
}

@Injectable()
export class StoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async createStory(dto: CreateStoryDto) {
    return this.prisma.layoffStory.create({
      data: {
        ...dto,
        company: dto.company ?? null,
        isAnonymous: dto.isAnonymous ?? false,
        status: 'pending',
      },
    });
  }

  /**
   * Returns approved stories with optional pagination and filtering.
   * Keeps the response shape backward-compatible (array of transformed stories).
   */
  async getApprovedStories(query: ApprovedStoriesQuery = {}) {
    const page =
      Number.isFinite(query.page) && (query.page as number) > 0
        ? (query.page as number)
        : 1;
    const limit =
      Number.isFinite(query.limit) &&
      (query.limit as number) > 0 &&
      (query.limit as number) <= 50
        ? (query.limit as number)
        : 10;
    const skip = (page - 1) * limit;

    const search = (query.search ?? '').trim();
    const industry = (query.industry ?? '').trim();
    const reason = (query.reason ?? '').trim();

    const stories = await this.prisma.layoffStory.findMany({
      where: {
        status: 'approved',
        ...(industry ? { industry } : {}),
        ...(reason ? { reason } : {}),
        ...(search
          ? {
              OR: [
                { role: { contains: search, mode: 'insensitive' } },
                { story: { contains: search, mode: 'insensitive' } },
                { company: { contains: search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    });
    return stories.map((s) => this.transformStory(s));
  }

  async getPendingStories() {
    const stories = await this.prisma.layoffStory.findMany({
      where: { status: 'pending' },
      orderBy: { createdAt: 'desc' },
    });
    return stories.map((s) => this.transformStory(s));
  }

  async updateStatus(id: string, status: string) {
    const storyId = Number(id);
    if (!Number.isInteger(storyId) || storyId <= 0) {
      throw new BadRequestException('Invalid story id');
    }

    const existingStory = await this.prisma.layoffStory.findUnique({
      where: { id: storyId },
    });

    if (!existingStory) {
      throw new NotFoundException('Story not found');
    }

    return this.prisma.layoffStory.update({
      where: { id: storyId },
      data: { status },
    });
  }

  private transformStory(story: LayoffStory) {
    return {
      // Keep API contract stable for the Angular app (string id).
      id: String(story.id),
      companyLabel: story.isAnonymous
        ? 'Anonymous Company'
        : story.company || 'Unknown Company',
      role: story.role,
      date: story.layoffDate.toISOString(),
      tags: [story.reason, story.industry].filter(Boolean),
      preview: story.story,
      fullText: story.story,
    };
  }
}

import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateStoryDto } from './dto/create-story.dto';
import { LayoffStory, Prisma } from '@prisma/client';
import type { CreateReportDto } from './dto/create-report.dto';
import type { BulkUpdateDto } from '../admin/dto/bulk-update.dto';

type StoryStatus = LayoffStory['status'];

const ALLOWED_STATUSES: ReadonlySet<StoryStatus> = new Set([
  'pending',
  'approved',
  'rejected',
]);

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

  /**
   * Admin inbox list by view.
   * - pending/approved/rejected: filter by status
   * - reported: any story with at least 1 report (newest reports first)
   */
  async adminListStories(
    view: 'pending' | 'approved' | 'rejected' | 'reported' = 'pending',
  ) {
    if (view === 'reported') {
      const rows = await this.prisma.layoffStory.findMany({
        where: { reports: { some: {} } },
        orderBy: [{ createdAt: 'desc' }],
        include: { reports: { orderBy: { createdAt: 'desc' }, take: 3 } },
        take: 200,
      });

      return rows.map((s) => ({
        ...this.transformStory(s),
        reports: s.reports,
      }));
    }

    const rows = await this.prisma.layoffStory.findMany({
      where: { status: view },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    return rows.map((s) => this.transformStory(s));
  }

  /**
   * Performs a bulk moderation action and writes audit log events transactionally.
   */
  async adminBulkUpdate(actorId: number, dto: BulkUpdateDto) {
    if (!Number.isInteger(actorId) || actorId <= 0) {
      throw new BadRequestException('Invalid actor id');
    }

    const ids = [...new Set(dto.ids)].filter(
      (n) => Number.isInteger(n) && n > 0,
    );
    if (ids.length === 0) {
      throw new BadRequestException('No valid ids provided');
    }

    const toStatus: StoryStatus =
      dto.action === 'approve'
        ? 'approved'
        : dto.action === 'reject'
          ? 'rejected'
          : 'pending';

    const note = dto.note?.trim() || null;

    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.layoffStory.findMany({
        where: { id: { in: ids } },
        select: { id: true, status: true },
      });

      const byId = new Map(existing.map((s) => [s.id, s.status]));
      const foundIds = existing.map((s) => s.id);

      // Update statuses in bulk.
      await tx.layoffStory.updateMany({
        where: { id: { in: foundIds } },
        data: { status: toStatus },
      });

      // Audit log per story.
      const events = foundIds.map((id) => ({
        storyId: id,
        actorId,
        action: dto.action,
        fromStatus: byId.get(id) ?? null,
        toStatus,
        note,
      }));

      await tx.moderationEvent.createMany({
        data: events as Prisma.ModerationEventCreateManyInput[],
      });

      return { updated: foundIds.length };
    });
  }

  /**
   * Creates a user-submitted report for a story.
   * This endpoint is intentionally public; abuse should be handled with rate limiting at the edge.
   */
  async reportStory(id: string, dto: CreateReportDto) {
    const storyId = Number(id);
    if (!Number.isInteger(storyId) || storyId <= 0) {
      throw new BadRequestException('Invalid story id');
    }

    const existingStory = await this.prisma.layoffStory.findUnique({
      where: { id: storyId },
      select: { id: true },
    });
    if (!existingStory) {
      throw new NotFoundException('Story not found');
    }

    return this.prisma.storyReport.create({
      data: {
        storyId,
        reason: dto.reason,
        message: dto.message?.trim() || null,
      },
    });
  }

  async createStory(dto: CreateStoryDto) {
    return this.prisma.layoffStory.create({
      data: {
        ...dto,
        company: dto.company ?? null,
        location: dto.location ?? null,
        severance: dto.severance ?? null,
        isAnonymous: dto.isAnonymous ?? false,
        status: 'pending',
      },
    });
  }

  /**
   * Builds the Prisma `where` clause for approved stories with optional filters.
   * Used by both {@link getApprovedStories} `findMany` and `count` so filters stay in sync.
   */
  private buildApprovedStoriesWhere(filters: {
    search?: string;
    industry?: string;
    reason?: string;
  }): Prisma.LayoffStoryWhereInput {
    return {
      status: 'approved',
      ...(filters.industry ? { industry: filters.industry } : {}),
      ...(filters.reason ? { reason: filters.reason } : {}),
      ...(filters.search
        ? {
            OR: [
              { role: { contains: filters.search, mode: 'insensitive' } },
              { story: { contains: filters.search, mode: 'insensitive' } },
              { company: { contains: filters.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
  }

  /**
   * Returns approved stories with pagination, total count, and optional filtering.
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

    const where = this.buildApprovedStoriesWhere({ search, industry, reason });

    const [totalCount, rows] = await Promise.all([
      this.prisma.layoffStory.count({ where }),
      this.prisma.layoffStory.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    return {
      stories: rows.map((s) => this.transformStory(s)),
      totalCount,
    };
  }

  async getPendingStories() {
    const stories = await this.prisma.layoffStory.findMany({
      where: { status: 'pending' },
      orderBy: { createdAt: 'desc' },
    });
    return stories.map((s) => this.transformStory(s));
  }

  /**
   * Updates a story status (admin only).
   */
  async updateStatus(id: string, status: StoryStatus) {
    const storyId = Number(id);
    if (!Number.isInteger(storyId) || storyId <= 0) {
      throw new BadRequestException('Invalid story id');
    }

    if (!ALLOWED_STATUSES.has(status)) {
      throw new BadRequestException('Invalid status');
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

  /**
   * Removes approval for a story by moving it from `approved` back to `pending`.
   * Throws:
   * - 404 when the story does not exist
   * - 400 when the story is not currently approved
   */
  async unapprove(id: string) {
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

    if (existingStory.status !== 'approved') {
      throw new BadRequestException('Story is not approved');
    }

    return this.prisma.layoffStory.update({
      where: { id: storyId },
      data: { status: 'pending' },
    });
  }

  private transformStory(story: LayoffStory) {
    return {
      // Keep API contract stable for the Angular app (string id).
      id: String(story.id),
      companyLabel: story.isAnonymous
        ? 'Anonymous Company'
        : story.company || 'Unknown Company',
      company: story.company,
      role: story.role,
      industry: story.industry,
      reason: story.reason,
      location: story.location,
      severance: story.severance,
      status: story.status,
      date: story.layoffDate.toISOString(),
      tags: [
        story.reason,
        story.industry,
        story.location,
        story.severance,
      ].filter(Boolean),
      preview: story.story,
      fullText: story.story,
    };
  }
}

/** Paginated approved stories payload (GET `/stories`). */
export type ApprovedStoriesResponse = Awaited<
  ReturnType<StoriesService['getApprovedStories']>
>;

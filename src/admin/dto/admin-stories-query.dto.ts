import { IsIn, IsOptional, IsString } from 'class-validator';

/**
 * Query DTO for admin moderation inbox story listing.
 */
export class AdminStoriesQueryDto {
  @IsString()
  @IsOptional()
  @IsIn(['pending', 'approved', 'rejected', 'reported'])
  view?: 'pending' | 'approved' | 'rejected' | 'reported';
}

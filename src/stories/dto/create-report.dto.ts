import {
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

/**
 * Payload for reporting a story for moderation review.
 */
export class CreateReportDto {
  @IsString()
  @IsNotEmpty()
  @IsIn(['spam', 'harassment', 'doxxing', 'fake', 'other'])
  reason: 'spam' | 'harassment' | 'doxxing' | 'fake' | 'other';

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  message?: string;
}

import {
  ArrayNotEmpty,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Bulk moderation action payload.
 */
export class BulkUpdateDto {
  @IsArray()
  @ArrayNotEmpty()
  @Type(() => Number)
  @IsInt({ each: true })
  ids: number[];

  @IsString()
  @IsIn(['approve', 'reject', 'unapprove'])
  action: 'approve' | 'reject' | 'unapprove';

  @IsString()
  @IsOptional()
  @MaxLength(500)
  note?: string;
}

import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsDateString,
  IsBoolean,
} from 'class-validator';

export class CreateStoryDto {
  @IsString()
  @IsOptional()
  company?: string;

  @IsString()
  @IsNotEmpty()
  role: string;

  @IsString()
  @IsNotEmpty()
  industry: string;

  @IsString()
  @IsOptional()
  location?: string;

  @IsDateString()
  @IsNotEmpty()
  layoffDate: Date;

  @IsString()
  @IsNotEmpty()
  reason: string;

  @IsString()
  @IsOptional()
  severance?: string;

  @IsString()
  @IsNotEmpty()
  story: string;

  @IsBoolean()
  @IsOptional()
  isAnonymous?: boolean;
}

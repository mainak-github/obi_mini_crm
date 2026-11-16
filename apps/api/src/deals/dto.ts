import { Type } from 'class-transformer';
import { IsDateString, IsEnum, IsInt, IsNumber, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';
import { DealStage } from '@prisma/client';

export class CreateDealDto {
  @IsString() @MinLength(2) @MaxLength(140) name!: string;
  @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) @Max(999999999999) value!: number;
  @IsOptional() @IsEnum(DealStage) stage?: DealStage;
  @IsOptional() @IsDateString() expectedCloseDate?: string;
  @IsOptional() @IsString() ownerId?: string;
  @IsOptional() @IsString() leadId?: string;
}

export class UpdateDealDto {
  @IsOptional() @IsString() @MinLength(2) @MaxLength(140) name?: string;
  @IsOptional() @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) @Max(999999999999) value?: number;
  @IsOptional() @IsEnum(DealStage) stage?: DealStage;
  @IsOptional() @IsDateString() expectedCloseDate?: string | null;
  @IsOptional() @IsString() ownerId?: string;
  @IsOptional() @IsString() leadId?: string | null;
  @Type(() => Number) @IsInt() @Min(0) version!: number;
}

import { Type } from 'class-transformer';
import { IsDateString, IsEnum, IsInt, IsOptional, IsString, MaxLength, Min, MinLength } from 'class-validator';
import { TaskPriority, TaskStatus } from '@prisma/client';

export class CreateTaskDto {
  @IsString() @MinLength(2) @MaxLength(140) title!: string;
  @IsOptional() @IsString() @MaxLength(2000) description?: string;
  @IsDateString() dueDate!: string;
  @IsOptional() @IsEnum(TaskPriority) priority?: TaskPriority;
  @IsOptional() @IsEnum(TaskStatus) status?: TaskStatus;
  @IsOptional() @IsString() assigneeId?: string;
  @IsOptional() @IsString() leadId?: string;
  @IsOptional() @IsString() dealId?: string;
}

export class UpdateTaskDto {
  @IsOptional() @IsString() @MinLength(2) @MaxLength(140) title?: string;
  @IsOptional() @IsString() @MaxLength(2000) description?: string | null;
  @IsOptional() @IsDateString() dueDate?: string;
  @IsOptional() @IsEnum(TaskPriority) priority?: TaskPriority;
  @IsOptional() @IsEnum(TaskStatus) status?: TaskStatus;
  @IsOptional() @IsString() assigneeId?: string;
  @Type(() => Number) @IsInt() @Min(0) version!: number;
}

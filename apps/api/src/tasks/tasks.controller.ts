import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '../common/auth.guard';
import { CurrentUser, AuthUser } from '../common/current-user.decorator';
import { CreateTaskDto, UpdateTaskDto } from './dto';
import { TasksService } from './tasks.service';

@ApiTags('tasks') @ApiBearerAuth() @UseGuards(AuthGuard) @Controller('tasks')
export class TasksController {
  constructor(private readonly tasks: TasksService) {}
  @Get() async list(@CurrentUser() user: AuthUser, @Query('upcoming') upcoming?: string, @Query('overdue') overdue?: string) { return await this.tasks.list(user, upcoming === 'true', overdue === 'true'); }
  @Post() async create(@CurrentUser() user: AuthUser, @Body() dto: CreateTaskDto) { return await this.tasks.create(user, dto); }
  @Patch(':id') async update(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdateTaskDto) { return await this.tasks.update(user, id, dto); }
  @Delete(':id') async remove(@CurrentUser() user: AuthUser, @Param('id') id: string) { return await this.tasks.remove(user, id); }
}

import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '../common/auth.guard';
import { CurrentUser, AuthUser } from '../common/current-user.decorator';
import { CreateLeadDto, LeadQueryDto, UpdateLeadDto } from './dto';
import { LeadsService } from './leads.service';

@ApiTags('leads') @ApiBearerAuth() @UseGuards(AuthGuard) @Controller('leads')
export class LeadsController {
  constructor(private readonly leads: LeadsService) {}
  @Get() async list(@CurrentUser() user: AuthUser, @Query() query: LeadQueryDto) { return await this.leads.list(user, query); }
  @Post() async create(@CurrentUser() user: AuthUser, @Body() dto: CreateLeadDto) { return await this.leads.create(user, dto); }
  @Get(':id') async get(@CurrentUser() user: AuthUser, @Param('id') id: string) { return await this.leads.get(user, id); }
  @Patch(':id') async update(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdateLeadDto) { return await this.leads.update(user, id, dto); }
  @Delete(':id') async remove(@CurrentUser() user: AuthUser, @Param('id') id: string) { return await this.leads.remove(user, id); }
}

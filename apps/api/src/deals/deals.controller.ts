import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '../common/auth.guard';
import { CurrentUser, AuthUser } from '../common/current-user.decorator';
import { CreateDealDto, UpdateDealDto } from './dto';
import { DealsService } from './deals.service';

@ApiTags('deals') @ApiBearerAuth() @UseGuards(AuthGuard) @Controller('deals')
export class DealsController {
  constructor(private readonly deals: DealsService) {}
  @Get() async list(@CurrentUser() user: AuthUser) { return await this.deals.list(user); }
  @Post() async create(@CurrentUser() user: AuthUser, @Body() dto: CreateDealDto) { return await this.deals.create(user, dto); }
  @Patch(':id') async update(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdateDealDto) { return await this.deals.update(user, id, dto); }
  @Delete(':id') async remove(@CurrentUser() user: AuthUser, @Param('id') id: string) { return await this.deals.remove(user, id); }
}

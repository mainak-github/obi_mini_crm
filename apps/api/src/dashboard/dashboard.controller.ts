import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '../common/auth.guard';
import { CurrentUser, AuthUser } from '../common/current-user.decorator';
import { DashboardService } from './dashboard.service';

@ApiTags('dashboard') @ApiBearerAuth() @UseGuards(AuthGuard) @Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}
  @Get('overview') async overview(@CurrentUser() user: AuthUser) { return await this.dashboard.overview(user); }
}

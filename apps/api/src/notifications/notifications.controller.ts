import { Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '../common/auth.guard';
import { CurrentUser, AuthUser } from '../common/current-user.decorator';
import { NotificationsService } from './notifications.service';

@ApiTags('notifications') @ApiBearerAuth() @UseGuards(AuthGuard) @Controller('notifications')
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}
  @Get() async list(@CurrentUser() user: AuthUser) { return await this.notifications.list(user.id); }
  @Patch(':id/read') async markRead(@CurrentUser() user: AuthUser, @Param('id') id: string) { return await this.notifications.markRead(user.id, id); }
}

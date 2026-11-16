import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { AuthModule } from '../auth/auth.module';
import { DealsController } from './deals.controller';
import { DealsService } from './deals.service';

@Module({ imports: [AuthModule, NotificationsModule], controllers: [DealsController], providers: [DealsService] })
export class DealsModule {}

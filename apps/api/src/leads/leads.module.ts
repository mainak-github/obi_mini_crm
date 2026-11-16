import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { AuthModule } from '../auth/auth.module';
import { LeadsController } from './leads.controller';
import { LeadsService } from './leads.service';

@Module({ imports: [AuthModule, NotificationsModule], controllers: [LeadsController], providers: [LeadsService] })
export class LeadsModule {}

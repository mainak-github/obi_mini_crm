import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { OnGatewayConnection, OnGatewayDisconnect, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
@WebSocketGateway({ namespace: '/notifications', cors: { origin: true, credentials: false } })
export class NotificationsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server!: Server;
  private readonly allowedOrigin: string;
  private readonly jwtSecret: string;

  constructor(private readonly jwt: JwtService, private readonly prisma: PrismaService, config: ConfigService) {
    this.allowedOrigin = config.get<string>('WEB_ORIGIN', 'http://localhost:3000');
    this.jwtSecret = config.getOrThrow<string>('JWT_SECRET');
  }

  afterInit(server: Server): void {
    server.use((client, next) => {
      const origin = client.handshake.headers.origin;
      if (!origin || origin === this.allowedOrigin) return next();
      return next(new Error('Origin not allowed'));
    });
  }

  async handleConnection(client: Socket): Promise<void> {
    try {
      const token = client.handshake.auth?.token as string | undefined;
      if (!token) throw new Error('Missing token');
      const payload = await this.jwt.verifyAsync<{ sub: string }>(token, { secret: this.jwtSecret });
      const user = await this.prisma.user.findUnique({ where: { id: payload.sub }, select: { id: true } });
      if (!user) throw new Error('Unknown user');
      client.data.userId = user.id;
      await client.join(`user:${user.id}`);
    } catch {
      client.disconnect(true);
    }
  }

  handleDisconnect(_client: Socket): void {}

  async notifyUser(userId: string, notification: Record<string, unknown>): Promise<void> {
    this.server.to(`user:${userId}`).emit('notification', notification);
  }
}

import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { NotificationsGateway } from './notifications.gateway';
import { PrismaService } from '../prisma/prisma.service';

import { describe, expect, it } from '@jest/globals';

const makeConfig = () => ({
  get: (_key: string) => 'https://crm.example.test',
  getOrThrow: () => 'test-jwt-secret',
}) as unknown as ConfigService;

type SocketMiddleware = (socket: { handshake: { headers: { origin?: string } } }, next: (error?: Error) => void) => void;

function createMiddleware() {
  let middleware: SocketMiddleware | undefined;
  const gateway = new NotificationsGateway({} as JwtService, {} as PrismaService, makeConfig());
  gateway.afterInit({ use: (handler: SocketMiddleware) => { middleware = handler; } } as any);
  if (!middleware) throw new Error('Socket middleware was not registered');
  return middleware;
}

describe('NotificationsGateway', () => {
  it('rejects connections from origins other than the configured frontend', () => {
    const middleware = createMiddleware();
    let error: Error | undefined;
    middleware({ handshake: { headers: { origin: 'https://attacker.example' } } }, (nextError) => { error = nextError; });
    expect(error).toBeInstanceOf(Error);
  });

  it('allows the configured frontend origin', () => {
    const middleware = createMiddleware();
    let called = false;
    middleware({ handshake: { headers: { origin: 'https://crm.example.test' } } }, (error) => { if (!error) called = true; });
    expect(called).toBe(true);
  });
});
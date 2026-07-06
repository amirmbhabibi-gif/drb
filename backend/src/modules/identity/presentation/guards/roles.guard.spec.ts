import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '../../domain/user-role.enum';
import { AccessTokenPayload } from '../../application/token.service';
import { RolesGuard } from './roles.guard';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: jest.Mocked<Pick<Reflector, 'getAllAndOverride'>>;

  const makeContext = (user?: AccessTokenPayload): ExecutionContext =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
    }) as ExecutionContext;

  beforeEach(() => {
    reflector = {
      getAllAndOverride: jest.fn(),
    };
    guard = new RolesGuard(reflector as unknown as Reflector);
  });

  it('allows access when no roles are required', () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);
    expect(guard.canActivate(makeContext())).toBe(true);
  });

  it('allows access when user has required role', () => {
    reflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN]);
    const user = {
      sub: 'u1',
      phone: '09121234567',
      role: UserRole.ADMIN,
      jti: 'jti',
      type: 'access',
    } satisfies AccessTokenPayload;

    expect(guard.canActivate(makeContext(user))).toBe(true);
  });

  it('denies access when user lacks required role', () => {
    reflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN]);
    const user = {
      sub: 'u1',
      phone: '09121234567',
      role: UserRole.OWNER,
      jti: 'jti',
      type: 'access',
    } satisfies AccessTokenPayload;

    expect(() => guard.canActivate(makeContext(user))).toThrow(ForbiddenException);
  });
});

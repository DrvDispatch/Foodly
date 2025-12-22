import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Get the current authenticated user from the request
 * Usage: @CurrentUser() user: UserPayload
 */
export const CurrentUser = createParamDecorator(
    (data: unknown, ctx: ExecutionContext) => {
        const request = ctx.switchToHttp().getRequest();
        return request.user;
    },
);

/**
 * User payload attached to request after JWT validation
 */
export interface UserPayload {
    id: string;
    email: string;
    name: string | null;
    isDemo: boolean;
    onboarded: boolean;
}

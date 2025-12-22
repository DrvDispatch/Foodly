import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Optional JWT Auth Guard
 * 
 * Unlike JwtAuthGuard, this guard does NOT throw 401 if token is missing/invalid.
 * It will:
 * - Attach user to request if valid token is provided
 * - Let request through with user=undefined if no token
 * 
 * Use this for endpoints that work for both authenticated and unauthenticated users.
 */
@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
    // Override canActivate to always allow the request through
    canActivate(context: ExecutionContext) {
        // Call parent's canActivate but catch any errors
        return super.canActivate(context);
    }

    // Override handleRequest to NOT throw on missing/invalid token
    handleRequest(err: any, user: any) {
        // If there's an error or no user, just return undefined instead of throwing
        // This allows the controller to handle unauthenticated requests
        if (err || !user) {
            return undefined;
        }
        return user;
    }
}

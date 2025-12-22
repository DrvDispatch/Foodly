import { Controller, Get, UseGuards } from '@nestjs/common';
import { MomentumService } from './momentum.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, UserPayload } from '../../common/decorators';

/**
 * Momentum Controller
 * 
 * Endpoints:
 * - GET /api/momentum - Get momentum score
 */
@Controller('momentum')
@UseGuards(JwtAuthGuard)
export class MomentumController {
    constructor(private readonly momentumService: MomentumService) { }

    /**
     * GET /api/momentum
     */
    @Get()
    async getMomentum(@CurrentUser() user: UserPayload) {
        return this.momentumService.getMomentum(user.id);
    }
}

import { Controller, Get, UseGuards } from '@nestjs/common';
import { HabitsService } from './habits.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, UserPayload } from '../../common/decorators';

/**
 * Habits Controller
 * 
 * Endpoints:
 * - GET /api/habits/summary - Get habits summary
 */
@Controller('habits')
@UseGuards(JwtAuthGuard)
export class HabitsController {
    constructor(private readonly habitsService: HabitsService) { }

    /**
     * GET /api/habits/summary
     * Get user's habit metrics and heatmap
     */
    @Get('summary')
    async getSummary(@CurrentUser() user: UserPayload) {
        return this.habitsService.getHabitsSummary(user.id);
    }
}

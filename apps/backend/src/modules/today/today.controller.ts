import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { TodayService } from './today.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, UserPayload } from '../../common/decorators';

/**
 * Today Controller
 * 
 * Endpoints:
 * - GET /api/today/summary - Get unified daily summary
 */
@Controller('today')
@UseGuards(JwtAuthGuard)
export class TodayController {
    constructor(private readonly todayService: TodayService) { }

    /**
     * GET /api/today/summary
     * Get unified today summary for a specific date (or today if not specified)
     * 
     * Query params:
     * - date: YYYY-MM-DD format (optional, defaults to today)
     */
    @Get('summary')
    async getSummary(
        @CurrentUser() user: UserPayload,
        @Query('date') date?: string,
    ) {
        return this.todayService.getTodaySummary(user.id, date);
    }
}

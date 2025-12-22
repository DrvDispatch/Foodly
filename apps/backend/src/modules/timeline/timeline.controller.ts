import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { TimelineService } from './timeline.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, UserPayload } from '../../common/decorators';

/**
 * Timeline Controller
 * 
 * Endpoints:
 * - GET /api/timeline/:date - Get meal timeline for a specific date
 */
@Controller('timeline')
@UseGuards(JwtAuthGuard)
export class TimelineController {
    constructor(private readonly timelineService: TimelineService) { }

    /**
     * GET /api/timeline/:date
     * Returns meals with running totals and AI reflection
     */
    @Get(':date')
    async getTimeline(
        @CurrentUser() user: UserPayload,
        @Param('date') date: string,
    ) {
        return this.timelineService.getTimeline(user.id, date);
    }
}

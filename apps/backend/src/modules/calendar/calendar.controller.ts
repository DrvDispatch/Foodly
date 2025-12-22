import {
    Controller,
    Get,
    Put,
    Delete,
    Body,
    Query,
    UseGuards,
} from '@nestjs/common';
import { CalendarService } from './calendar.service';
import { UpsertContextDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, UserPayload } from '../../common/decorators';
import { PatternType } from '../ai/calendar.util';

/**
 * Calendar Controller
 * 
 * Endpoints:
 * - GET /api/calendar/month - Get month summary with patterns and contexts
 * - PUT /api/calendar/context - Upsert day context (tags, note)
 * - DELETE /api/calendar/context - Delete day context
 */
@Controller('calendar')
@UseGuards(JwtAuthGuard)
export class CalendarController {
    constructor(private readonly calendarService: CalendarService) { }

    /**
     * GET /api/calendar/month
     * Get month summary with day stats, patterns, and contexts
     */
    @Get('month')
    async getMonth(
        @CurrentUser() user: UserPayload,
        @Query('month') month: string,
        @Query('pattern') pattern?: PatternType,
    ) {
        return this.calendarService.getMonthSummary(user.id, month, pattern);
    }

    /**
     * PUT /api/calendar/context
     * Upsert day context (tags and note)
     */
    @Put('context')
    async upsertContext(
        @CurrentUser() user: UserPayload,
        @Body() dto: UpsertContextDto,
    ) {
        return this.calendarService.upsertContext(user.id, dto);
    }

    /**
     * DELETE /api/calendar/context
     * Delete day context
     */
    @Delete('context')
    async deleteContext(
        @CurrentUser() user: UserPayload,
        @Query('dayKey') dayKey: string,
    ) {
        return this.calendarService.deleteContext(user.id, dayKey);
    }
}

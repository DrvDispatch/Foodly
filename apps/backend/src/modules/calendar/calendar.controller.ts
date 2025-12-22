import {
    Controller,
    Get,
    Post,
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
 * - GET /api/calendar/day - Get detailed day data (meals, summary, context)
 * - POST /api/calendar/ai-filter - AI filter for calendar days
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
     * GET /api/calendar/day
     * Get detailed day data (meals, summary, context)
     */
    @Get('day')
    async getDay(
        @CurrentUser() user: UserPayload,
        @Query('dayKey') dayKey: string,
    ) {
        return this.calendarService.getDayDetail(user.id, dayKey);
    }

    /**
     * POST /api/calendar/ai-filter
     * AI-powered filter for calendar days
     */
    @Post('ai-filter')
    async aiFilter(
        @CurrentUser() user: UserPayload,
        @Body() dto: { query: string; month: string },
    ) {
        return this.calendarService.aiFilter(user.id, dto.query, dto.month);
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


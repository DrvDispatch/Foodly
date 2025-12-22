import {
    Controller,
    Get,
    Post,
    Body,
    Query,
    UseGuards,
} from '@nestjs/common';
import { CoachModuleService } from './coach-module.service';
import { SendMessageDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, UserPayload } from '../../common/decorators';

/**
 * Coach Controller
 * 
 * Endpoints:
 * - GET /api/coach/messages - Get messages (paginated)
 * - POST /api/coach/messages - Send message to coach
 * - GET /api/coach/state - Get coach state (unread)
 * - POST /api/coach/state/read - Mark as read
 */
@Controller('coach')
@UseGuards(JwtAuthGuard)
export class CoachModuleController {
    constructor(private readonly coachService: CoachModuleService) { }

    /**
     * GET /api/coach/messages
     * Get paginated messages
     */
    @Get('messages')
    async getMessages(
        @CurrentUser() user: UserPayload,
        @Query('cursor') cursor?: string,
        @Query('limit') limit?: string,
        @Query('days') days?: string,
    ) {
        return this.coachService.getMessages(user.id, {
            cursor,
            limit: limit ? parseInt(limit, 10) : undefined,
            days: days ? parseInt(days, 10) : undefined,
        });
    }

    /**
     * POST /api/coach/messages
     * Send message to coach
     */
    @Post('messages')
    async sendMessage(
        @CurrentUser() user: UserPayload,
        @Body() dto: SendMessageDto,
    ) {
        return this.coachService.sendMessage(user.id, dto);
    }

    /**
     * GET /api/coach/state
     * Get coach state (unread status)
     */
    @Get('state')
    async getState(@CurrentUser() user: UserPayload) {
        return this.coachService.getCoachState(user.id);
    }

    /**
     * POST /api/coach/state/read
     * Mark messages as read
     */
    @Post('state/read')
    async markAsRead(@CurrentUser() user: UserPayload) {
        return this.coachService.markAsRead(user.id);
    }

    /**
     * POST /api/coach/reflection
     * Generate daily reflection (if after 8pm and not already generated)
     */
    @Post('reflection')
    async generateReflection(@CurrentUser() user: UserPayload) {
        return this.coachService.generateReflection(user.id);
    }
}

import {
    Controller,
    Get,
    Post,
    Delete,
    Body,
    Query,
    UseGuards,
} from '@nestjs/common';
import { WeightService } from './weight.service';
import { CreateWeightDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, UserPayload } from '../../common/decorators';

/**
 * Weight Controller
 * 
 * Endpoints:
 * - GET /api/weight - Get weight entries with profile context
 * - POST /api/weight - Add new weight entry
 * - DELETE /api/weight - Delete weight entry
 * - GET /api/weight/history - Get full weight history
 */
@Controller('weight')
@UseGuards(JwtAuthGuard)
export class WeightController {
    constructor(private readonly weightService: WeightService) { }

    /**
     * GET /api/weight
     * Get recent weight entries with profile context
     */
    @Get()
    async getWeight(
        @CurrentUser() user: UserPayload,
        @Query('limit') limit?: string,
    ) {
        const parsedLimit = limit ? parseInt(limit, 10) : 30;
        return this.weightService.getWeightEntries(user.id, parsedLimit);
    }

    /**
     * POST /api/weight
     * Add a new weight entry
     */
    @Post()
    async addWeight(
        @CurrentUser() user: UserPayload,
        @Body() dto: CreateWeightDto,
    ) {
        return this.weightService.addWeightEntry(user.id, dto);
    }

    /**
     * DELETE /api/weight
     * Delete a weight entry by ID
     */
    @Delete()
    async deleteWeight(
        @CurrentUser() user: UserPayload,
        @Query('id') id: string,
    ) {
        return this.weightService.deleteWeightEntry(user.id, id);
    }

    /**
     * GET /api/weight/history
     * Get full weight history
     */
    @Get('history')
    async getHistory(@CurrentUser() user: UserPayload) {
        return this.weightService.getWeightHistory(user.id);
    }
}

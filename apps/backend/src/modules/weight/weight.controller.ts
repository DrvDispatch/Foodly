import {
    Controller,
    Get,
    Post,
    Put,
    Delete,
    Body,
    Param,
    Query,
    UseGuards,
} from '@nestjs/common';
import { WeightService } from './weight.service';
import { CreateWeightDto, UpdateWeightDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, UserPayload } from '../../common/decorators';

/**
 * Weight Controller
 * 
 * Endpoints:
 * - GET /api/weight - Get weight entries with profile context
 * - POST /api/weight - Add new weight entry
 * - PUT /api/weight/:id - Update weight entry
 * - DELETE /api/weight/:id - Delete weight entry
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
     * PUT /api/weight/:id
     * Update a weight entry
     */
    @Put(':id')
    async updateWeight(
        @CurrentUser() user: UserPayload,
        @Param('id') id: string,
        @Body() dto: UpdateWeightDto,
    ) {
        return this.weightService.updateWeightEntry(user.id, id, dto);
    }

    /**
     * DELETE /api/weight/:id
     * Delete a weight entry by ID
     */
    @Delete(':id')
    async deleteWeight(
        @CurrentUser() user: UserPayload,
        @Param('id') id: string,
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

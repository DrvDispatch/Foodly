import {
    Controller,
    Get,
    Post,
    Patch,
    Delete,
    Body,
    Param,
    Query,
    UseGuards,
} from '@nestjs/common';
import { MealsService } from './meals.service';
import { CreateMealDto, UpdateMealDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, UserPayload } from '../../common/decorators';

/**
 * Meals Controller
 * 
 * Endpoints:
 * - GET /api/meals - List meals (with optional date range)
 * - POST /api/meals - Create meal (starts background AI analysis)
 * - GET /api/meals/:id - Get single meal
 * - PATCH /api/meals/:id - Update meal
 * - DELETE /api/meals/:id - Delete meal
 * - POST /api/meals/:id/reanalyze - Trigger reanalysis
 */
@Controller('meals')
@UseGuards(JwtAuthGuard)
export class MealsController {
    constructor(private readonly mealsService: MealsService) { }

    /**
     * GET /api/meals
     * List meals with optional date range filter
     */
    @Get()
    async listMeals(
        @CurrentUser() user: UserPayload,
        @Query('from') from?: string,
        @Query('to') to?: string,
    ) {
        return this.mealsService.listMeals(user.id, from, to);
    }

    /**
     * POST /api/meals
     * Create a new meal and start background AI analysis
     */
    @Post()
    async createMeal(
        @CurrentUser() user: UserPayload,
        @Body() dto: CreateMealDto,
    ) {
        return this.mealsService.createMeal(user.id, dto);
    }

    /**
     * GET /api/meals/:id
     * Get single meal by ID
     */
    @Get(':id')
    async getMeal(
        @CurrentUser() user: UserPayload,
        @Param('id') id: string,
    ) {
        return this.mealsService.getMeal(user.id, id);
    }

    /**
     * PATCH /api/meals/:id
     * Update meal description and/or nutrition
     */
    @Patch(':id')
    async updateMeal(
        @CurrentUser() user: UserPayload,
        @Param('id') id: string,
        @Body() dto: UpdateMealDto,
    ) {
        return this.mealsService.updateMeal(user.id, id, dto);
    }

    /**
     * DELETE /api/meals/:id
     * Delete meal and associated photo
     */
    @Delete(':id')
    async deleteMeal(
        @CurrentUser() user: UserPayload,
        @Param('id') id: string,
    ) {
        return this.mealsService.deleteMeal(user.id, id);
    }

    /**
     * POST /api/meals/:id/reanalyze
     * Trigger reanalysis of a meal
     */
    @Post(':id/reanalyze')
    async reanalyzeMeal(
        @CurrentUser() user: UserPayload,
        @Param('id') id: string,
    ) {
        return this.mealsService.reanalyzeMeal(user.id, id);
    }
}

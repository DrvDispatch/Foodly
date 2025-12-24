import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { GoalsService } from './goals.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, UserPayload } from '../../common/decorators';

@Controller('goals')
@UseGuards(JwtAuthGuard)
export class GoalsController {
    constructor(private readonly goalsService: GoalsService) { }

    /**
     * Get goal adjustment recommendation
     */
    @Get('recommendation')
    async getRecommendation(@CurrentUser() user: UserPayload) {
        return this.goalsService.getRecommendation(user.id);
    }

    /**
     * Apply goal adjustment
     */
    @Post('apply')
    async applyRecommendation(
        @CurrentUser() user: UserPayload,
        @Body() body: {
            newGoal: string;
            newCalories: number;
            newProtein: number;
            newCarbs: number;
            newFat: number;
        }
    ) {
        return this.goalsService.applyRecommendation(
            user.id,
            body.newGoal,
            body.newCalories,
            body.newProtein,
            body.newCarbs,
            body.newFat
        );
    }
}

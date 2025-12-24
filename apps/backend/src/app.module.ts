import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { BootstrapModule } from './modules/bootstrap/bootstrap.module';
import { AccountModule } from './modules/account/account.module';
import { AiModule } from './modules/ai/ai.module';
import { StorageModule } from './modules/storage/storage.module';
import { EmailModule } from './modules/email/email.module';
import { ProfileModule } from './modules/profile/profile.module';
import { TodayModule } from './modules/today/today.module';
import { MealsModule } from './modules/meals/meals.module';
import { WeightModule } from './modules/weight/weight.module';
import { CalendarModule } from './modules/calendar/calendar.module';
import { CoachModule } from './modules/coach/coach.module';
import { InsightsModule } from './modules/insights/insights.module';
import { TrendsModule } from './modules/trends/trends.module';
import { HabitsModule } from './modules/habits/habits.module';
import { MomentumModule } from './modules/momentum/momentum.module';
import { ProgressModule } from './modules/progress/progress.module';
import { HealthModule } from './modules/health/health.module';
import { TimelineModule } from './modules/timeline/timeline.module';
import { ExportModule } from './modules/export/export.module';
import { GoalsModule } from './modules/goals/goals.module';

@Module({
    imports: [
        // Global config module
        ConfigModule.forRoot({
            isGlobal: true,
            envFilePath: ['../../.env.local', '../../.env', '.env.local', '.env'],
        }),

        // Rate limiting - protect against abuse
        ThrottlerModule.forRoot([
            { name: 'short', ttl: 1000, limit: 10 },   // 10 requests per second
            { name: 'medium', ttl: 60000, limit: 100 }, // 100 requests per minute
        ]),

        // Database
        PrismaModule,

        // Core services
        AiModule,
        StorageModule,
        EmailModule,

        // Feature modules
        AuthModule,
        BootstrapModule,
        AccountModule,
        ProfileModule,
        TodayModule,
        MealsModule,
        WeightModule,
        CalendarModule,
        CoachModule,
        InsightsModule,
        TrendsModule,
        HabitsModule,
        MomentumModule,
        ProgressModule,
        HealthModule,
        TimelineModule,
        ExportModule,
        GoalsModule,
    ],
    providers: [
        // Apply rate limiting globally to all routes
        { provide: APP_GUARD, useClass: ThrottlerGuard },
    ],
})
export class AppModule { }

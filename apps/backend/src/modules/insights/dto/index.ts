import { IsObject, IsOptional, IsIn, IsArray } from 'class-validator';

/**
 * DTO for generating an insight
 */
export class GenerateInsightDto {
    @IsObject()
    signal: any; // InsightSignal from insights.util.ts

    @IsObject()
    userContext: any; // UserContext

    @IsOptional()
    @IsIn(['brief', 'detailed'])
    level?: 'brief' | 'detailed';
}

/**
 * DTO for batch generating insights for multiple meals
 */
export class BatchGenerateInsightDto {
    @IsArray()
    signals: Array<{
        id: string; // Meal ID to map result back
        signal: any; // InsightSignal
    }>;

    @IsObject()
    userContext: any; // UserContext (shared for all)

    @IsOptional()
    @IsIn(['brief', 'detailed'])
    level?: 'brief' | 'detailed';
}

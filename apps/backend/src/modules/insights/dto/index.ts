import { IsObject, IsOptional, IsIn } from 'class-validator';

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

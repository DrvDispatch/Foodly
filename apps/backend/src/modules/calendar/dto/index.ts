import {
    IsString,
    IsArray,
    IsOptional,
    Matches,
} from 'class-validator';

/**
 * DTO for upserting day context
 */
export class UpsertContextDto {
    @IsString()
    @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'dayKey must be in YYYY-MM-DD format' })
    dayKey: string;

    @IsArray()
    @IsString({ each: true })
    tags: string[];

    @IsOptional()
    @IsString()
    note?: string;
}

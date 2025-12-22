import {
    IsString,
    IsOptional,
    IsDateString,
    IsArray,
    IsNumber,
    Min,
    Max,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * DTO for creating a new meal
 */
export class CreateMealDto {
    @IsOptional()
    @IsString()
    description?: string;

    @IsOptional()
    @IsString()
    photoBase64?: string;

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    additionalPhotos?: string[];

    @IsOptional()
    @IsDateString()
    mealTime?: string;
}

/**
 * DTO for updating a meal
 */
export class UpdateMealDto {
    @IsOptional()
    @IsString()
    description?: string;

    @IsOptional()
    @IsNumber()
    @Min(0)
    @Max(10000)
    @Type(() => Number)
    calories?: number;

    @IsOptional()
    @IsNumber()
    @Min(0)
    @Max(1000)
    @Type(() => Number)
    protein?: number;

    @IsOptional()
    @IsNumber()
    @Min(0)
    @Max(1000)
    @Type(() => Number)
    carbs?: number;

    @IsOptional()
    @IsNumber()
    @Min(0)
    @Max(500)
    @Type(() => Number)
    fat?: number;
}

import {
    IsString,
    IsNumber,
    IsBoolean,
    IsOptional,
    IsIn,
    Min,
    Max,
    IsArray,
    IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * DTO for creating or updating a user profile
 * All fields are optional for partial updates
 */
export class UpdateProfileDto {
    @IsOptional()
    @IsIn(['male', 'female'])
    sex?: string;

    @IsOptional()
    @IsNumber()
    @Min(13)
    @Max(120)
    @Type(() => Number)
    age?: number;

    @IsOptional()
    @IsDateString()
    birthDate?: string;

    @IsOptional()
    @IsNumber()
    @Min(100)
    @Max(250)
    @Type(() => Number)
    heightCm?: number;

    @IsOptional()
    @IsNumber()
    @Min(30)
    @Max(300)
    @Type(() => Number)
    currentWeight?: number;

    @IsOptional()
    @IsNumber()
    @Min(30)
    @Max(300)
    @Type(() => Number)
    targetWeight?: number;

    @IsOptional()
    @IsNumber()
    @Min(0.1)
    @Max(2)
    @Type(() => Number)
    weeklyPace?: number;

    @IsOptional()
    @IsIn(['sedentary', 'light', 'moderate', 'active', 'athlete'])
    activityLevel?: string;

    @IsOptional()
    @IsIn(['fat_loss', 'maintenance', 'muscle_gain', 'strength', 'recomp', 'health'])
    goalType?: string;

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    secondaryFocuses?: string[];

    @IsOptional()
    @IsIn(['metric', 'imperial'])
    unitSystem?: string;

    @IsOptional()
    @IsNumber()
    @Min(1000)
    @Max(6000)
    @Type(() => Number)
    maintenanceCal?: number;

    @IsOptional()
    @IsNumber()
    @Min(800)
    @Max(6000)
    @Type(() => Number)
    targetCal?: number;

    @IsOptional()
    @IsNumber()
    @Min(20)
    @Max(400)
    @Type(() => Number)
    proteinTarget?: number;

    @IsOptional()
    @IsNumber()
    @Min(20)
    @Max(600)
    @Type(() => Number)
    carbTarget?: number;

    @IsOptional()
    @IsNumber()
    @Min(20)
    @Max(300)
    @Type(() => Number)
    fatTarget?: number;

    @IsOptional()
    @IsBoolean()
    onboarded?: boolean;

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    dietaryPrefs?: string[];

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    allergies?: string[];

    @IsOptional()
    @IsString()
    timezone?: string;
}

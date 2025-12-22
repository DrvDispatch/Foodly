import {
    IsNumber,
    IsOptional,
    IsDateString,
    IsString,
    Min,
    Max,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * DTO for creating a weight entry
 */
export class CreateWeightDto {
    @IsNumber()
    @Min(20)
    @Max(500)
    @Type(() => Number)
    weight: number;

    @IsOptional()
    @IsDateString()
    date?: string;

    @IsOptional()
    @IsString()
    note?: string;
}

/**
 * DTO for updating a weight entry
 */
export class UpdateWeightDto {
    @IsOptional()
    @IsNumber()
    @Min(20)
    @Max(500)
    @Type(() => Number)
    weight?: number;

    @IsOptional()
    @IsDateString()
    date?: string;

    @IsOptional()
    @IsString()
    note?: string | null;
}

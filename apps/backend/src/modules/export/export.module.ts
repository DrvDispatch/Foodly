import { Module } from '@nestjs/common';
import { ExportService } from './export.service';
import { ExportController } from './export.controller';

/**
 * Export Module
 * 
 * Handles data export functionality:
 * - Export all user data as JSON
 */
@Module({
    providers: [ExportService],
    controllers: [ExportController],
    exports: [ExportService],
})
export class ExportModule { }

import { Controller, Get, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { ExportService } from './export.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, UserPayload } from '../../common/decorators';

/**
 * Export Controller
 * 
 * Endpoints:
 * - GET /api/export - Export all user data as downloadable JSON
 */
@Controller('export')
@UseGuards(JwtAuthGuard)
export class ExportController {
    constructor(private readonly exportService: ExportService) { }

    /**
     * GET /api/export
     * Returns all user data as downloadable JSON file
     */
    @Get()
    async exportData(
        @CurrentUser() user: UserPayload,
        @Res() res: Response,
    ) {
        const data = await this.exportService.exportUserData(user.id);

        const filename = `foodly-export-${new Date().toISOString().split('T')[0]}.json`;

        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send(JSON.stringify(data, null, 2));
    }
}

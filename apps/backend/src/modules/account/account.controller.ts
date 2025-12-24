import { Controller, Delete, Post, Body, UseGuards } from '@nestjs/common';
import { AccountService } from './account.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, UserPayload } from '../../common/decorators';
import { DeleteAccountDto, UploadAvatarDto } from './dto';

@Controller('account')
@UseGuards(JwtAuthGuard)
export class AccountController {
    constructor(private readonly accountService: AccountService) { }

    /**
     * POST /api/account/avatar
     * Upload user avatar
     */
    @Post('avatar')
    async uploadAvatar(
        @CurrentUser() user: UserPayload,
        @Body() dto: UploadAvatarDto,
    ) {
        return this.accountService.uploadAvatar(user.id, dto.imageBase64);
    }

    /**
     * POST /api/account/delete
     * Deletes user account and all associated data (POST for frontend compatibility)
     */
    @Post('delete')
    async deleteAccountPost(
        @CurrentUser() user: UserPayload,
        @Body() dto: DeleteAccountDto,
    ) {
        return this.accountService.deleteAccount(user.id, dto.confirmation);
    }

    /**
     * DELETE /api/account/delete
     * Deletes user account and all associated data
     */
    @Delete('delete')
    async deleteAccount(
        @CurrentUser() user: UserPayload,
        @Body() dto: DeleteAccountDto,
    ) {
        return this.accountService.deleteAccount(user.id, dto.confirmation);
    }
}

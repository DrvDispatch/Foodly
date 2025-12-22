import { Controller, Delete, Body, UseGuards } from '@nestjs/common';
import { AccountService } from './account.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, UserPayload } from '../../common/decorators';
import { DeleteAccountDto } from './dto';

@Controller('account')
@UseGuards(JwtAuthGuard)
export class AccountController {
    constructor(private readonly accountService: AccountService) { }

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

import { IsString } from 'class-validator';

export class DeleteAccountDto {
    @IsString()
    confirmation: string;
}

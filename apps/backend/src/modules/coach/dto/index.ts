import { IsString, IsNotEmpty } from 'class-validator';

/**
 * DTO for sending a message to the coach
 */
export class SendMessageDto {
    @IsString()
    @IsNotEmpty()
    question: string;
}

import { IsString, IsNotEmpty, Matches } from 'class-validator';

export class UploadAvatarDto {
    @IsString()
    @IsNotEmpty()
    @Matches(/^data:image\/(jpeg|png|gif|webp);base64,/, {
        message: 'Image must be a valid base64 data URI (jpeg, png, gif, or webp)',
    })
    imageBase64: string;
}

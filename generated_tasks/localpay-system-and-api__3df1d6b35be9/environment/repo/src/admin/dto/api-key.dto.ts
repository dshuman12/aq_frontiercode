import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateApiKeyDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  label?: string;
}

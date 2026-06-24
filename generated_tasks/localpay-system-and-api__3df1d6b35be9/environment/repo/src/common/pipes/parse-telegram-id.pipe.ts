import {
  ArgumentMetadata,
  BadRequestException,
  Injectable,
  PipeTransform,
} from '@nestjs/common';

@Injectable()
export class ParseTelegramIdPipe implements PipeTransform<string, number> {
  transform(value: string, metadata: ArgumentMetadata): number {
    const id = Number(value);
    if (Number.isNaN(id)) {
      throw new BadRequestException(
        `${metadata.data} must be a numeric telegram id`,
      );
    }
    return id;
  }
}

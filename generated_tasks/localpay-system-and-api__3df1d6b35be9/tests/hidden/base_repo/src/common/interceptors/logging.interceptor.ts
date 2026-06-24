import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  Logger,
} from '@nestjs/common';
import { Observable, tap, catchError, throwError } from 'rxjs';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const startTime = Date.now();

    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    const { method, originalUrl, ip } = request;

    return next.handle().pipe(
      tap(() => {
        const duration = Date.now() - startTime;

        this.logger.log(
          `[SUCCESS] ${method} ${originalUrl} ${response.statusCode} - ${duration}ms - IP: ${ip}`,
        );
      }),

      catchError((error) => {
        const duration = Date.now() - startTime;

        this.logger.error(
          `[ERROR] ${method} ${originalUrl} ${error?.status || 500} - ${duration}ms - IP: ${ip}`,
          error.stack,
        );

        return throwError(() => error);
      }),
    );
  }
}

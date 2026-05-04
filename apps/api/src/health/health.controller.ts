import { Controller, Get, HttpStatus } from '@nestjs/common';
import { HealthService } from './health.service';

@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  async check() {
    const result = await this.healthService.checkAll();
    const statusCode = result.status === 'ok' ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE;
    return {
      statusCode,
      ...result
    };
  }

  @Get('database')
  async checkDatabase() {
    const result = await this.healthService.checkDatabase();
    const statusCode = result.status === 'ok' ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE;
    return {
      statusCode,
      ...result
    };
  }

  @Get('redis')
  async checkRedis() {
    const result = await this.healthService.checkRedis();
    const statusCode = result.status === 'ok' ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE;
    return {
      statusCode,
      ...result
    };
  }
}
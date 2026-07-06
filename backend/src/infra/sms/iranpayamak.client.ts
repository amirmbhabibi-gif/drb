import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  AccountBalanceResponse,
  ApiResult,
  PatternSendRequest,
  SimpleSendRequest,
} from './iranpayamak.types';
import { SmsDeliveryException } from './sms.errors';

const REQUEST_TIMEOUT_MS = 15_000;

@Injectable()
export class IranPayamakClient {
  private readonly logger = new Logger(IranPayamakClient.name);
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly lineNumber: string;
  private readonly otpPatternCode: string;
  private readonly otpPatternVar: string;
  private readonly otpPatternExpiryVar: string;
  private readonly numberFormat: string;

  constructor(private readonly configService: ConfigService) {
    this.baseUrl = this.configService.get<string>('iranpayamak.baseUrl') as string;
    this.apiKey = this.configService.get<string>('iranpayamak.apiKey') as string;
    this.lineNumber = this.configService.get<string>('iranpayamak.lineNumber') as string;
    this.otpPatternCode = this.configService.get<string>('iranpayamak.otpPatternCode') as string;
    this.otpPatternVar = this.configService.get<string>('iranpayamak.otpPatternVar') as string;
    this.otpPatternExpiryVar = this.configService.get<string>(
      'iranpayamak.otpPatternExpiryVar',
    ) as string;
    this.numberFormat = this.configService.get<string>('iranpayamak.numberFormat') as string;
  }

  async sendOtp(recipient: string, code: string, expiryMinutes: number): Promise<number> {
    const attributes: Record<string, string> = {
      [this.otpPatternVar]: code,
    };

    if (this.otpPatternExpiryVar) {
      attributes[this.otpPatternExpiryVar] = String(expiryMinutes);
    }

    const body: PatternSendRequest = {
      code: this.otpPatternCode,
      recipient,
      attributes,
      line_number: this.lineNumber,
      number_format: this.numberFormat,
    };

    return this.sendPattern(body);
  }

  async sendPattern(body: PatternSendRequest): Promise<number> {
    const result = await this.post<ApiResult<number>>('/ws/v1/sms/pattern', body);
    return this.unwrapSendResult(result, 'pattern');
  }

  async sendSimple(body: SimpleSendRequest): Promise<number> {
    const result = await this.post<ApiResult<number>>('/ws/v1/sms/simple', body);
    return this.unwrapSendResult(result, 'simple');
  }

  async getBalance(): Promise<AccountBalanceResponse['data']> {
    const result = await this.get<AccountBalanceResponse>('/ws/v1/account/balance');
    if (result.status !== 'success') {
      this.logger.warn('FarazSMS balance check failed', { messages: result.message });
      throw new SmsDeliveryException();
    }
    return result.data;
  }

  private unwrapSendResult(
    result: ApiResult<number | { id: number }>,
    type: string,
  ): number {
    if (result.status !== 'success') {
      this.logger.error(`FarazSMS ${type} send failed`, {
        status: result.status,
        messages: result.messages,
      });
      throw new SmsDeliveryException();
    }

    const requestId =
      typeof result.data === 'number'
        ? result.data
        : typeof result.data === 'object' && result.data !== null && 'id' in result.data
          ? result.data.id
          : null;

    if (requestId === null) {
      this.logger.error(`FarazSMS ${type} send failed: unexpected data shape`, {
        data: result.data,
      });
      throw new SmsDeliveryException();
    }

    this.logger.log(`FarazSMS ${type} send enqueued: requestId=${requestId}`);
    return requestId;
  }

  private async post<T>(path: string, body: unknown): Promise<T> {
    return this.request<T>('POST', path, body);
  }

  private async get<T>(path: string): Promise<T> {
    return this.request<T>('GET', path);
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(`${this.baseUrl}${path}`, {
        method,
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          'Api-Key': this.apiKey,
        },
        body: body !== undefined ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      if (!response.ok) {
        this.logger.error(`FarazSMS HTTP ${response.status} on ${method} ${path}`);
        throw new SmsDeliveryException();
      }

      return (await response.json()) as T;
    } catch (error) {
      if (error instanceof SmsDeliveryException) {
        throw error;
      }
      this.logger.error(`FarazSMS request failed: ${method} ${path}`, error);
      throw new SmsDeliveryException();
    } finally {
      clearTimeout(timeout);
    }
  }
}

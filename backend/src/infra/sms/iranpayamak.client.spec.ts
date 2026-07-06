import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { SmsDeliveryException } from './sms.errors';
import { IranPayamakClient } from './iranpayamak.client';

describe('IranPayamakClient', () => {
  let client: IranPayamakClient;
  const fetchMock = jest.fn();

  beforeEach(async () => {
    global.fetch = fetchMock as unknown as typeof fetch;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IranPayamakClient,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const map: Record<string, string> = {
                'iranpayamak.baseUrl': 'https://api.iranpayamak.com',
                'iranpayamak.apiKey': 'test-key',
                'iranpayamak.lineNumber': '5000000000000',
                'iranpayamak.otpPatternCode': 'PATTERN1',
                'iranpayamak.otpPatternVar': 'code',
                'iranpayamak.otpPatternExpiryVar': 'expiry',
                'iranpayamak.numberFormat': 'english',
              };
              return map[key];
            }),
          },
        },
      ],
    }).compile();

    client = module.get(IranPayamakClient);
    fetchMock.mockReset();
  });

  it('sendOtp posts pattern SMS and returns request id', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ status: 'success', data: 407328, messages: null }),
    });

    const requestId = await client.sendOtp('09121234567', '123456', 2);

    expect(requestId).toBe(407328);
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.iranpayamak.com/ws/v1/sms/pattern',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ 'Api-Key': 'test-key' }),
      }),
    );

    const body = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string);
    expect(body).toMatchObject({
      code: 'PATTERN1',
      recipient: '09121234567',
      attributes: { code: '123456', expiry: '2' },
      line_number: '5000000000000',
      number_format: 'english',
    });
  });

  it('throws SmsDeliveryException when provider returns error status', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ status: 'error', data: null, messages: 'failed' }),
    });

    await expect(client.sendOtp('09121234567', '123456', 2)).rejects.toBeInstanceOf(
      SmsDeliveryException,
    );
  });
});

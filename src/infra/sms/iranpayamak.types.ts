export type ApiStatus = 'success' | 'error';

export interface ApiResult<T> {
  status: ApiStatus;
  data: T;
  messages: string | string[] | Record<string, unknown> | null;
}

export interface PatternSendRequest {
  code: string;
  recipient: string;
  attributes: Record<string, string>;
  line_number: string;
  number_format: string;
  schedule?: string | null;
}

export interface SimpleSendRequest {
  text: string;
  line_number: string;
  recipients: string[];
  number_format: string;
  schedule: string | null;
}

export interface AccountBalanceData {
  balanceAmount: number;
  balanceCount: number;
  details: Array<{
    count: number;
    rate: number;
    amount: number;
  }>;
}

export interface AccountBalanceResponse {
  status: ApiStatus;
  message: string | null;
  data: AccountBalanceData;
}

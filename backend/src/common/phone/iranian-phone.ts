import { HttpStatus } from '@nestjs/common';
import { AppException } from '../exceptions/app.exception';

const IRANIAN_MOBILE_REGEX = /^09\d{9}$/;

/**
 * Converts Persian (۰-۹) and Arabic-Indic (٠-٩) digits to Western (0-9).
 */
export function toWesternDigits(input: string): string {
  return input.replace(/[\u06F0-\u06F9\u0660-\u0669]/g, (char) => {
    const code = char.charCodeAt(0);
    if (code >= 0x06f0 && code <= 0x06f9) {
      return String(code - 0x06f0);
    }
    return String(code - 0x0660);
  });
}

/**
 * Normalizes Iranian mobile numbers to 09xxxxxxxxx format.
 * Accepts: 09..., +989..., 989..., 9... (10 digits starting with 9),
 * and Persian/Arabic-Indic digit variants.
 */
export function normalizeIranianPhone(input: string): string | null {
  const digits = toWesternDigits(input).replace(/\D/g, '');

  if (digits.length === 11 && digits.startsWith('09')) {
    return digits;
  }

  if (digits.length === 12 && digits.startsWith('989')) {
    return `0${digits.slice(2)}`;
  }

  if (digits.length === 10 && digits.startsWith('9')) {
    return `0${digits}`;
  }

  return null;
}

export function isValidIranianMobile(phone: string): boolean {
  return IRANIAN_MOBILE_REGEX.test(phone);
}

export function assertIranianMobile(input: string): string {
  const normalized = normalizeIranianPhone(input);
  if (!normalized || !isValidIranianMobile(normalized)) {
    throw new AppException(
      'INVALID_PHONE',
      HttpStatus.BAD_REQUEST,
      'Phone must be a valid Iranian mobile number (09xxxxxxxxx)',
    );
  }
  return normalized;
}

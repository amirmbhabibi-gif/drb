import {
  assertIranianMobile,
  isValidIranianMobile,
  normalizeIranianPhone,
  toWesternDigits,
} from './iranian-phone';

describe('iranian-phone', () => {
  describe('toWesternDigits', () => {
    it('converts Persian digits to Western digits', () => {
      expect(toWesternDigits('۰۹۲۳۳۲۸۳۸۹۳')).toBe('09233283893');
    });

    it('converts Arabic-Indic digits to Western digits', () => {
      expect(toWesternDigits('٠٩٢٣٣٢٨٣٨٩٣')).toBe('09233283893');
    });

    it('leaves Western digits unchanged', () => {
      expect(toWesternDigits('09233283893')).toBe('09233283893');
    });
  });

  describe('normalizeIranianPhone', () => {
    it('normalizes Persian digit phone numbers', () => {
      expect(normalizeIranianPhone('۰۹۲۳۳۲۸۳۸۹۳')).toBe('09233283893');
    });

    it('normalizes English digit phone numbers', () => {
      expect(normalizeIranianPhone('09233283893')).toBe('09233283893');
    });

    it('normalizes +98 format with Persian digits', () => {
      expect(normalizeIranianPhone('+۹۸۹۲۳۳۲۸۳۸۹۳')).toBe('09233283893');
    });
  });

  describe('assertIranianMobile', () => {
    it('accepts Persian digit input', () => {
      expect(assertIranianMobile('۰۹۲۳۳۲۸۳۸۹۳')).toBe('09233283893');
    });

    it('rejects invalid numbers after digit normalization', () => {
      expect(() => assertIranianMobile('۰۹۱۲۳۴')).toThrow();
    });
  });

  describe('isValidIranianMobile', () => {
    it('validates normalized numbers', () => {
      expect(isValidIranianMobile('09233283893')).toBe(true);
    });
  });
});

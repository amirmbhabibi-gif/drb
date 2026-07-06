import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { isValidIranianMobile, normalizeIranianPhone } from './iranian-phone';

@ValidatorConstraint({ name: 'isIranianMobile', async: false })
export class IsIranianMobileConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    if (typeof value !== 'string') {
      return false;
    }
    const normalized = normalizeIranianPhone(value);
    return normalized !== null && isValidIranianMobile(normalized);
  }

  defaultMessage(args: ValidationArguments): string {
    return `${args.property} must be a valid Iranian mobile number (09xxxxxxxxx)`;
  }
}

export function IsIranianMobile(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string): void {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsIranianMobileConstraint,
    });
  };
}

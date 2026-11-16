import { IsEmail, IsString, MaxLength, MinLength, ValidatorConstraint, ValidatorConstraintInterface, ValidationArguments, Validate } from 'class-validator';

@ValidatorConstraint({ name: 'bcryptPasswordBytes', async: false })
class BcryptPasswordBytesConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    return typeof value === 'string' && Buffer.byteLength(value, 'utf8') >= 10 && Buffer.byteLength(value, 'utf8') <= 72;
  }

  defaultMessage(_args: ValidationArguments): string {
    return 'Password must be between 10 and 72 UTF-8 bytes';
  }
}

@ValidatorConstraint({ name: 'bcryptPasswordMaximumBytes', async: false })
class BcryptPasswordMaximumBytesConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    return typeof value === 'string' && Buffer.byteLength(value, 'utf8') <= 72;
  }

  defaultMessage(_args: ValidationArguments): string {
    return 'Password must not exceed 72 UTF-8 bytes';
  }
}

export class RegisterDto {
  @IsString() @MinLength(2) @MaxLength(80) name!: string;
  @IsEmail() @MaxLength(254) email!: string;
  @IsString() @MinLength(10) @MaxLength(72) @Validate(BcryptPasswordBytesConstraint) password!: string;
}

export class LoginDto {
  @IsEmail() email!: string;
  @IsString() @MinLength(1) @Validate(BcryptPasswordMaximumBytesConstraint) password!: string;
}

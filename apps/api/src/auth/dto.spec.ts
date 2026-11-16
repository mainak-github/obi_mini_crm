import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { LoginDto, RegisterDto } from './dto';

describe('authentication DTO validation', () => {
  it('rejects registration passwords that exceed bcrypt’s UTF-8 byte limit', async () => {
    const dto = plainToInstance(RegisterDto, { name: 'Valid Name', email: 'valid@example.test', password: 'é'.repeat(40) });
    const errors = await validate(dto);
    expect(errors.some((error) => error.property === 'password')).toBe(true);
  });

  it('rejects login passwords exceeding bcrypt’s UTF-8 byte limit', async () => {
    const dto = plainToInstance(LoginDto, { email: 'valid@example.test', password: 'é'.repeat(40) });
    const errors = await validate(dto);
    expect(errors.some((error) => error.property === 'password')).toBe(true);
  });
});
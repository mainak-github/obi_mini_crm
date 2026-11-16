import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto, RegisterDto } from './dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Register a sales representative account' })
  async register(@Body() dto: RegisterDto) {
    return await this.auth.register(dto);
  }

  @Post('login')
  @ApiOperation({ summary: 'Sign in and receive an access token' })
  async login(@Body() dto: LoginDto) {
    return await this.auth.login(dto);
  }
}

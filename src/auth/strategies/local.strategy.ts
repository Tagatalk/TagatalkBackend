import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-local';
import { AuthService } from '../auth.service';
import { HttpException, Injectable, UnauthorizedException } from '@nestjs/common';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private authService: AuthService) {
    super({ usernameField: 'email' });
  }

  async validate(email: string, password: string) {
    console.log('Inside LocalStrategy');
    const user = await this.authService.validateUser(email, password);
    console.log(user)
    if (!user) throw new HttpException('wrong ka pre', 401);
    return user;
  }
}
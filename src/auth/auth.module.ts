import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtModule } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service'; 
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from './strategies/jwt.strategy';
import { LocalStrategy } from './strategies/local.strategy';
import { MailerService } from '../mailer/mailer.service';
import { UserService } from 'src/user/user.service';
import { GameService } from 'src/game/game.service';
import { adminStrategy } from './strategies/admin.strategy';
import { AdminJwtStrategy } from './strategies/adminJwt.stategy';
import { EventEmitterModule } from '@nestjs/event-emitter';
@Module({
  imports:[
    EventEmitterModule.forRoot(),
    PassportModule,
    JwtModule.register({
      secret: process.env.SECRET_KEY,
    })
  ],
  providers: [AuthService,PrismaService,JwtStrategy,LocalStrategy,MailerService,adminStrategy,AdminJwtStrategy],
  controllers: [AuthController],
  exports: [AuthService]
})
export class AuthModule {}

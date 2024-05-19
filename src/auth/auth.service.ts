import { BadRequestException, Injectable, InternalServerErrorException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service'; 
import { Auth } from '@prisma/client';
import { RegisterDto } from './DTO/register.dto';
import * as bcrypt from 'bcrypt';
import { error } from 'console';
import { JwtService } from '@nestjs/jwt';
import { loginDto } from './DTO/login.dto';
import { Role } from './enums/role.enum';
import e, { Request } from 'express';
import * as crypto from 'crypto';
import { MailerService } from '../mailer/mailer.service';
@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService,private jwtService:JwtService , private mailerService:MailerService) {}
  //* Find the user through the email (Queries the database for the user with the email provided)
  async findByEmail(email: string): Promise<Auth | null> {
      return this.prisma.auth.findUnique({
          where:{
              email:email
          }
      });
  }
  //* find the admin through the email (Queries the database for the admin with the email provided)
  async findAdminByEmail(email:string):Promise<Auth|null>{
    return this.prisma.auth.findUnique({
      where:{
        email:email,
        role:Role.ADMIN 
      }

    })
  }  
  
  async findUserByPassword(password:string):Promise<Auth|null>{
    const encryptedPassword = await this.encryptPassword(password)
    return this.prisma.auth.findFirst({
      where:{
        encrypted_password:encryptedPassword
      }
    })
  }
  async getAllBannedUsers():Promise<Auth[]|null>{
    try{
      return this.prisma.auth.findMany({
        where:{
          banned_until:{
            not:null
          }
        }
      });
    }catch(Error){
      throw Error('Failed to get all banned users');
    }
  }
  async getUserByID(userId:string):Promise<Auth|null>{
    try{
      return this.prisma.auth.findUnique({
        where:{
          authId:userId
        }
      })
    }catch(Error){
      throw Error('Failed to get user by ID')
    }
  }



  async encryptPassword(password:string):Promise<string|null>{
    const saltedPassword = password+process.env.SALT
    return await bcrypt.hash(saltedPassword,10)
  }

  async verifyEmail(token:string){
    try{
      const user = await  this.prisma.auth.findUnique({
        where:{
          confirmation_token:token
        }
      });
      if(!user){
        throw new BadRequestException('Invalid token')
      }
      if(user.confirmed_at){
        throw new BadRequestException('User already verified')
      }
      await this.prisma.auth.update({
        where:{
          confirmation_token:token
        },
        data: {
          email_confirmed_at: new Date(),
          confirmation_token: null,
        },
      })
    }catch(error){
      console.log(error)
      throw new InternalServerErrorException('Failed to verify email')
    
    }
  }
    
  async RegisterUser(registerDto: RegisterDto): Promise<Auth> {
    const { email, password } = registerDto;
    if (!email || !password) {
        throw new BadRequestException('Email and password are required');
    }
    
    const saltedPassword = password + process.env.SALT //* Add the  salt to the password
    const hashedPassword = await bcrypt.hash(saltedPassword, 10); //* Hash the password with the salt
    const emailToken = crypto.randomBytes(20).toString('hex');
    console.log(emailToken)
    try {
        const newUser = await this.prisma.auth.create({
            data: {
                email,
                encrypted_password: hashedPassword,
                confirmation_token:emailToken,
                confirmation_sent_at: new Date(),
            },
        });
        console.log(newUser.confirmation_token)
        const username = email.split('@')[0];
        await this.prisma.user.update({
          where:{
            userId:newUser.authId
          },data:{
            name : username
          }
        })
        await this.mailerService.sendVerificationEmail(email, emailToken);
        return newUser;
        
    } catch (error) {
        console.log(error);
        throw new BadRequestException('Failed to register user');
    }
}
//* Validate user credentials with promise of a sttring(token)
async validateUser( email:string, password:string): Promise<String | null> {
    

    //* Find the user through emal  
    const user = await this.findByEmail(email);
    //* if user is nto found throw an Error 
    if (!user) {
      throw new BadRequestException('user not found');
    }
    if(user.email_confirmed_at===null){
      throw new UnauthorizedException('Email not verified')
    }
    try {
      const saltedPassword = password+process.env.SALT; //* Add the salt to the password
      const match = await bcrypt.compare(saltedPassword, user.encrypted_password); //* Compare the password with the encrypted password
      if (match) {
        return this.jwtService.sign({ email: user.email ,role:user.role,authId: user.authId}); //* Signs the token with the email and role of the user
      } else {
        throw new UnauthorizedException('Invalid password/email');
      }
    } catch (error) {
      console.log(error);
      throw new InternalServerErrorException('Failed to validate user');
    }
  }

  //* Validate admin credentials with promise of a string(token)
  async validateAdmin(email:string , password:string): Promise<String|null>{
    //*Find the admin through email
    const user =  await this.findAdminByEmail(email);
    if(!user){
      throw new BadRequestException('user not found')
    } 
    
    try{
      const saltedPassword= password+process.env.SALT; //*Add the salt to the password
      const match= await bcrypt.compare(saltedPassword, user.encrypted_password); //* Compare the password wit the encrypted password
      if(match){
        
        //* Signs the token with the email and role of the user
        return this.jwtService.sign({email:user.email, role:user.role})

      }else{
        
        throw new UnauthorizedException('Invalid password/email');
        
      }
    }catch(erorr){
      console.log(error)
      throw new InternalServerErrorException('failed to validate admin')
    }
  }
  async changePassword(request:Request, newPassword:string):Promise<Auth|null>{
    try{
      const decoded = this.jwtService.verify(request.headers['authorization'].split(' ')[1]);
      const userEmail = decoded.email;
      const user = await this.findByEmail(userEmail);
      
      if(!user){
        throw new BadRequestException('User not found');
      }
      
      console.log(newPassword)
      const saltedPassword = (newPassword as string) + process.env.SALT;
      const newEncryptedPassword = await bcrypt.hash(saltedPassword, 10);
  
      const updatedUser = await this.prisma.auth.update({
        where:{
          authId: user.authId
        },
        data:{
          encrypted_password: newEncryptedPassword
        }
      });
  
      return updatedUser;
    } catch (err) {
      console.error(err);
      return null;
    }
  }

  async refreshToken(request:Request):Promise<string|null>{
    try{
      const decoded = this.jwtService.verify(request.headers['authorization'].split(' ')[1]);
      return this.jwtService.sign({email:decoded.email,role:decoded.role,authId:decoded.authId})
    }catch(error){
      console.log(error)
      throw new UnauthorizedException('Invalid token')
    } 
  }
   

}


import { Module } from '@nestjs/common';
import { S3Service } from './s3.service';

@Module({})
export class S3Module {

    exports: [S3Service]


}

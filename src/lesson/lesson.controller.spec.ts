import { Test, TestingModule } from '@nestjs/testing';
import { LessonController } from './lesson.controller';
import { LessonService } from './lesson.service';
import { PrismaService } from '../prisma/prisma.service';
import { SkillService } from '../skill/skill.service';
import { forwardRef } from '@nestjs/common';
import { UnitModule } from '../unit/unit.module';
import { EventEmitter } from 'events'; // Import EventEmitter if using Node.js EventEmitter
describe('LessonController', () => {
  let controller: LessonController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LessonController],providers: [
        LessonService,
        PrismaService,
        SkillService,
        { provide: EventEmitter, useValue: new EventEmitter() }
      ],
      imports: [
        forwardRef(() => UnitModule), // Ensure UnitModule is imported
      ],
    }).compile();

    controller = module.get<LessonController>(LessonController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});

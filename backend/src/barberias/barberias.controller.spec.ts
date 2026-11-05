import { Test, TestingModule } from '@nestjs/testing';
import { BarberiasController } from './barberias.controller.js';

describe('BarberiasController', () => {
  let controller: BarberiasController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BarberiasController],
    }).compile();

    controller = module.get<BarberiasController>(BarberiasController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});

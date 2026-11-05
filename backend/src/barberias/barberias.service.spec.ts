import { Test, TestingModule } from '@nestjs/testing';
import { BarberiasService } from './barberias.service.js';

describe('BarberiasService', () => {
  let service: BarberiasService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [BarberiasService],
    }).compile();

    service = module.get<BarberiasService>(BarberiasService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

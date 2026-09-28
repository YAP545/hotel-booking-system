import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HotelSettings } from './hotel-settings.entity';
import { UpdateSettingsDto } from './dto/update-settings.dto';

@Injectable()
export class SettingsService {
  constructor(@InjectRepository(HotelSettings) private repo: Repository<HotelSettings>) {}

  async get(): Promise<HotelSettings> {
    let settings = await this.repo.findOne({ where: { id: 1 } });
    if (!settings) {
      settings = this.repo.create({ id: 1 });
      settings = await this.repo.save(settings);
    }
    return settings;
  }

  async update(dto: UpdateSettingsDto) {
    const settings = await this.get();
    Object.assign(settings, dto);
    return this.repo.save(settings);
  }
}

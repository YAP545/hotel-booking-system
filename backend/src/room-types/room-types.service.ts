import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RoomType } from './room-type.entity';
import { Room } from '../rooms/room.entity';
import { CreateRoomTypeDto, UpdateRoomTypeDto } from './dto/room-type.dto';

@Injectable()
export class RoomTypesService {
  constructor(
    @InjectRepository(RoomType) private repo: Repository<RoomType>,
    @InjectRepository(Room) private roomsRepo: Repository<Room>,
  ) {}

  async findAll(includeInactive = false) {
    return this.repo.find({
      where: includeInactive ? {} : { isActive: true },
      order: { name: 'ASC' },
    });
  }

  async findOne(id: string) {
    const roomType = await this.repo.findOne({ where: { id } });
    if (!roomType) throw new NotFoundException('Room type not found.');
    return roomType;
  }

  async create(dto: CreateRoomTypeDto) {
    const existing = await this.repo.findOne({ where: { name: dto.name } });
    if (existing) throw new ConflictException('A room type with this name already exists.');
    const roomType = this.repo.create(dto);
    return this.repo.save(roomType);
  }

  async update(id: string, dto: UpdateRoomTypeDto) {
    const roomType = await this.findOne(id);
    Object.assign(roomType, dto);
    return this.repo.save(roomType);
  }

  async remove(id: string) {
    const roomType = await this.findOne(id);
    const roomCount = await this.roomsRepo.count({ where: { roomTypeId: id } });
    if (roomCount > 0) {
      // Soft-deactivate instead of hard delete: rooms/reservations reference it historically.
      roomType.isActive = false;
      await this.repo.save(roomType);
      return { message: 'Room type has existing rooms and was deactivated instead of deleted.' };
    }
    await this.repo.remove(roomType);
    return { message: 'Room type deleted.' };
  }
}

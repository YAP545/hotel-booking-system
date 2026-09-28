import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RoomTypesService } from './room-types.service';
import { RoomTypesController } from './room-types.controller';
import { RoomType } from './room-type.entity';
import { Room } from '../rooms/room.entity';

@Module({
  imports: [TypeOrmModule.forFeature([RoomType, Room])],
  controllers: [RoomTypesController],
  providers: [RoomTypesService],
  exports: [RoomTypesService],
})
export class RoomTypesModule {}

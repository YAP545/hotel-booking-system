import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from './user.entity';
import { CreateUserDto, UpdateUserDto } from './dto/user.dto';

@Injectable()
export class UsersService {
  constructor(@InjectRepository(User) private repo: Repository<User>) {}

  async findAll() {
    const users = await this.repo.find({ order: { createdAt: 'DESC' } });
    return users.map((u) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { passwordHash, ...safe } = u;
      return safe;
    });
  }

  async create(dto: CreateUserDto) {
    const existing = await this.repo.findOne({ where: { email: dto.email } });
    if (existing) throw new ConflictException('An account with this email already exists.');
    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = this.repo.create({
      name: dto.name,
      email: dto.email,
      passwordHash,
      role: dto.role,
      phone: dto.phone,
    });
    const saved = await this.repo.save(user);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash: _omit, ...safe } = saved;
    return safe;
  }

  async update(id: string, dto: UpdateUserDto) {
    const user = await this.repo.findOne({ where: { id } });
    if (!user) throw new NotFoundException('User not found.');
    Object.assign(user, dto);
    const saved = await this.repo.save(user);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash: _omit, ...safe } = saved;
    return safe;
  }
}

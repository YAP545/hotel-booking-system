import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager } from 'typeorm';
import { AuditLog } from '../entities/audit-log.entity';

@Injectable()
export class AuditLogService {
  constructor(
    @InjectRepository(AuditLog) private repo: Repository<AuditLog>,
  ) {}

  /**
   * Records an audit entry. Pass `manager` when called inside a transaction
   * so the log write commits/rolls back atomically with the business change.
   */
  async log(
    params: {
      userId?: string;
      userName?: string;
      action: string;
      entity: string;
      entityId: string;
      description: string;
    },
    manager?: EntityManager,
  ) {
    const repo = manager ? manager.getRepository(AuditLog) : this.repo;
    const entry = repo.create(params);
    await repo.save(entry);
  }

  async findAll(filters: {
    action?: string;
    userName?: string;
    entity?: string;
    fromDate?: string;
    toDate?: string;
    page?: number;
    limit?: number;
  } = {}) {
    const page = filters.page && filters.page > 0 ? filters.page : 1;
    const limit = filters.limit && filters.limit > 0 ? Math.min(filters.limit, 100) : 50;

    const qb = this.repo
      .createQueryBuilder('log')
      .orderBy('log.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (filters.action) qb.andWhere('log.action = :action', { action: filters.action });
    if (filters.entity) qb.andWhere('log.entity = :entity', { entity: filters.entity });
    if (filters.userName) qb.andWhere('log.userName LIKE :userName', { userName: `%${filters.userName}%` });
    if (filters.fromDate) qb.andWhere('DATE(log.createdAt) >= :fromDate', { fromDate: filters.fromDate });
    if (filters.toDate) qb.andWhere('DATE(log.createdAt) <= :toDate', { toDate: filters.toDate });

    const [data, total] = await qb.getManyAndCount();
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }
}

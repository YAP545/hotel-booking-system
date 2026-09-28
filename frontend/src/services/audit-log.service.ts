import { api } from './api';
import { AuditLog, Paginated } from '../types';

export const auditLogService = {
  async list(filters: {
    action?: string;
    userName?: string;
    entity?: string;
    fromDate?: string;
    toDate?: string;
    page?: number;
    limit?: number;
  }): Promise<Paginated<AuditLog>> {
    const { data } = await api.get<Paginated<AuditLog>>('/audit-log', { params: filters });
    return data;
  },
};

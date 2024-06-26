import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
/**
 * This is generic repository I created to encapsulate the data-access layer functionalities..
 */
@Injectable()
export class GenericRepository {
  constructor(@InjectEntityManager() private readonly entityManager: EntityManager) {}

  async query<T>(sql: string, parameters?: any[]): Promise<T[]> {
    return this.entityManager.query(sql, parameters);
  }
}
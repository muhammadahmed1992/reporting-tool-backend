import { Injectable, Inject, Scope, OnModuleDestroy } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { DataSource, DataSourceOptions } from 'typeorm';
import { Request } from 'express';
import { v4 as uuidv4 } from 'uuid';

/**
 * This is a generic repository I created to encapsulate the data-access layer functionalities.
 */
@Injectable({ scope: Scope.REQUEST })
export class GenericRepository implements OnModuleDestroy {
  private dataSource: DataSource;
  private connectionName: string;

  constructor(@Inject(REQUEST) private readonly request: Request) {
    this.connectionName = uuidv4(); // Generate a unique name for each connection
  }

  async createDataSource(): Promise<DataSource> {
    const connectionString = this.request['connection-string'];
    console.log(`Connection string inside the repository: ${connectionString}`);

    const dataSourceOptions: DataSourceOptions = {
      type: 'mysql',
      url: connectionString,
      entities: [],
      synchronize: false,
      name: this.connectionName, // Use the unique connection name
    };

    this.dataSource = new DataSource(dataSourceOptions);
    await this.dataSource.initialize();
    return this.dataSource;
  }

  getDataSource(): DataSource {
    if (!this.dataSource) {
      throw new Error('DataSource has not been created yet.');
    }
    return this.dataSource;
  }

  async query<T>(sql: string, parameters?: any[]): Promise<T[]> {
    let result: T[] = [];
    let dataSource: DataSource = null;

    try {
      dataSource = await this.createDataSource();
      result = await dataSource.query(sql, parameters);
    } catch (e) {
      console.error('Error executing query:', e.message);
      console.error('Stack trace:', e.stack);
    } finally {
      if (dataSource && dataSource.isInitialized) {
        try {
          await dataSource.destroy();
        } catch (closeError) {
          console.error('Error closing dataSource:', closeError.message);
          console.error('Stack trace:', closeError.stack);
        }
      }
    }

    return result;
  }

  async onModuleDestroy() {
    console.log(`DataSource is closing: ${this.connectionName}`);
    if (this.dataSource && this.dataSource.isInitialized) {
      try {
        await this.dataSource.destroy();
        console.log(`DataSource closed: ${this.connectionName}`);
      } catch (closeError) {
        console.error('Error closing dataSource during module destroy:', closeError.message);
        console.error('Stack trace:', closeError.stack);
      }
    }
  }
}

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
  private static dataSource: DataSource;
  private connectionName: string;

  constructor(@Inject(REQUEST) private readonly request: Request) {
    this.connectionName = uuidv4(); // Generate a unique name for each connection
  }

  // Singleton pattern for DataSource initialization
  private async initializeDataSource(): Promise<void> {
    if (!GenericRepository.dataSource || !GenericRepository.dataSource.isInitialized) {
      const connectionString = this.request['connection-string'];
      console.log(`Initializing new DataSource with connection string: ${connectionString}`);

      const dataSourceOptions: DataSourceOptions = {
        type: 'mysql',
        url: connectionString,
        entities: [], // Define your entities here
        synchronize: false,
        name: this.connectionName, // Unique connection name
      };

      GenericRepository.dataSource = new DataSource(dataSourceOptions);
      await GenericRepository.dataSource.initialize();
      console.log(`DataSource initialized with name: ${this.connectionName}`);
    } else {
      console.log(`closing the datasource`);
      await GenericRepository.dataSource.destroy();
      this.connectionName = uuidv4();

      const connectionString = this.request['connection-string'];
      console.log(`Initializing new DataSource with connection string: ${connectionString}`);

      const dataSourceOptions: DataSourceOptions = {
        type: 'mysql',
        url: connectionString,
        entities: [], // Define your entities here
        synchronize: false,
        name: this.connectionName, // Unique connection name
      };

      GenericRepository.dataSource = new DataSource(dataSourceOptions);
      await GenericRepository.dataSource.initialize();
      console.log(`DataSource initialized with name: ${this.connectionName}`);
    }
  }

  // Access the singleton DataSource
  private async getDataSource(): Promise<DataSource> {
    if (!GenericRepository.dataSource || !GenericRepository.dataSource.isInitialized) {
      await this.initializeDataSource();
    }
    return GenericRepository.dataSource;
  }

  // Query execution logic
  async query<T>(sql: string, parameters?: any[]): Promise<T[]> {
    let result: T[] = [];
    try {
      const dataSource = await this.getDataSource();
      result = await dataSource.query(sql, parameters);
    } catch (e: any) {
      console.error('Error executing query:', e.message);
      console.error('Stack trace:', e.stack);
    }
    return result;
  }

  // On module destroy, destroy the DataSource if initialized
  async onModuleDestroy() {
    console.log(`DataSource is closing: ${this.connectionName}`);
    if (GenericRepository.dataSource && GenericRepository.dataSource.isInitialized) {
      try {
        await GenericRepository.dataSource.destroy();
        console.log(`DataSource closed: ${this.connectionName}`);
      } catch (closeError: any) {
        console.error('Error closing DataSource during module destroy:', closeError.message);
        console.error('Stack trace:', closeError.stack);
      }
    }
  }
}

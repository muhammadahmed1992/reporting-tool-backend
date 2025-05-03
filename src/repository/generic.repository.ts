import { Injectable, Inject, Scope, OnModuleDestroy } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { DataSource, DataSourceOptions } from 'typeorm';
import { Request } from 'express';
import { v4 as uuidv4 } from 'uuid';
import ResponseHelper from 'src/helper/response-helper';

@Injectable({ scope: Scope.REQUEST })
export class GenericRepository implements OnModuleDestroy {
  private static dataSources = new Map<string, DataSource>();
  private connectionName: string;
  private lastConnectionString: string | null = null;

  constructor(@Inject(REQUEST) private readonly request: Request) {
    this.connectionName = uuidv4();
  }

  // Initialize a new DataSource if needed
  private async initializeDataSource(): Promise<DataSource> {
    const connectionString = this.request['connection-string'];
    const existingDataSource = GenericRepository.dataSources.get(this.connectionName);

    // Use existing DataSource if connection string matches and is initialized
    if (existingDataSource && existingDataSource.isInitialized && this.lastConnectionString === connectionString) {
      return existingDataSource;
    }

    // Close the previous DataSource if connection string changed
    if (existingDataSource && existingDataSource.isInitialized) {
      console.log(`Closing existing DataSource: ${this.connectionName}`);
      await existingDataSource.destroy();
      GenericRepository.dataSources.delete(this.connectionName); // Remove from map after destruction
    }

    // Initialize a new DataSource
    console.log(`Initializing new DataSource with connection string: ${connectionString}`);
    this.lastConnectionString = connectionString;

    const dataSourceOptions: DataSourceOptions = {
      type: 'mysql',
      url: connectionString,
      entities: [], // Define your entities here
      synchronize: false,
      name: this.connectionName,
    };
    const dataSource = new DataSource(dataSourceOptions);
    try {
      await dataSource.initialize();
      console.log(`DataSource initialized with name: ${this.connectionName}`);

      GenericRepository.dataSources.set(this.connectionName, dataSource);
      return dataSource;
    } catch (e) {
      console.error('Error while initializing datasource. Contact software engineer.');
      return dataSource;
    }
  }

  // Retrieve the DataSource for the current instance
  private async getDataSource(): Promise<DataSource> {
    return this.initializeDataSource();
  }

  // Query execution with automatic connection cleanup
  async query<T>(sql: string, parameters?: any[]): Promise<T[]> {
    const dataSource = await this.getDataSource();
    try {
      return await dataSource.query(sql, parameters);
    } catch (e: any) {
      console.error('Error executing query:', e.message);
      console.error('Stack trace:', e.stack);
      throw new Error(e);
    } finally {
      console.log(`Destroying DataSource after query execution: ${this.connectionName}`);
      await dataSource.destroy();
      GenericRepository.dataSources.delete(this.connectionName);
      console.log(`DataSource destroyed and removed from map: ${this.connectionName}`);
    }
  }

  // Cleanup on module destroy
  async onModuleDestroy() {
    console.log(`Cleaning up DataSource: ${this.connectionName}`);
    const dataSource = GenericRepository.dataSources.get(this.connectionName);
    if (dataSource && dataSource.isInitialized) {
      try {
        await dataSource.destroy();
        console.log(`DataSource closed: ${this.connectionName}`);
        GenericRepository.dataSources.delete(this.connectionName);
      } catch (closeError: any) {
        console.error('Error closing DataSource:', closeError.message);
        console.error('Stack trace:', closeError.stack);
        throw new Error(closeError);
      }
    }
  }
}

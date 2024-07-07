import { Injectable, Inject, Scope } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { createConnection, Connection, ConnectionOptions, getConnectionManager } from 'typeorm';
import { Request } from 'express';
/**
 * This is generic repository I created to encapsulate the data-access layer functionalities..
 */
@Injectable({ scope: Scope.REQUEST })
export class GenericRepository {
  private connection: Connection;

  constructor(@Inject(REQUEST) private readonly request: Request) {}

  async createConnection(): Promise<Connection> {
    const connectionString = this.request['connectionString'];
    const connectionManager = getConnectionManager();

    if (connectionManager.has('default')) {
      this.connection = connectionManager.get('default');
      if (this.connection.isConnected) {
        await this.connection.close();
      }
    }

    const connectionOptions: ConnectionOptions = {
      type: 'mysql',
      url: connectionString,
      entities: [],
      synchronize: false,
      name: 'default',
    };

    this.connection = await createConnection(connectionOptions);
    return this.connection;
  }

  getConnection(): Connection {
    if (!this.connection) {
      throw new Error('Connection has not been created yet.');
    }
    return this.connection;
  }

  async query<T>(sql: string, parameters?: any[]): Promise<T[]> {
    const connection = await this.createConnection();
    const result = await connection.query(sql, parameters);
    await connection.close();
    return result;
  }
}





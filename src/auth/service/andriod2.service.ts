import { Injectable } from '@nestjs/common';
import { GenericRepository } from '../../repository/generic.repository'
import * as crypto from 'crypto';

@Injectable()
export class Andriod2Service {
  constructor(private readonly genericRepository: GenericRepository) {}

  async validateUser(username: string, password: string): Promise<boolean> {
    const hashedPassword = crypto.createHash('sha1').update(password).digest('hex');
    const query = 'SELECT 1 FROM `android2` WHERE canddesc = ? AND candpw = ?';
    const result = await this.genericRepository.query(query, [username, hashedPassword]);
    return result.length > 0;
  }
}

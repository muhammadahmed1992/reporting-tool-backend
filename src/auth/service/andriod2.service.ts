import { HttpStatus, Injectable, Scope } from '@nestjs/common';
import { GenericRepository } from '../../repository/generic.repository'
import * as crypto from 'crypto';
import ApiResponse from 'src/helper/api-response';
import ResponseHelper from 'src/helper/response-helper';
import { REQUEST } from '@nestjs/core';
import { Request } from 'express';

@Injectable({ scope: Scope.REQUEST })
export class Andriod2Service {
  constructor(private readonly genericRepository: GenericRepository) {}

  async validateUser(username: string, password: string): Promise<ApiResponse<boolean>> {
    const hashedPassword = crypto.createHash('sha1').update(password).digest('hex');
    const query = 'SELECT 1 FROM `android2` WHERE canddesc = ? AND candpw = ?';
    const result = await this.genericRepository.query(query, [username, hashedPassword]);
    return ResponseHelper.CreateResponse(result.length > 0, result.length > 0 ? HttpStatus.FOUND : HttpStatus.NOT_FOUND);
  }
}

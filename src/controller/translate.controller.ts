import { Controller, Get, HttpStatus, Param, Query } from '@nestjs/common';
import { LocalizationService } from '../services/localization.service';
import ApiResponse from 'src/helper/api-response';
import ResponseHelper from 'src/helper/response-helper';

@Controller('localization')
export class LocalizationController {
  constructor(private localizationService: LocalizationService) {}

  @Get('translate/:lang')
  translate(
    @Param('lang') lang: string,
    @Query('context') context: string,
    @Query('key') key: string,
  ): ApiResponse<string> {
    return ResponseHelper.CreateResponse(this.localizationService.translate(key, context, lang), HttpStatus.OK);
  }

  @Get('translations/:lang')
  getTranslations(
    @Param('lang') lang: string,
    @Query('context') context: string,
  ): ApiResponse<Record<string, string>> {
    return ResponseHelper.CreateResponse(this.localizationService.getTranslations(lang, context), HttpStatus.OK);
  }
}

import { Controller, Get, Param, Query } from '@nestjs/common';
import { LocalizationService } from '../services/localization.service';
import ApiResponse from 'src/helper/api-response';

@Controller('localization')
export class LocalizationController {
  constructor(private localizationService: LocalizationService) {}

  @Get('translate/:lang')
  translate(
    @Param('lang') lang: string,
    @Query('key') key: string,
  ): ApiResponse<string> {
    return this.localizationService.translate(key, lang);
  }

  @Get('translations/:lang')
  getTranslations(
    @Param('lang') lang: string,
    @Query('context') context: string,
  ): ApiResponse<Record<string, string>> {
    return this.localizationService.getTranslations(lang, context);
  }
}

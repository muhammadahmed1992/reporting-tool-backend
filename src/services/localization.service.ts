import { HttpStatus, Injectable } from '@nestjs/common';
import fs, { readFileSync } from 'fs';
import path, {join} from 'path';
import ApiResponse from 'src/helper/api-response';
import ResponseHelper from 'src/helper/response-helper';

@Injectable()
export class LocalizationService {
  private translations: Record<string, any> = {};

    constructor() {
      this.loadTranslations().then(() => {
        console.log(`translations has been loaded`)
    });
  }

  private async loadTranslations() {
    const languages = ['en', 'id'];
    const files = ['menu', 'others', 'backend'];
    
    for (const lang of languages) {
      this.translations[lang] = {};
      for (const file of files) {
        const filePath = path.join(__dirname, `../locales/${lang}/${file}.json`);
        if (fs.existsSync(filePath)) {
          this.translations[lang][file] = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        }
      }
    }
  }

  public translate(lang: string, key: string): ApiResponse<string> {
    return ResponseHelper.CreateResponse(this.translations[lang][key] || this.translations['en'][key] || key, HttpStatus.OK);
  }

  public getTranslations(lang: string, context: string): ApiResponse<Record<string, string>> {
    return ResponseHelper.CreateResponse(this.translations[lang][context] || this.translations[lang] || {}, HttpStatus.OK);
  }
}

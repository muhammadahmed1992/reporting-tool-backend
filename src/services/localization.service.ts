import { HttpStatus, Injectable } from '@nestjs/common';
import fs from 'fs';
import path from 'path';

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
        console.log(`filePaths: ${filePath}`);
        if (fs.existsSync(filePath)) {
          this.translations[lang][file] = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        }
      }
    }
  }

  public translate(lang: string, context: string, key: string): string {
    console.log(this.translations);
    return (this.translations[lang][context][key] || this.translations['en'][context][key] || key);
  }

  public getTranslations(lang: string, context: string): Record<string, string> {
    return (this.translations[lang][context] || this.translations[lang] || {});
  }
}

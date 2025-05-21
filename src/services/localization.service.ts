import { Injectable } from '@nestjs/common';
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
    const files = ['menu', 'backend', 'headers', 'others'];

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

  public async translate(lang: string, context: string, key: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const data = (this.translations[lang][context][key] || this.translations['en'][context][key] || key);
      resolve(data);
    });
  }

  public async getTranslations(lang: string, context: string): Promise<Record<string, string>> {
    return new Promise((resolve, reject) => {
      const data = (this.translations[lang][context] || this.translations[lang] || null);
      if (data) {
        resolve(data);
      } else {
        reject('translation not found for this locale');
      }
    })
  }
}

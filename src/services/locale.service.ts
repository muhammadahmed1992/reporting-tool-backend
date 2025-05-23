import { Inject, Injectable, Scope } from "@nestjs/common";
import { REQUEST } from "@nestjs/core";

@Injectable({ scope: Scope.REQUEST })
export class LocaleService {
    private readonly locale: string;

    constructor(@Inject(REQUEST) private readonly request: Request) {
        const locale = request.headers['accept-language'] || 'id';
        this.locale = locale;
    }

    getLocale(): string {
        return this.locale;
    }
}
import { Inject, Injectable, Scope } from "@nestjs/common";
import { REQUEST } from "@nestjs/core";

@Injectable({ scope: Scope.REQUEST })
export class PrinterConfigService {
    private readonly printerWidth: number;

    constructor(@Inject(REQUEST) private readonly request: Request) {
        const width = request.headers['x-printer-width'];
        this.printerWidth = Number(width) || 32;
    }

    getPrinterWidth(): number {
        return this.printerWidth;
    }
}


// src/pdf/pdf.controller.ts
import { Controller, Post, Res, Body } from '@nestjs/common';
import { Response } from 'express';
import { PdfService } from './pdf.service';

@Controller('pdf')
export class PdfController {
  constructor(private readonly pdfService: PdfService) {}

  @Post('cs-report')
  async generatePdf(@Body() data: any, @Res() res: Response) {
    const pdf = await this.pdfService.generateCSReport(data);
    res.status(200).json({ message: 'PDF generated', pdf });
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename=cs_report_${data.projectKey}.pdf`,
      'Content-Length': pdf.length,
    });
    res.end(pdf);
  }

}

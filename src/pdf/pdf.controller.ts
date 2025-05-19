// Copyright (c) 2025, WSO2 LLC. (http://www.wso2.com). All Rights Reserved.
//
// This software is the property of WSO2 LLC. and its suppliers, if any.
// Dissemination of any information or reproduction of any material contained
// herein in any form is strictly forbidden, unless permitted by WSO2 expressly.
// You may not alter or remove any copyright or other notice from copies of this content.

import { Controller, Post, Res, Body } from '@nestjs/common';
import { Response } from 'express';
import { PdfService } from './pdf.service';
import { csReportData } from './types';

@Controller()
export class PdfController {
  constructor(private readonly pdfService: PdfService) {}

  @Post('cs-report')
  async generatePdf(@Body() data: csReportData, @Res() res: Response) {
    const pdf = await this.pdfService.generateCsReport(data);
    res.status(200).json({ message: 'PDF generated', pdf });
    res.set({
      'Content-Type': 'application/pdf',
    });
    res.end(pdf);
  }
}

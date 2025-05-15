import { NestFactory } from '@nestjs/core';
import { PdfModule } from './pdf/pdf.module';


async function bootstrap() {
  const app = await NestFactory.create(PdfModule);
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();

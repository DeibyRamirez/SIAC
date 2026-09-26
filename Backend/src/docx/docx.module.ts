import { Module } from '@nestjs/common';

import { ServicioManipulacionDocx } from './servicio-manipulacion-docx.service';

@Module({
  providers: [ServicioManipulacionDocx],
  exports: [ServicioManipulacionDocx],
})
export class DocxModule {}

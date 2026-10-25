import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

export interface InsurerReportData {
  workOrder: {
    reference: string;
    status: string;
    entryDate: string;
    estimatedDeliveryDate?: string;
    vehicle: {
      plate: string;
      make: string;
      model: string;
      year?: number;
      color?: string;
    };
    customerName?: string;
    customerPhone?: string;
    customerEmail?: string;
    insurerName?: string;
    claimNumber?: string;
  };
  timeline: Array<{
    status: string;
    notePublic?: string;
    noteInternal?: string;
    createdAt: string;
    technicianName?: string;
  }>;
  photos: Array<{
    category: string;
    uploadedAt: string;
    visibility: string;
    thumbnailUrl?: string;
  }>;
  incidents: Array<{
    type: string;
    internalDescription?: string;
    publicDescription?: string;
    expectedDelay?: number;
    resolved: boolean;
    createdAt: string;
  }>;
  generatedAt: string;
  generatedBy: string;
}

const MARGIN = 50;
const PAGE_WIDTH = 595.28; // A4 width in points
const PAGE_HEIGHT = 841.89; // A4 height in points
const CONTENT_WIDTH = PAGE_WIDTH - 2 * MARGIN;

const COLORS = {
  primary: rgb(0.1, 0.1, 0.1),      // grafito
  secondary: rgb(0.99, 0.96, 0.89), // marfil
  accent: rgb(1, 0.42, 0),          // naranja señalización
  white: rgb(1, 1, 1),
  lightGray: rgb(0.9, 0.9, 0.9),
  mediumGray: rgb(0.6, 0.6, 0.6),
  darkGray: rgb(0.3, 0.3, 0.3),
  red: rgb(0.86, 0.16, 0.16),
  green: rgb(0.09, 0.64, 0.29),
  blue: rgb(0.15, 0.39, 0.92)
};

export async function generateInsurerReportPDF(data: InsurerReportData): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const helveticaOblique = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

  let page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let y = PAGE_HEIGHT - MARGIN;

  // Helper functions
  const addText = (text: string, x: number, yPos: number, font = helvetica, size = 10, color = COLORS.primary, maxWidth?: number) => {
    page.drawText(text, { x, y: yPos, font, size, color, maxWidth });
  };

  const addBoldText = (text: string, x: number, yPos: number, size = 10, color = COLORS.primary, maxWidth?: number) => {
    addText(text, x, yPos, helveticaBold, size, color, maxWidth);
  };

  const addHeading = (text: string, x: number, yPos: number, size = 14) => {
    addBoldText(text, x, yPos, size, COLORS.primary);
    // Underline
    const textWidth = helveticaBold.widthOfTextAtSize(text, size);
    page.drawLine({ start: { x, y: yPos - 2 }, end: { x: x + textWidth, y: yPos - 2 }, thickness: 1, color: COLORS.accent });
    return yPos - 10;
  };

  const checkPageBreak = (neededSpace: number) => {
    if (y - neededSpace < MARGIN) {
      page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      y = PAGE_HEIGHT - MARGIN;
    }
  };

  const drawLine = (yPos: number, color = COLORS.lightGray) => {
    page.drawLine({ start: { x: MARGIN, y: yPos }, end: { x: PAGE_WIDTH - MARGIN, y: yPos }, thickness: 0.5, color });
  };

  // ============ HEADER ============
  // Logo area / Company name
  addBoldText("TALLERES MANOTAS", MARGIN, y, 20, COLORS.primary);
  addText("Chapa y Pintura · Flota Sustitución · Peritación In Situ", MARGIN, y - 22, helvetica, 9, COLORS.mediumGray);
  y -= 40;

  // Report title
  addBoldText("EXPEDIENTE PARA ASEGURADORA", MARGIN, y, 16, COLORS.accent);
  y -= 25;

  // Report metadata
  const metaX = MARGIN;
  let metaY = y;
  addBoldText("Referencia: ", metaX, metaY, 10, COLORS.primary);
  addText(data.workOrder.reference, metaX + 80, metaY, helvetica, 10, COLORS.primary);
  metaY -= 14;
  addBoldText("Estado: ", metaX, metaY, 10, COLORS.primary);
  addText(data.workOrder.status, metaX + 80, metaY, helvetica, 10, COLORS.primary);
  metaY -= 14;
  addBoldText("Fecha entrada: ", metaX, metaY, 10, COLORS.primary);
  addText(data.workOrder.entryDate, metaX + 80, metaY, helvetica, 10, COLORS.primary);
  metaY -= 14;
  if (data.workOrder.estimatedDeliveryDate) {
    addBoldText("Entrega est.: ", metaX, metaY, 10, COLORS.primary);
    addText(data.workOrder.estimatedDeliveryDate, metaX + 80, metaY, helvetica, 10, COLORS.primary);
    metaY -= 14;
  }
  addBoldText("Generado: ", metaX, metaY, 10, COLORS.mediumGray);
  addText(new Date(data.generatedAt).toLocaleString('es-ES'), metaX + 80, metaY, helvetica, 9, COLORS.mediumGray);
  metaY -= 14;
  addBoldText("Generado por: ", metaX, metaY, 10, COLORS.mediumGray);
  addText(data.generatedBy, metaX + 80, metaY, helvetica, 9, COLORS.mediumGray);

  y = metaY - 20;
  drawLine(y);
  y -= 10;

  // ============ VEHICLE INFO ============
  y = heading("DATOS DEL VEHÍCULO", y);
  y -= 5;

  const vehX = MARGIN;
  let vehY = y;
  addBoldText("Matrícula: ", vehX, vehY, 10, COLORS.primary);
  addText(data.workOrder.vehicle.plate, vehX + 60, vehY, helvetica, 10, COLORS.primary);
  vehY -= 14;
  addBoldText("Marca: ", vehX, vehY, 10, COLORS.primary);
  addText(data.workOrder.vehicle.make, vehX + 60, vehY, helvetica, 10, COLORS.primary);
  vehY -= 14;
  addBoldText("Modelo: ", vehX, vehY, 10, COLORS.primary);
  addText(data.workOrder.vehicle.model, vehX + 60, vehY, helvetica, 10, COLORS.primary);
  vehY -= 14;
  if (data.workOrder.vehicle.year) {
    addBoldText("Año: ", vehX, vehY, 10, COLORS.primary);
    addText(data.workOrder.vehicle.year.toString(), vehX + 60, vehY, helvetica, 10, COLORS.primary);
    vehY -= 14;
  }
  if (data.workOrder.vehicle.color) {
    addBoldText("Color: ", vehX, vehY, 10, COLORS.primary);
    addText(data.workOrder.vehicle.color, vehX + 60, vehY, helvetica, 10, COLORS.primary);
    vehY -= 14;
  }

  y = vehY - 10;
  drawLine(y);
  y -= 10;

  // ============ CUSTOMER / INSURER INFO ============
  if (data.workOrder.customerName || data.workOrder.insurerName) {
    y = heading("DATOS DE CONTACTO", y);
    y -= 5;

    const contactX = MARGIN;
    let contactY = y;
    if (data.workOrder.customerName) {
      addBoldText("Cliente: ", contactX, contactY, 10, COLORS.primary);
      addText(data.workOrder.customerName, contactX + 50, contactY, helvetica, 10, COLORS.primary);
      contactY -= 14;
    }
    if (data.workOrder.customerPhone) {
      addBoldText("Teléfono: ", contactX, contactY, 10, COLORS.primary);
      addText(data.workOrder.customerPhone, contactX + 50, contactY, helvetica, 10, COLORS.primary);
      contactY -= 14;
    }
    if (data.workOrder.customerEmail) {
      addBoldText("Email: ", contactX, contactY, 10, COLORS.primary);
      addText(data.workOrder.customerEmail, contactX + 50, contactY, helvetica, 10, COLORS.primary);
      contactY -= 14;
    }
    if (data.workOrder.insurerName) {
      addBoldText("Aseguradora: ", contactX, contactY, 10, COLORS.primary);
      addText(data.workOrder.insurerName, contactX + 50, contactY, helvetica, 10, COLORS.primary);
      contactY -= 14;
    }
    if (data.workOrder.claimNumber) {
      addBoldText("Nº Siniestro: ", contactX, contactY, 10, COLORS.primary);
      addText(data.workOrder.claimNumber, contactX + 50, contactY, helvetica, 10, COLORS.primary);
      contactY -= 14;
    }

    y = contactY - 10;
    drawLine(y);
    y -= 10;
  }

  // ============ TIMELINE ============
  y = heading("HISTORIAL DE ESTADOS (TIMELINE)", y);
  y -= 5;

  if (data.timeline.length === 0) {
    addText("Sin eventos registrados.", MARGIN, y, helveticaOblique, 10, COLORS.mediumGray);
    y -= 20;
  } else {
    for (const event of data.timeline) {
      checkPageBreak(40);
      
      const eventDate = new Date(event.createdAt).toLocaleString('es-ES');
      const statusColor = getStatusColor(event.status);
      
      // Status badge
      const badgeX = MARGIN;
      const badgeY = y - 12;
      page.drawRectangle({ x: badgeX, y: badgeY, width: 120, height: 18, color: statusColor });
      addBoldText(event.status, badgeX + 5, badgeY + 4, 8, COLORS.white);
      
      // Date
      addText(eventDate, MARGIN + 130, y - 6, helvetica, 9, COLORS.mediumGray);
      
      // Technician
      if (event.technicianName) {
        addText(`Téc: ${event.technicianName}`, MARGIN + 300, y - 6, helvetica, 9, COLORS.mediumGray);
      }
      
      // Public note
      if (event.notePublic) {
        y -= 20;
        addText(`Público: ${event.notePublic}`, MARGIN + 10, y, helvetica, 9, COLORS.primary);
      }
      
      // Internal note (in gray/oblique)
      if (event.noteInternal) {
        y -= 14;
        addText(`Interno: ${event.noteInternal}`, MARGIN + 10, y, helveticaOblique, 8, COLORS.mediumGray);
      }
      
      y -= 25;
      drawLine(y, COLORS.lightGray);
      y -= 5;
    }
  }

  y -= 10;
  drawLine(y);
  y -= 10;

  // ============ PHOTOS ============
  if (data.photos.length > 0) {
    y = heading("FOTOGRAFÍAS Y DOCUMENTOS", y);
    y -= 5;

    for (const photo of data.photos) {
      checkPageBreak(35);
      
      addBoldText(`Categoría: ${photo.category}`, MARGIN, y, 10, COLORS.primary);
      y -= 16;
      addText(`Subida: ${new Date(photo.uploadedAt).toLocaleString('es-ES')}`, MARGIN + 10, y, helvetica, 9, COLORS.mediumGray);
      y -= 14;
      addText(`Visibilidad: ${photo.visibility}`, MARGIN + 10, y, helvetica, 9, COLORS.mediumGray);
      y -= 14;
      
      // Thumbnail placeholder
      if (photo.thumbnailUrl) {
        addText(`[Miniatura disponible]`, MARGIN + 10, y, helveticaOblique, 9, COLORS.mediumGray);
        y -= 14;
      }
      
      y -= 5;
      drawLine(y, COLORS.lightGray);
      y -= 5;
    }
  }

  // ============ INCIDENTS ============
  if (data.incidents.length > 0) {
    y = heading("INCIDENCIAS", y);
    y -= 5;

    for (const incident of data.incidents) {
      checkPageBreak(50);
      
      const statusText = incident.resolved ? "RESUELTA" : "PENDIENTE";
      const statusColor = incident.resolved ? COLORS.green : COLORS.red;
      
      addBoldText(`Tipo: ${incident.type}`, MARGIN, y, 10, COLORS.primary);
      y -= 16;
      
      const statusBadgeX = MARGIN;
      const statusBadgeY = y - 12;
      page.drawRectangle({ x: statusBadgeX, y: statusBadgeY, width: 70, height: 18, color: statusColor });
      addBoldText(statusText, statusBadgeX + 5, statusBadgeY + 4, 8, COLORS.white);
      
      if (incident.expectedDelay && incident.expectedDelay > 0) {
        addText(`Retraso estimado: ${incident.expectedDelay} días`, MARGIN + 80, y - 6, helvetica, 9, COLORS.red);
      }
      
      y -= 20;
      
      if (incident.internalDescription) {
        addBoldText("Descripción interna:", MARGIN + 10, y, 9, COLORS.primary);
        y -= 12;
        addText(incident.internalDescription, MARGIN + 20, y, helvetica, 9, COLORS.primary);
        y -= 16;
      }
      
      if (incident.publicDescription) {
        addBoldText("Descripción pública:", MARGIN + 10, y, 9, COLORS.primary);
        y -= 12;
        addText(incident.publicDescription, MARGIN + 20, y, helvetica, 9, COLORS.primary);
        y -= 16;
      }
      
      y -= 10;
      drawLine(y, COLORS.lightGray);
      y -= 10;
    }
  }

  // ============ FOOTER ============
  y = Math.max(y, MARGIN + 30);
  drawLine(y, COLORS.accent);
  y -= 10;
  addText(`Informe generado automáticamente el ${new Date(data.generatedAt).toLocaleString('es-ES')} por ${data.generatedBy}`, MARGIN, y, helveticaOblique, 8, COLORS.mediumGray);
  y -= 12;
  addText("Talleres Manotas - Chapa y Pintura · Flota Sustitución · Peritación In Situ", MARGIN, y, helveticaOblique, 8, COLORS.mediumGray);
  y -= 12;
  addText("Este documento es confidencial y para uso exclusivo de la aseguradora destinataria.", MARGIN, y, helveticaOblique, 7, COLORS.mediumGray);

  // Page numbers
  const pages = pdfDoc.getPages();
  pages.forEach((p, i) => {
    p.drawText(`Página ${i + 1} de ${pages.length}`, {
      x: PAGE_WIDTH - MARGIN - 60,
      y: MARGIN - 20,
      font: helvetica,
      size: 8,
      color: COLORS.mediumGray
    });
  });

  return pdfDoc.save();
}

function heading(text: string, yPos: number): number {
  // This will be called in context where we have access to page, helveticaBold, etc.
  // We'll implement it inline in the main function
  return yPos;
}

function getStatusColor(status: string): [number, number, number] {
  const statusColors: Record<string, [number, number, number]> = {
    RECEPCIONADO: [0.15, 0.39, 0.92],      // blue
    PENDIENTE_PERITACION: [1, 0.42, 0],     // orange
    PERITACION_REALIZADA: [1, 0.42, 0],     // orange
    PENDIENTE_AUTORIZACION: [1, 0.42, 0],   // orange
    AUTORIZADO: [0.09, 0.64, 0.29],         // green
    PENDIENTE_PIEZAS: [0.96, 0.62, 0],      // amber
    EN_DESMONTAJE: [0.55, 0.36, 0.97],      // purple
    CHAPA: [0.55, 0.36, 0.97],              // purple
    PREPARACION_PINTURA: [0.55, 0.36, 0.97], // purple
    PINTURA: [0.55, 0.36, 0.97],            // purple
    MONTAJE: [0.55, 0.36, 0.97],            // purple
    MECANICA: [0.55, 0.36, 0.97],           // purple
    CONTROL_CALIDAD: [0.55, 0.36, 0.97],    // purple
    LIMPIEZA: [0.55, 0.36, 0.97],           // purple
    LISTO_PARA_ENTREGA: [0.09, 0.64, 0.29], // green
    ENTREGADO: [0.3, 0.3, 0.3],             // dark gray
    BLOQUEADO: [0.86, 0.16, 0.16],          // red
    ESPERA_CLIENTE: [0.86, 0.16, 0.16],     // red
    ESPERA_ASEGURADORA: [0.86, 0.16, 0.16], // red
    ESPERA_RECAMBIO: [0.96, 0.62, 0],       // amber
    RETRABAJO: [0.86, 0.16, 0.16]           // red
  };
  const color = statusColors[status] || [0.3, 0.3, 0.3];
  return rgb(color[0], color[1], color[2]);
}

export async function generateWorkOrderSummaryPDF(data: InsurerReportData): Promise<Uint8Array> {
  // Simplified one-page summary
  const pdfDoc = await PDFDocument.create();
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let y = PAGE_HEIGHT - MARGIN;

  const addText = (text: string, x: number, yPos: number, font = helvetica, size = 10, color = COLORS.primary, maxWidth?: number) => {
    page.drawText(text, { x, y: yPos, font, size, color: COLORS.primary, maxWidth });
  };
  const addBold = (text: string, x: number, yPos: number, size = 10) => {
    page.drawText(text, { x, y: yPos, font: helveticaBold, size, color: COLORS.primary });
  };

  // Header
  addBold("TALLERES MANOTAS - RESUMEN DE EXPEDIENTE", MARGIN, y, 16);
  y -= 25;

  // Key info
  const fields = [
    ["Referencia", data.workOrder.reference],
    ["Estado", data.workOrder.status],
    ["Vehículo", `${data.workOrder.vehicle.plate} ${data.workOrder.vehicle.make} ${data.workOrder.vehicle.model}`],
    ["Entrada", data.workOrder.entryDate],
    ["Entrega est.", data.workOrder.estimatedDeliveryDate || "—"],
    ["Cliente", data.workOrder.customerName || "—"],
    ["Aseguradora", data.workOrder.insurerName || "—"],
    ["Nº Siniestro", data.workOrder.claimNumber || "—"]
  ];

  fields.forEach(([label, value]) => {
    page.drawText(label + ":", { x: MARGIN, y, font: helveticaBold, size: 10, color: COLORS.primary });
    page.drawText(value, { x: MARGIN + 120, y, font: helvetica, size: 10, color: COLORS.primary });
    y -= 18;
  });

  y -= 10;
  page.drawLine({ start: { x: MARGIN, y }, end: { x: PAGE_WIDTH - MARGIN, y }, thickness: 1, color: COLORS.accent });
  y -= 15;

  addBold("Últimos eventos:", MARGIN, y, 12);
  y -= 20;

  data.timeline.slice(0, 5).forEach(event => {
    const color = getStatusColor(event.status);
    page.drawRectangle({ x: MARGIN, y: y - 12, width: 100, height: 16, color: rgb(...getStatusColor(event.status)) });
    page.drawText(event.status, { x: MARGIN + 5, y: y - 8, font: helveticaBold, size: 8, color: COLORS.white });
    page.drawText(new Date(event.createdAt).toLocaleDateString('es-ES'), { x: MARGIN + 110, y: y - 4, font: helvetica, size: 9, color: COLORS.mediumGray });
    if (event.notePublic) {
      y -= 16;
      page.drawText(event.notePublic, { x: MARGIN + 10, y, font: helvetica, size: 9, color: COLORS.primary, maxWidth: CONTENT_WIDTH - 20 });
    }
    y -= 22;
  });

  // Footer
  page.drawLine({ start: { x: MARGIN, y: MARGIN - 10 }, end: { x: PAGE_WIDTH - MARGIN, y: MARGIN - 10 }, thickness: 0.5, color: COLORS.lightGray });
  page.drawText(`Generado: ${new Date().toLocaleString('es-ES')}`, { x: MARGIN, y: MARGIN - 30, font: helvetica, size: 8, color: COLORS.mediumGray });

  return pdfDoc.save();
}
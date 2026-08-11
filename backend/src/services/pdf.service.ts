import PDFDocument from 'pdfkit';
import { prisma } from '../config/database';

export async function generateQuotePDF(quoteId: string): Promise<Buffer> {
  const quote = await prisma.quote.findUniqueOrThrow({
    where: { id: quoteId },
    include: { client: true, items: { include: { product: true } } }
  });
  const settings = await prisma.companySettings.findFirst();

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const chunks: Buffer[] = [];
    doc.on('data', c => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // Cabeçalho
    doc.fontSize(22).font('Helvetica-Bold').text(settings?.name || 'PrintFlow Studio', { align: 'right' });
    doc.fontSize(10).font('Helvetica').text(`CNPJ: ${settings?.cnpj || ''}`, { align: 'right' });
    doc.text(`${settings?.address || ''}`, { align: 'right' });
    doc.text(`${settings?.phone || ''} • ${settings?.email || ''}`, { align: 'right' });

    doc.moveDown(2);
    doc.fontSize(20).font('Helvetica-Bold').text(`ORÇAMENTO #${quote.number}`, { align: 'center' });
    doc.moveDown();
    doc.fontSize(10).text(`Válido até: ${quote.validUntil.toLocaleDateString('pt-BR')}`, { align: 'center' });
    doc.moveDown(2);

    // Cliente
    doc.fontSize(12).font('Helvetica-Bold').text('CLIENTE');
    doc.fontSize(10).font('Helvetica')
      .text(quote.client.name)
      .text(`${quote.client.document} • ${quote.client.email}`)
      .text(quote.client.phone || '');
    doc.moveDown();

    // Tabela de itens
    const tableTop = doc.y;
    doc.fontSize(10).font('Helvetica-Bold');
    doc.text('PRODUTO', 50, tableTop);
    doc.text('QTD', 300, tableTop);
    doc.text('UNIT.', 380, tableTop);
    doc.text('TOTAL', 480, tableTop);
    doc.moveTo(50, tableTop + 15).lineTo(550, tableTop + 15).stroke();

    let y = tableTop + 20;
    doc.font('Helvetica');
    quote.items.forEach(item => {
      doc.text(item.product.name, 50, y, { width: 240 });
      doc.text(String(item.quantity), 300, y);
      doc.text(`R$ ${item.unitPrice.toFixed(2)}`, 380, y);
      doc.text(`R$ ${item.totalPrice.toFixed(2)}`, 480, y);
      y += 25;
    });

    doc.moveTo(350, y).lineTo(550, y).stroke();
    y += 10;
    doc.font('Helvetica-Bold').text(`TOTAL: R$ ${quote.total.toFixed(2)}`, 420, y);

    if (quote.notes) {
      y += 40;
      doc.font('Helvetica-Bold').text('OBSERVAÇÕES', 50, y);
      y += 15;
      doc.font('Helvetica').text(quote.notes, 50, y, { width: 500 });
    }

    doc.end();
  });
}

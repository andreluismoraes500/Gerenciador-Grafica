import nodemailer from 'nodemailer';
import { prisma } from '../config/database';
import { AppError } from '../utils/AppError';

interface EmailOptions {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  attachments?: Array<{
    filename: string;
    content?: Buffer | string;
    path?: string;
  }>;
}

export const emailService = {
  async getTransporter() {
    const settings = await prisma.companySettings.findFirst();
    
    const host = settings?.smtpHost || process.env.SMTP_HOST;
    const port = settings?.smtpPort || Number(process.env.SMTP_PORT) || 587;
    const user = settings?.smtpUser || process.env.SMTP_USER;
    const pass = settings?.smtpPassword || process.env.SMTP_PASSWORD;
    const from = settings?.smtpFrom || process.env.SMTP_FROM;

    if (!host || !user || !pass) {
      throw new AppError('SMTP não configurado. Verifique as configurações do sistema.', 400);
    }

    return {
      transporter: nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
        tls: { rejectUnauthorized: false }
      }),
      from
    };
  },

  async send(options: EmailOptions) {
    const { transporter, from } = await this.getTransporter();
    
    const to = Array.isArray(options.to) ? options.to.join(', ') : options.to;

    try {
      await transporter.sendMail({
        from,
        to,
        subject: options.subject,
        html: options.html,
        text: options.text,
        attachments: options.attachments
      });
    } catch (error) {
      console.error('[Email] Erro ao enviar:', error);
      throw new AppError('Falha ao enviar e-mail. Verifique as configurações SMTP.', 500);
    }
  },

  /**
   * Envia orçamento para o cliente
   */
  async sendQuote(quoteId: string, toEmail?: string) {
    const quote = await prisma.quote.findUnique({
      where: { id: quoteId },
      include: { 
        client: true,
        items: { include: { product: true } }
      }
    });

    if (!quote) throw new AppError('Orçamento não encontrado', 404);

    const settings = await prisma.companySettings.findFirst();
    const pdfBuffer = await generateQuotePDF(quoteId); // função existente

    const html = `
      <h2>Orçamento #${quote.number}</h2>
      <p>Olá ${quote.client.name},</p>
      <p>Segue o orçamento solicitado para os itens abaixo:</p>
      <table style="width:100%; border-collapse: collapse;">
        <thead>
          <tr style="background: #f3f4f6;">
            <th style="padding: 8px; text-align: left;">Produto</th>
            <th style="padding: 8px; text-align: center;">Qtd</th>
            <th style="padding: 8px; text-align: right;">Preço Unit.</th>
            <th style="padding: 8px; text-align: right;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${quote.items.map(item => `
            <tr>
              <td style="padding: 8px;">${item.product.name}</td>
              <td style="padding: 8px; text-align: center;">${item.quantity}</td>
              <td style="padding: 8px; text-align: right;">R$ ${item.unitPrice.toFixed(2)}</td>
              <td style="padding: 8px; text-align: right;">R$ ${item.totalPrice.toFixed(2)}</td>
            </tr>
          `).join('')}
        </tbody>
        <tfoot>
          <tr>
            <td colspan="3" style="padding: 8px; text-align: right; font-weight: bold;">Total:</td>
            <td style="padding: 8px; text-align: right; font-weight: bold;">R$ ${quote.total.toFixed(2)}</td>
          </tr>
        </tfoot>
      </table>
      ${quote.notes ? `<p><strong>Observações:</strong> ${quote.notes}</p>` : ''}
      <p><strong>Validade:</strong> ${new Date(quote.validUntil).toLocaleDateString('pt-BR')}</p>
      <hr style="margin: 20px 0;" />
      <p style="font-size: 12px; color: #6b7280;">
        ${settings?.name || 'PrintFlow Studio'} - ${settings?.phone || ''}<br/>
        ${settings?.address || ''}
      </p>
    `;

    await this.send({
      to: toEmail || quote.client.email,
      subject: `Orçamento #${quote.number} - ${settings?.name || 'PrintFlow Studio'}`,
      html,
      attachments: [
        { filename: `orcamento-${quote.number}.pdf`, content: pdfBuffer }
      ]
    });

    await prisma.quote.update({
      where: { id: quoteId },
      data: { status: 'SENT' }
    });
  },

  /**
   * Envia confirmação de pedido
   */
  async sendOrderConfirmation(orderId: string) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { 
        client: true,
        items: { include: { product: true } }
      }
    });

    if (!order) throw new AppError('Pedido não encontrado', 404);

    const html = `
      <h2>Pedido #${order.code}</h2>
      <p>Olá ${order.client.name},</p>
      <p>Seu pedido foi confirmado com sucesso!</p>
      <p><strong>Status:</strong> ${order.status}</p>
      <p><strong>Total:</strong> R$ ${order.total.toFixed(2)}</p>
      ${order.dueDate ? `<p><strong>Previsão de entrega:</strong> ${new Date(order.dueDate).toLocaleDateString('pt-BR')}</p>` : ''}
    `;

    await this.send({
      to: order.client.email,
      subject: `Pedido #${order.code} confirmado`,
      html
    });
  }
};

// Import necessário para o PDF
import { generateQuotePDF } from './pdf.service';
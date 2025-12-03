import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Order, OrderItem } from '@/lib/types';
import {
    INVOICE_CONFIG,
    generateInvoiceNumber,
    formatInvoiceDate,
    formatInvoiceTime
} from '@/config/invoice';

interface UserProfile {
    name?: string;
    email?: string;
    phone?: string;
}

/**
 * Generate PDF invoice from order data
 */
export async function generateInvoicePDF(
    order: Order,
    userDetails?: UserProfile
): Promise<Blob> {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    const { company, invoice, theme } = INVOICE_CONFIG;
    const invoiceNumber = generateInvoiceNumber(order.id, new Date(order.createdAt));
    const invoiceDate = new Date(order.createdAt);

    // Helper function to add text with color
    const addColoredText = (text: string, x: number, y: number, color: number[], fontSize = 10, style: 'normal' | 'bold' = 'normal') => {
        doc.setTextColor(...color);
        doc.setFontSize(fontSize);
        doc.setFont('helvetica', style);
        doc.text(text, x, y);
    };

    // ========== HEADER ==========
    let yPos = 20;

    // Company Name (Large, Peach color)
    addColoredText(company.name, 15, yPos, theme.primaryColor, 24, 'bold');

    // TAX INVOICE (Right aligned, Navy)
    addColoredText('TAX INVOICE', pageWidth - 15, yPos, theme.secondaryColor, 16, 'bold');
    doc.setTextColor(...theme.secondaryColor);
    doc.text('TAX INVOICE', pageWidth - 15, yPos, { align: 'right' });

    yPos += 10;

    // Company Address
    doc.setFontSize(9);
    doc.setTextColor(...theme.textLight);
    doc.setFont('helvetica', 'normal');
    doc.text(company.address, 15, yPos);
    yPos += 5;
    doc.text(company.addressLine2, 15, yPos);
    yPos += 5;
    doc.text(`Phone: ${company.phone}`, 15, yPos);
    yPos += 5;
    doc.text(`Email: ${company.email}`, 15, yPos);

    // Invoice Number & Date (Right aligned)
    yPos = 35;
    doc.setFontSize(10);
    doc.setTextColor(...theme.textDark);
    doc.setFont('helvetica', 'bold');
    doc.text(`Invoice No: ${invoiceNumber}`, pageWidth - 15, yPos, { align: 'right' });
    yPos += 6;
    doc.setFont('helvetica', 'normal');
    doc.text(`Date: ${formatInvoiceDate(invoiceDate)}`, pageWidth - 15, yPos, { align: 'right' });
    yPos += 6;
    doc.text(`Time: ${formatInvoiceTime(invoiceDate)}`, pageWidth - 15, yPos, { align: 'right' });

    // GST Status
    yPos += 10;
    doc.setFontSize(9);
    doc.setTextColor(...theme.textLight);
    doc.text(company.gstNote, 15, yPos);

    // Divider line
    yPos += 5;
    doc.setDrawColor(...theme.primaryColor);
    doc.setLineWidth(0.5);
    doc.line(15, yPos, pageWidth - 15, yPos);

    // ========== CUSTOMER DETAILS ==========
    yPos += 10;
    doc.setFontSize(11);
    doc.setTextColor(...theme.secondaryColor);
    doc.setFont('helvetica', 'bold');
    doc.text('BILL TO:', 15, yPos);

    yPos += 7;
    doc.setFontSize(10);
    doc.setTextColor(...theme.textDark);
    doc.setFont('helvetica', 'normal');
    doc.text(userDetails?.name || 'Customer', 15, yPos);

    if (userDetails?.email) {
        yPos += 5;
        doc.setFontSize(9);
        doc.setTextColor(...theme.textLight);
        doc.text(userDetails.email, 15, yPos);
    }

    if (userDetails?.phone) {
        yPos += 5;
        doc.text(userDetails.phone, 15, yPos);
    }

    // Order Details (Right side)
    yPos = yPos - (userDetails?.email && userDetails?.phone ? 17 : userDetails?.email || userDetails?.phone ? 12 : 7);
    doc.setFontSize(9);
    doc.setTextColor(...theme.textDark);
    doc.text(`Order ID: ${order.id}`, pageWidth - 15, yPos, { align: 'right' });
    yPos += 5;
    doc.text(`Restaurant: ${order.restaurantName}`, pageWidth - 15, yPos, { align: 'right' });
    yPos += 5;
    doc.text(`Payment: ${order.payment?.method || 'Cash'}`, pageWidth - 15, yPos, { align: 'right' });

    // ========== ITEMS TABLE ==========
    yPos += 15;

    const tableData = order.items.map((item: OrderItem) => [
        item.name,
        invoice.hsnCode,
        item.quantity.toString(),
        `${invoice.currency}${item.unitPrice.toFixed(0)}`,
        `${invoice.currency}${(item.unitPrice * item.quantity).toFixed(0)}`
    ]);

    autoTable(doc, {
        startY: yPos,
        head: [['Item Description', 'HSN/SAC', 'Qty', 'Unit Price', 'Amount']],
        body: tableData,
        theme: 'striped',
        headStyles: {
            fillColor: theme.secondaryColor,
            textColor: [255, 255, 255],
            fontSize: 10,
            fontStyle: 'bold'
        },
        bodyStyles: {
            fontSize: 9,
            textColor: theme.textDark
        },
        alternateRowStyles: {
            fillColor: [250, 250, 250]
        },
        columnStyles: {
            0: { cellWidth: 70 },
            1: { cellWidth: 25, halign: 'center' },
            2: { cellWidth: 20, halign: 'center' },
            3: { cellWidth: 30, halign: 'right' },
            4: { cellWidth: 35, halign: 'right' }
        },
        margin: { left: 15, right: 15 }
    });

    // Get the final Y position after the table
    yPos = (doc as any).lastAutoTable.finalY + 10;

    // ========== PRICING SUMMARY ==========
    const summaryX = pageWidth - 80;
    const labelX = summaryX;
    const valueX = pageWidth - 15;

    doc.setFontSize(10);
    doc.setTextColor(...theme.textDark);

    // Subtotal
    doc.text('Subtotal:', labelX, yPos);
    doc.text(`${invoice.currency}${order.pricing.subtotal.toFixed(0)}`, valueX, yPos, { align: 'right' });
    yPos += 6;

    // CGST
    const cgstAmount = order.pricing.subtotal * invoice.cgstRate;
    doc.text(`CGST (2.5%):`, labelX, yPos);
    doc.text(`${invoice.currency}${cgstAmount.toFixed(0)}`, valueX, yPos, { align: 'right' });
    yPos += 6;

    // SGST
    const sgstAmount = order.pricing.subtotal * invoice.sgstRate;
    doc.text(`SGST (2.5%):`, labelX, yPos);
    doc.text(`${invoice.currency}${sgstAmount.toFixed(0)}`, valueX, yPos, { align: 'right' });
    yPos += 6;

    // Discount (if any)
    if (order.pricing.discount > 0) {
        doc.setTextColor(...theme.accentColor);
        doc.text('Discount:', labelX, yPos);
        doc.text(`-${invoice.currency}${order.pricing.discount.toFixed(0)}`, valueX, yPos, { align: 'right' });
        yPos += 6;
    }

    // Loyalty Discount (if any)
    if (order.pricing.loyaltyDiscount && order.pricing.loyaltyDiscount > 0) {
        doc.setTextColor(...theme.accentColor);
        doc.text('Loyalty Discount:', labelX, yPos);
        doc.text(`-${invoice.currency}${order.pricing.loyaltyDiscount.toFixed(0)}`, valueX, yPos, { align: 'right' });
        yPos += 6;
    }

    // Divider line
    doc.setDrawColor(...theme.primaryColor);
    doc.setLineWidth(0.3);
    doc.line(summaryX, yPos, pageWidth - 15, yPos);
    yPos += 6;

    // Grand Total
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...theme.secondaryColor);
    doc.text('TOTAL:', labelX, yPos);
    doc.text(`${invoice.currency}${order.pricing.totalAmount.toFixed(0)}`, valueX, yPos, { align: 'right' });

    // ========== FOOTER ==========
    yPos = pageHeight - 40;

    // Thank you message
    doc.setFontSize(11);
    doc.setTextColor(...theme.primaryColor);
    doc.setFont('helvetica', 'bold');
    doc.text(invoice.footer, pageWidth / 2, yPos, { align: 'center' });

    // Terms and Conditions
    yPos += 8;
    doc.setFontSize(8);
    doc.setTextColor(...theme.textLight);
    doc.setFont('helvetica', 'normal');

    invoice.termsAndConditions.forEach((term, index) => {
        doc.text(`${index + 1}. ${term}`, 15, yPos);
        yPos += 4;
    });

    // Invoice generation timestamp
    yPos += 5;
    doc.setFontSize(7);
    doc.setTextColor(...theme.textLight);
    const timestamp = new Date().toLocaleString('en-IN');
    doc.text(`Generated on: ${timestamp}`, pageWidth / 2, yPos, { align: 'center' });

    // Return PDF as Blob
    return doc.output('blob');
}

/**
 * Download invoice PDF
 */
export async function downloadInvoice(
    order: Order,
    userDetails?: UserProfile
): Promise<void> {
    const blob = await generateInvoicePDF(order, userDetails);
    const invoiceNumber = generateInvoiceNumber(order.id, new Date(order.createdAt));

    // Create download link
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${invoiceNumber}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

/**
 * Get invoice number for display
 */
export function getInvoiceNumber(orderId: string, createdAt: Date | string): string {
    return generateInvoiceNumber(orderId, new Date(createdAt));
}

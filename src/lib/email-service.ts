import { generateInvoicePDF } from './invoice-generator';
import { Order } from './types';

interface UserProfile {
    name?: string;
    email?: string;
    phone?: string;
}

interface EmailInvoiceParams {
    order: Order;
    userDetails: UserProfile;
    userEmail: string;
}

/**
 * Send invoice PDF via email
 * This uses EmailJS service for sending emails from the client side
 */
export async function sendInvoiceEmail({
    order,
    userDetails,
    userEmail
}: EmailInvoiceParams): Promise<void> {
    try {
        console.log('Starting invoice email send process...');
        console.log('User email:', userEmail);
        console.log('User details:', userDetails);

        if (!userEmail || !userEmail.includes('@')) {
            console.error('Invalid email address:', userEmail);
            throw new Error('Invalid email address');
        }

        // Generate the PDF blob
        console.log('Generating PDF...');
        const pdfBlob = await generateInvoicePDF(order, userDetails);
        console.log('PDF generated, size:', pdfBlob.size, 'bytes');

        // Convert blob to base64
        console.log('Converting PDF to base64...');
        const base64PDF = await blobToBase64(pdfBlob);
        console.log('Base64 conversion complete, length:', base64PDF.length);

        // Get invoice number for filename
        const invoiceNumber = `INV-${order.id.slice(-8).toUpperCase()}`;
        const fileName = `${invoiceNumber}.pdf`;

        // Send email using EmailJS
        const emailParams = {
            to_email: userEmail,
            reply_to: userEmail, // EmailJS requires this field for recipient
            to_name: userDetails.name || 'Customer',
            order_number: order.orderNumber || order.id.slice(-6).toUpperCase(),
            invoice_number: invoiceNumber,
            total_amount: order.pricing.totalAmount.toFixed(0),
            pdf_attachment: base64PDF,
            pdf_filename: fileName,
            restaurant_name: order.restaurantName,
            order_date: new Date(
                typeof order.createdAt === 'string'
                    ? order.createdAt
                    : order.createdAt instanceof Date
                        ? order.createdAt
                        : (order.createdAt as any).toDate?.() || new Date()
            ).toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'long',
                year: 'numeric'
            })
        };

        console.log('Email params prepared:', {
            to_email: emailParams.to_email,
            to_name: emailParams.to_name,
            order_number: emailParams.order_number,
            invoice_number: emailParams.invoice_number
        });

        // Initialize EmailJS (you'll need to configure this)
        const EMAILJS_SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID || 'service_swaadcourt';
        const EMAILJS_TEMPLATE_ID = import.meta.env.VITE_EMAILJS_INVOICE_TEMPLATE_ID || 'template_invoice';
        const EMAILJS_PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;

        console.log('EmailJS config:', {
            serviceId: EMAILJS_SERVICE_ID,
            templateId: EMAILJS_TEMPLATE_ID,
            hasPublicKey: !!EMAILJS_PUBLIC_KEY
        });

        if (!EMAILJS_PUBLIC_KEY) {
            console.warn('EmailJS not configured. Invoice email not sent.');
            return;
        }

        // Dynamically import EmailJS
        console.log('Importing EmailJS...');
        const emailjs = await import('@emailjs/browser');

        console.log('Sending email via EmailJS...');
        const response = await emailjs.send(
            EMAILJS_SERVICE_ID,
            EMAILJS_TEMPLATE_ID,
            emailParams,
            EMAILJS_PUBLIC_KEY
        );

        console.log('EmailJS response:', response);
        console.log('Invoice email sent successfully to:', userEmail);
    } catch (error) {
        console.error('Error sending invoice email:', error);
        console.error('Error details:', JSON.stringify(error, null, 2));
        // Don't throw error - email sending is not critical
        // The user can still download the invoice manually
    }
}

/**
 * Convert Blob to Base64 string
 */
function blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            if (typeof reader.result === 'string') {
                // Remove the data URL prefix (e.g., "data:application/pdf;base64,")
                const base64 = reader.result.split(',')[1];
                resolve(base64);
            } else {
                reject(new Error('Failed to convert blob to base64'));
            }
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

/**
 * Alternative: Send invoice using a backend API
 * This is more reliable for production use
 */
export async function sendInvoiceViaBackend({
    order,
    userDetails,
    userEmail
}: EmailInvoiceParams): Promise<void> {
    try {
        // Generate the PDF blob
        const pdfBlob = await generateInvoicePDF(order, userDetails);

        // Create FormData to send to backend
        const formData = new FormData();
        formData.append('pdf', pdfBlob, `invoice-${order.id}.pdf`);
        formData.append('email', userEmail);
        formData.append('name', userDetails.name || 'Customer');
        formData.append('orderNumber', order.orderNumber || order.id);
        formData.append('totalAmount', order.pricing.totalAmount.toString());

        // Send to your backend API endpoint
        const response = await fetch('/api/send-invoice', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            throw new Error('Failed to send invoice via backend');
        }

        console.log('Invoice sent successfully via backend');
    } catch (error) {
        console.error('Error sending invoice via backend:', error);
        throw error;
    }
}

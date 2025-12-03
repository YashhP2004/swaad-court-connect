// Invoice Configuration for SwaadCourt
export const INVOICE_CONFIG = {
    company: {
        name: 'SwaadCourt',
        address: 'SwaadCourt HQ, 3rd Floor, A-Wing',
        addressLine2: 'TechPark Central, Pune, Maharashtra – 411001, India',
        phone: '+91 9322421301',
        email: 'support@swaadcourt.com',
        gst: null, // Not registered yet
        gstNote: 'GST Not Applicable',
        website: 'www.swaadcourt.com'
    },
    invoice: {
        prefix: 'SC-IN',
        taxRate: 0.05, // 5% GST (CGST 2.5% + SGST 2.5%)
        cgstRate: 0.025, // 2.5% CGST
        sgstRate: 0.025, // 2.5% SGST
        currency: '₹',
        hsnCode: '9963', // HSN/SAC code for restaurant services
        footer: 'Thank you for ordering with SwaadCourt!',
        termsAndConditions: [
            'This is a computer-generated invoice and does not require a signature.',
            'For any queries, please contact support@swaadcourt.com',
            'Goods once sold will not be taken back or exchanged.'
        ]
    },
    theme: {
        primaryColor: [255, 180, 143], // Peach #FFB48F (RGB)
        secondaryColor: [18, 62, 82], // Navy #123E52 (RGB)
        accentColor: [255, 107, 107], // Red accent (RGB)
        textDark: [33, 33, 33], // Dark text
        textLight: [102, 102, 102] // Light text
    }
};

// Helper function to generate invoice number
export function generateInvoiceNumber(orderId: string, createdAt: Date): string {
    const date = new Date(createdAt);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    // Extract last 5 characters of order ID as sequence number
    const sequence = orderId.slice(-5).toUpperCase();

    return `${INVOICE_CONFIG.invoice.prefix}-${year}${month}${day}-${sequence}`;
}

// Helper function to format date
export function formatInvoiceDate(date: Date): string {
    return date.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    });
}

// Helper function to format time
export function formatInvoiceTime(date: Date): string {
    return date.toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    });
}

import React, { useState } from 'react';
import { FileText, Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Order } from '@/lib/types';
import { downloadInvoice } from '@/lib/invoice-generator';
import { toast } from 'sonner';

interface InvoiceButtonProps {
    order: Order;
    userDetails?: {
        name?: string;
        email?: string;
        phone?: string;
    };
    variant?: 'default' | 'outline' | 'ghost';
    size?: 'default' | 'sm' | 'lg' | 'icon';
    showIcon?: boolean;
    className?: string;
}

export function InvoiceButton({
    order,
    userDetails,
    variant = 'outline',
    size = 'sm',
    showIcon = true,
    className = ''
}: InvoiceButtonProps) {
    const [isGenerating, setIsGenerating] = useState(false);

    const handleDownload = async () => {
        setIsGenerating(true);
        try {
            await downloadInvoice(order, userDetails);
            toast.success('Invoice downloaded successfully!');
        } catch (error) {
            console.error('Error generating invoice:', error);
            toast.error('Failed to generate invoice. Please try again.');
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <Button
            variant={variant}
            size={size}
            onClick={handleDownload}
            disabled={isGenerating}
            className={className}
        >
            {isGenerating ? (
                <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating...
                </>
            ) : (
                <>
                    {showIcon && <FileText className="w-4 h-4 mr-2" />}
                    Download Invoice
                </>
            )}
        </Button>
    );
}

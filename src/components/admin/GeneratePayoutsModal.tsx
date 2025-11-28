import React from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle, DollarSign, Users } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface VendorPayoutSummary {
    vendorId: string;
    vendorName: string;
    orderCount: number;
    amount: number;
}

interface GeneratePayoutsModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    vendorSummaries: VendorPayoutSummary[];
    onConfirm: () => void;
    isLoading?: boolean;
}

export default function GeneratePayoutsModal({
    open,
    onOpenChange,
    vendorSummaries,
    onConfirm,
    isLoading = false
}: GeneratePayoutsModalProps) {
    const totalAmount = vendorSummaries.reduce((sum, v) => sum + v.amount, 0);
    const totalVendors = vendorSummaries.length;
    const totalOrders = vendorSummaries.reduce((sum, v) => sum + v.orderCount, 0);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-xl">
                        <DollarSign className="w-6 h-6 text-green-600" />
                        Generate Payouts Confirmation
                    </DialogTitle>
                    <DialogDescription>
                        Review the payout details before initiating transfers to vendors.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 flex-1 overflow-y-auto">
                    {/* Summary Cards */}
                    <div className="grid grid-cols-3 gap-3">
                        <Card className="border-green-200 bg-green-50">
                            <CardContent className="p-4 text-center">
                                <div className="text-2xl font-bold text-green-700">₹{totalAmount.toLocaleString()}</div>
                                <div className="text-xs text-green-600 mt-1">Total Payout Amount</div>
                            </CardContent>
                        </Card>

                        <Card className="border-blue-200 bg-blue-50">
                            <CardContent className="p-4 text-center">
                                <div className="text-2xl font-bold text-blue-700">{totalVendors}</div>
                                <div className="text-xs text-blue-600 mt-1">Vendors</div>
                            </CardContent>
                        </Card>

                        <Card className="border-purple-200 bg-purple-50">
                            <CardContent className="p-4 text-center">
                                <div className="text-2xl font-bold text-purple-700">{totalOrders}</div>
                                <div className="text-xs text-purple-600 mt-1">Completed Orders</div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Warning */}
                    <div className="flex items-start gap-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                        <div className="text-sm text-yellow-800">
                            <p className="font-semibold mb-1">Important</p>
                            <p>This action will create payout requests for all vendors listed below. Ensure you have sufficient funds before confirming.</p>
                        </div>
                    </div>

                    {/* Vendor List */}
                    <div>
                        <h4 className="font-semibold text-sm text-gray-700 mb-2 flex items-center gap-2">
                            <Users className="w-4 h-4" />
                            Vendor Breakdown
                        </h4>
                        <div className="border rounded-lg overflow-hidden">
                            <div className="max-h-64 overflow-y-auto">
                                <table className="w-full text-sm">
                                    <thead className="bg-gray-50 sticky top-0">
                                        <tr>
                                            <th className="text-left p-3 font-medium text-gray-600">Vendor</th>
                                            <th className="text-center p-3 font-medium text-gray-600">Orders</th>
                                            <th className="text-right p-3 font-medium text-gray-600">Amount</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {vendorSummaries.map((vendor, index) => (
                                            <tr key={vendor.vendorId} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                                <td className="p-3 font-medium text-gray-900">{vendor.vendorName}</td>
                                                <td className="p-3 text-center text-gray-600">{vendor.orderCount}</td>
                                                <td className="p-3 text-right font-semibold text-green-600">
                                                    ₹{vendor.amount.toLocaleString()}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    {/* Estimated Processing Time */}
                    <div className="text-xs text-gray-500 text-center">
                        Estimated processing time: 2-5 minutes
                    </div>
                </div>

                <DialogFooter className="gap-2">
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={isLoading}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={onConfirm}
                        disabled={isLoading}
                        className="bg-green-600 hover:bg-green-700"
                    >
                        {isLoading ? (
                            <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                Generating...
                            </>
                        ) : (
                            'Confirm & Generate Payouts'
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

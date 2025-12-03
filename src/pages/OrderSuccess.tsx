import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle2 } from 'lucide-react';

export default function OrderSuccess() {
  const navigate = useNavigate();
  const location = useLocation();
  const { paymentId, orderId, amount } = location.state || {};

  if (!paymentId) {
    navigate('/');
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-16">
      <div className="max-w-md mx-auto text-center">
        <Card>
          <CardContent className="pt-6 space-y-6">
            <div className="flex justify-center">
              <CheckCircle2 className="h-16 w-16 text-green-500" />
            </div>

            <h1 className="text-2xl font-bold">Order Successful!</h1>

            <p className="text-muted-foreground">
              Thank you for your order. Your payment has been processed successfully.
            </p>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Payment ID:</span>
                <span className="font-medium">{paymentId}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Order Reference:</span>
                <span className="font-medium text-xs">{orderId}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Amount Paid:</span>
                <span className="font-medium">₹{amount}</span>
              </div>
            </div>

            <div className="space-y-3 pt-4">
              <Button
                className="w-full"
                onClick={() => navigate('/orders')}
              >
                View My Orders
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => navigate('/')}
              >
                Continue Shopping
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
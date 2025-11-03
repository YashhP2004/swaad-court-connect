import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useCart } from '@/context/cart-context';
import { useAuth } from '@/context/auth-context';
import { createOrder } from '@/lib/firebase';
import { ArrowLeft, User, Shield } from 'lucide-react';
import { toast } from 'sonner';

declare global {
  interface Window {
    Razorpay: any;
  }
}

export default function Checkout() {
  const navigate = useNavigate();
  const { getTotalPrice, items, clearCart } = useCart();
  const { user, isAuthenticated, isLoading } = useAuth();
  
  const totalAmount = getTotalPrice();
  const taxes = (totalAmount * 0.05).toFixed(2); // 5% tax
  const finalAmount = (parseFloat(totalAmount.toString()) + parseFloat(taxes)).toFixed(2);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast.error('Please log in to complete your order');
      navigate('/login', { 
        state: { 
          from: '/checkout',
          message: 'Please log in to complete your order and track your purchases'
        }
      });
    }
  }, [isAuthenticated, isLoading, navigate]);

  // Redirect to cart if no items
  useEffect(() => {
    if (items.length === 0) {
      navigate('/cart');
    }
  }, [items.length, navigate]);

  const initializeRazorpay = async () => {
    if (!user) {
      toast.error('Please log in to complete payment');
      navigate('/login');
      return;
    }

    const options = {
      key: 'rzp_test_R6PClkhg7vdR36',
      amount: Math.round(parseFloat(finalAmount) * 100), // Razorpay expects amount in paise
      currency: 'INR',
      name: 'Swaad Court',
      description: 'Food Order Payment',
      handler: async function (response: any) {
        // Handle successful payment
        if (response.razorpay_payment_id) {
          try {
            // Create order in Firestore with user information
            const orderData = {
              userId: user.uid,
              userEmail: user.email || '',
              userName: user.name || 'Customer',
              restaurantId: items[0]?.restaurantId || 'swaad_court_main',
              restaurantName: items[0]?.restaurantName || 'Swaad Court',
              restaurantImage: items[0]?.restaurantImage || '',
              items: items.map(item => ({
                id: item.id,
                name: item.name,
                quantity: item.quantity,
                unitPrice: item.price,
                totalPrice: item.totalPrice,
                image: item.image,
                category: item.category || 'Food',
                restaurantId: item.restaurantId,
                restaurantName: item.restaurantName
              })),
              pricing: {
                subtotal: totalAmount,
                taxes: parseFloat(taxes),
                deliveryFee: 0,
                discount: 0,
                totalAmount: parseFloat(finalAmount)
              },
              payment: {
                method: 'Razorpay',
                status: 'Completed',
                transactionId: response.razorpay_payment_id,
                paidAt: new Date().toISOString()
              },
              dineIn: {
                tableNumber: '12', // Default table number
                seatingArea: 'Main Hall',
                guestCount: 1
              },
              notes: '',
              source: 'mobile_app'
            };

            const orderId = await createOrder(orderData);
            console.log('Order created successfully:', orderId);

            toast.success('Order placed successfully!');

            // Clear cart and redirect to success page
            clearCart();
            navigate('/order-success', { 
              state: { 
                paymentId: response.razorpay_payment_id,
                orderId: orderId,
                amount: finalAmount
              }
            });
          } catch (error) {
            console.error('Error creating order:', error);
            toast.error('Order creation failed, but payment was successful');
            // Still redirect to success page even if order creation fails
            clearCart();
            navigate('/order-success', { 
              state: { 
                paymentId: response.razorpay_payment_id,
                orderId: response.razorpay_order_id,
                amount: finalAmount
              }
            });
          }
        }
      },
      prefill: {
        name: user?.name || '',
        email: user?.email || '',
        contact: user?.phone || ''
      },
      theme: {
        color: '#f97316'
      }
    };

    const rzp = new window.Razorpay(options);
    rzp.open();
  };

  useEffect(() => {
    // Load Razorpay script
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Don't render if not authenticated (will redirect)
  if (!isAuthenticated || !user) {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <Button
          variant="ghost"
          className="mb-6"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        {/* User Authentication Confirmation */}
        <Card className="mb-6 border-green-200 bg-green-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                <Shield className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="font-medium text-green-800">Secure Checkout</p>
                <p className="text-sm text-green-600">
                  Logged in as {user.name || user.email} • Your order will be tracked in your profile
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Order Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Order Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {items.map((item) => (
                  <div key={item.uniqueId} className="flex justify-between items-start">
                    <div>
                      <p className="font-medium">{item.name}</p>
                      <p className="text-sm text-muted-foreground">
                        Quantity: {item.quantity}
                      </p>
                    </div>
                    <p className="font-medium">₹{item.totalPrice.toFixed(2)}</p>
                  </div>
                ))}

                <Separator />

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Subtotal</span>
                    <span>₹{totalAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Taxes & Fees (5%)</span>
                    <span>₹{taxes}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total</span>
                    <span>₹{finalAmount}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payment Section */}
          <Card>
            <CardHeader>
              <CardTitle>Payment</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Customer Info */}
                <div className="p-3 bg-muted rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <p className="text-sm font-medium">Customer Details</p>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    <p>{user.name || 'Customer'}</p>
                    <p>{user.email}</p>
                    {user.phone && <p>{user.phone}</p>}
                  </div>
                </div>

                <Button 
                  className="w-full" 
                  size="lg"
                  onClick={initializeRazorpay}
                >
                  Pay ₹{finalAmount}
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  By proceeding with the payment, you agree to our terms and conditions.
                  Your order will be saved to your profile for tracking.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
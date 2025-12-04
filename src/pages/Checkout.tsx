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
  const taxes = (totalAmount * 0.05).toFixed(0); // 5% tax
  const finalAmount = (parseFloat(totalAmount.toString()) + parseFloat(taxes)).toFixed(0);

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
              userDetails: {
                name: user.name || 'Customer'
              },
              restaurantId: items[0]?.restaurantId || 'swaad_court_main',
              restaurantName: items[0]?.restaurantName || 'Swaad Court',
              items: items.map(item => {
                // Filter out undefined values from each item
                const itemData: any = {
                  id: item.id,
                  name: item.name,
                  quantity: item.quantity,
                  unitPrice: item.price,
                  totalPrice: item.totalPrice,
                };

                // Only add optional fields if they exist
                if (item.image) itemData.image = item.image;
                if (item.restaurantId) itemData.restaurantId = item.restaurantId;
                if (item.restaurantName) itemData.restaurantName = item.restaurantName;

                return itemData;
              }),
              pricing: {
                subtotal: totalAmount,
                taxes: parseFloat(taxes),
                deliveryFee: 0,
                discount: 0,
                totalAmount: parseFloat(finalAmount)
              },
              payment: {
                method: 'Razorpay',
                status: 'Completed' as const,
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

            const groupId = await createOrder(orderData);
            console.log('Orders created successfully, group ID:', groupId);

            // Send invoice email after successful order creation
            try {
              // Dynamically import the email service
              const { sendInvoiceEmail } = await import('@/lib/email-service');

              // Prepare order object for invoice
              const invoiceOrder = {
                id: groupId,
                orderNumber: groupId.slice(-6).toUpperCase(),
                restaurantName: orderData.restaurantName,
                items: orderData.items,
                pricing: orderData.pricing,
                payment: orderData.payment,
                createdAt: new Date().toISOString(),
                userId: user.uid
              };

              // Send invoice to user's email
              if (user.email) {
                await sendInvoiceEmail({
                  order: invoiceOrder as any,
                  userDetails: {
                    name: user.name || 'Customer',
                    email: user.email,
                    phone: user.phone
                  },
                  userEmail: user.email
                });
                console.log('Invoice email sent to:', user.email);
              }
            } catch (emailError) {
              console.error('Failed to send invoice email:', emailError);
              // Don't fail the order if email sending fails
            }

            toast.success('Order placed successfully! Invoice sent to your email.');

            // Clear cart and redirect to success page
            clearCart();
            navigate('/order-success', {
              state: {
                paymentId: response.razorpay_payment_id,
                orderId: groupId, // Passing groupId as orderId for display
                amount: finalAmount,
                isGroupOrder: true
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
    <div className="container mx-auto px-4 py-6 md:py-8">
      <div className="max-w-4xl mx-auto">
        <Button
          variant="ghost"
          className="mb-4 md:mb-6"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        {/* User Authentication Confirmation */}
        <Card className="mb-4 md:mb-6 border-green-200 bg-green-50">
          <CardContent className="pt-4 md:pt-6">
            <div className="flex items-start sm:items-center gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                <Shield className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-green-800 text-sm sm:text-base">Secure Checkout</p>
                <p className="text-xs sm:text-sm text-green-600 break-words">
                  Logged in as {user.name || user.email} • Your order will be tracked in your profile
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4 md:gap-6 md:grid-cols-2">
          {/* Order Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg md:text-xl">Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="p-4 md:p-6">
              <div className="space-y-3 md:space-y-4">
                {items.map((item) => (
                  <div key={item.uniqueId} className="flex justify-between items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm md:text-base truncate">{item.name}</p>
                      <p className="text-xs md:text-sm text-muted-foreground">
                        Quantity: {item.quantity}
                      </p>
                    </div>
                    <p className="font-medium text-sm md:text-base flex-shrink-0">₹{item.totalPrice.toFixed(0)}</p>
                  </div>
                ))}

                <Separator />

                <div className="space-y-2">
                  <div className="flex justify-between text-xs md:text-sm">
                    <span>Subtotal</span>
                    <span>₹{totalAmount.toFixed(0)}</span>
                  </div>
                  <div className="flex justify-between text-xs md:text-sm">
                    <span>Taxes & Fees (5%)</span>
                    <span>₹{taxes}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between text-base md:text-lg font-bold">
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
              <CardTitle className="text-lg md:text-xl">Payment</CardTitle>
            </CardHeader>
            <CardContent className="p-4 md:p-6">
              <div className="space-y-4">
                {/* Customer Info */}
                <div className="p-3 bg-muted rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <User className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
                    <p className="text-xs md:text-sm font-medium">Customer Details</p>
                  </div>
                  <div className="text-xs md:text-sm text-muted-foreground space-y-0.5">
                    <p className="truncate">{user.name || 'Customer'}</p>
                    <p className="truncate">{user.email}</p>
                    {user.phone && <p>{user.phone}</p>}
                  </div>
                </div>

                <Button
                  className="w-full text-base md:text-lg"
                  size="lg"
                  onClick={initializeRazorpay}
                >
                  Pay ₹{finalAmount}
                </Button>
                <p className="text-xs text-muted-foreground text-center px-2">
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
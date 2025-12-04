import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/context/theme-context";
import { AuthProvider } from "@/context/auth-context";
import { CartProvider } from "@/context/cart-context";
import { Header } from "@/components/layout/Header";
import { BottomNav } from "@/components/layout/BottomNav";
import Home from "./pages/Home";
import Restaurants from "./pages/Restaurants";
import Login from "./pages/Login";
import Restaurant from "./pages/Restaurant";
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import OrderSuccess from "./pages/OrderSuccess";
import Orders from "./pages/Orders";
import Profile from "./pages/Profile";
import AdminPanel from "./pages/AdminPanel";
import VendorDashboard from "./pages/VendorDashboard";
import NotFound from "./pages/NotFound";
import SearchPage from "./pages/Search";
import AdminSetup from "./pages/AdminSetup";

const queryClient = new QueryClient();

const AppLayout = ({ children }: { children: React.ReactNode }) => (
  <div className="min-h-screen bg-background overflow-x-hidden">
    <Header />
    <main className="pb-20 md:pb-0 overflow-x-hidden">
      {children}
    </main>
    <BottomNav />
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <AuthProvider>
        <CartProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Routes>
                <Route
                  path="/"
                  element={
                    <AppLayout>
                      <Home />
                    </AppLayout>
                  }
                />
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Login />} />

                {/* Admin Panel Route */}
                <Route path="/admin-panel" element={<AdminPanel />} />

                {/* Admin Setup Route - For initial admin user creation */}
                <Route path="/admin-setup" element={<AdminSetup />} />

                {/* Vendor Dashboard Route */}
                <Route path="/vendor-dashboard" element={<VendorDashboard />} />

                <Route
                  path="/restaurants"
                  element={
                    <AppLayout>
                      <Restaurants />
                    </AppLayout>
                  }
                />
                <Route
                  path="/restaurant/:id"
                  element={
                    <AppLayout>
                      <Restaurant />
                    </AppLayout>
                  }
                />
                <Route
                  path="/cart"
                  element={
                    <AppLayout>
                      <Cart />
                    </AppLayout>
                  }
                />
                <Route
                  path="/checkout"
                  element={
                    <AppLayout>
                      <Checkout />
                    </AppLayout>
                  }
                />
                <Route
                  path="/order-success"
                  element={
                    <AppLayout>
                      <OrderSuccess />
                    </AppLayout>
                  }
                />
                <Route
                  path="/orders"
                  element={
                    <AppLayout>
                      <Orders />
                    </AppLayout>
                  }
                />
                <Route
                  path="/profile"
                  element={
                    <AppLayout>
                      <Profile />
                    </AppLayout>
                  }
                />
                <Route
                  path="/search"
                  element={
                    <AppLayout>
                      <SearchPage />
                    </AppLayout>
                  }
                />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </CartProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;

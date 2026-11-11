import { createBrowserRouter, Navigate } from 'react-router-dom';
import {
  AccountAddressesRoute,
  AccountLayoutPage,
  AccountOrdersRoute,
  AccountPreferencesRoute,
  AccountRentalsRoute,
  AccountTuningRoute,
  AdminAiUsageRoute,
  AdminDashboardRoute,
  AdminImportRoute,
  AdminLayoutPage,
  AdminProductFormRoute,
  AdminProductsRoute,
  AdminRentalsRoute,
  AdminSalesRoute,
  AdminTuningRoute,
  CheckoutAddressRoute,
  CheckoutLayoutPage,
  CheckoutPaymentRoute,
  CheckoutReviewRoute,
  LazyPage,
  OrderConfirmationRoute,
} from './lazyPages';
import AppShell from '../components/layout/AppShell';
import CartPage from '../pages/CartPage';
import HomePage from '../pages/HomePage';
import NotFoundPage from '../pages/NotFoundPage';
import ProductDetailPage from '../pages/ProductDetailPage';
import RouteErrorPage from '../pages/RouteErrorPage';
import WishlistPage from '../pages/WishlistPage';
import { ManagerGate, ShopperGate } from '../components/auth/RoleGate';
import RegisterPage from '../pages/RegisterPage';
import SignInPage from '../pages/SignInPage';

// we are mapping URLs to components using React Router

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppShell />,
    errorElement: <RouteErrorPage />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'products/:id', element: <ProductDetailPage /> },
      { path: 'cart', element: <ShopperGate><CartPage /></ShopperGate> },
      { path: 'wishlist', element: <ShopperGate><WishlistPage /></ShopperGate> },
      { path: 'sign-in', element: <SignInPage /> },
      { path: 'register', element: <RegisterPage /> },
      {
        path: 'checkout',
        element: (
          <ShopperGate>
            <LazyPage component={CheckoutLayoutPage} />
          </ShopperGate>
        ),
        children: [
          { index: true, element: <Navigate to="address" replace /> },
          { path: 'address', element: <LazyPage component={CheckoutAddressRoute} /> },
          { path: 'payment', element: <LazyPage component={CheckoutPaymentRoute} /> },
          { path: 'review', element: <LazyPage component={CheckoutReviewRoute} /> },
        ],
      },
      {
        path: 'orders/:orderId',
        element: (
          <ShopperGate>
            <LazyPage component={OrderConfirmationRoute} />
          </ShopperGate>
        ),
      },
      {
        path: 'account',
        element: (
          <ShopperGate>
            <LazyPage component={AccountLayoutPage} />
          </ShopperGate>
        ),
        children: [
          { index: true, element: <Navigate to="orders" replace /> },
          { path: 'orders', element: <LazyPage component={AccountOrdersRoute} /> },
          { path: 'addresses', element: <LazyPage component={AccountAddressesRoute} /> },
          { path: 'preferences', element: <LazyPage component={AccountPreferencesRoute} /> },
          { path: 'rentals', element: <LazyPage component={AccountRentalsRoute} /> },
          { path: 'tuning', element: <LazyPage component={AccountTuningRoute} /> },
        ],
      },
      {
        path: 'admin',
        element: (
          <ManagerGate>
            <LazyPage component={AdminLayoutPage} />
          </ManagerGate>
        ),
        children: [
          { index: true, element: <Navigate to="dashboard" replace /> },
          { path: 'dashboard', element: <LazyPage component={AdminDashboardRoute} /> },
          { path: 'products', element: <LazyPage component={AdminProductsRoute} /> },
          { path: 'products/new', element: <LazyPage component={AdminProductFormRoute} /> },
          { path: 'products/:id/edit', element: <LazyPage component={AdminProductFormRoute} /> },
          { path: 'import', element: <LazyPage component={AdminImportRoute} /> },
          { path: 'sales', element: <LazyPage component={AdminSalesRoute} /> },
          { path: 'ai-usage', element: <LazyPage component={AdminAiUsageRoute} /> },
          { path: 'tuning', element: <LazyPage component={AdminTuningRoute} /> },
          { path: 'rentals', element: <LazyPage component={AdminRentalsRoute} /> },
        ],
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
], { basename: import.meta.env.BASE_URL.replace(/\/$/, '') || '/' });

import React, { useState, useEffect } from 'react';
import { AuthProvider } from './AuthContext.jsx';
import { LocationProvider } from './LocationContext.jsx';
import Navbar from './components/Navbar.jsx';
import Footer from './components/Footer.jsx';
import AuthModal from './components/AuthModal.jsx';
import LocationModal from './components/LocationModal.jsx';
import UberRideAlert from './components/UberRideAlert.jsx';
import BottomNav from './components/BottomNav.jsx';

import Home from './pages/Home.jsx';
import OrdersList from './pages/OrdersList.jsx';
import NewOrder from './pages/NewOrder.jsx';
import OrderDetail from './pages/OrderDetail.jsx';
import Opportunities from './pages/Opportunities.jsx';
import ClientDashboard from './pages/ClientDashboard.jsx';
import ProviderDashboard from './pages/ProviderDashboard.jsx';
import PublicProfile from './pages/PublicProfile.jsx';
import AdminDashboard from './pages/AdminDashboard.jsx';

export default function App() {
  const [currentPath, setCurrentPath] = useState(window.location.pathname);
  const [queryString, setQueryString] = useState(window.location.search);

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname);
      setQueryString(window.location.search);
      window.scrollTo(0, 0);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigate = (to) => {
    const [path, search] = to.split('?');
    window.history.pushState({}, '', to);
    setCurrentPath(path);
    setQueryString(search ? `?${search}` : '');
    window.scrollTo(0, 0);
  };

  // Helper to parse query parameters
  const queryParams = Object.fromEntries(new URLSearchParams(queryString));

  const renderRoute = () => {
    // 1. Home
    if (currentPath === '/') {
      return <Home navigate={navigate} />;
    }

    // 2. New Order
    if (currentPath === '/pedidos/novo') {
      return <NewOrder navigate={navigate} />;
    }

    // 3. Order Details: /pedidos/:id
    const orderDetailMatch = currentPath.match(/^\/pedidos\/([^/]+)$/);
    if (orderDetailMatch) {
      return <OrderDetail orderId={orderDetailMatch[1]} navigate={navigate} />;
    }

    // 4. Orders List: /pedidos
    if (currentPath === '/pedidos') {
      return <OrdersList navigate={navigate} initialParams={queryParams} />;
    }

    // 5. Opportunities: /oportunidades
    if (currentPath === '/oportunidades') {
      return <Opportunities navigate={navigate} />;
    }

    // 6. Client Dashboard: /minha-conta
    if (currentPath === '/minha-conta') {
      return <ClientDashboard navigate={navigate} />;
    }

    // 7. Provider Dashboard: /painel-profissional
    if (currentPath === '/painel-profissional') {
      return <ProviderDashboard navigate={navigate} />;
    }

    // 8. Public Professional Profile: /profissionais/:slug
    const profileMatch = currentPath.match(/^\/profissionais\/([^/]+)$/);
    if (profileMatch) {
      return <PublicProfile slug={profileMatch[1]} navigate={navigate} />;
    }

    // 9. Admin Dashboard: /admin
    if (currentPath === '/admin') {
      return <AdminDashboard navigate={navigate} />;
    }

    // Fallback 404
    return (
      <div className="max-w-md mx-auto my-20 p-8 bg-white rounded-3xl border border-slate-200 text-center space-y-4">
        <h2 className="text-3xl font-extrabold text-slate-900">404</h2>
        <p className="text-xs text-slate-500">Página não encontrada.</p>
        <button
          onClick={() => navigate('/')}
          className="px-5 py-2.5 bg-teal-600 text-white text-xs font-bold rounded-xl"
        >
          Voltar ao Início
        </button>
      </div>
    );
  };

  return (
    <AuthProvider>
      <LocationProvider>
        <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
          <Navbar currentPath={currentPath} navigate={navigate} />
          <main className="flex-1 pb-20 md:pb-0">
            {renderRoute()}
          </main>
          <Footer navigate={navigate} />
          <BottomNav currentPath={currentPath} navigate={navigate} />
          <AuthModal />
          <LocationModal />
          <UberRideAlert navigate={navigate} />
        </div>
      </LocationProvider>
    </AuthProvider>
  );
}

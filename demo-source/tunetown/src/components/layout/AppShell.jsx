import { Outlet } from 'react-router-dom';
import ErrorBoundary from '../feedback/ErrorBoundary';
import Footer from './Footer';
import Header from './Header';
import ToastViewport from '../feedback/ToastViewport';
import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { useSession } from '../../hooks/useSession';
import { hydrateShopping } from '../../features/shopping/shoppingSlice';
import { startLiveEvents } from '../../services/liveEvents';
import { dataSource } from '../../services/dataService';

export default function AppShell() {
  const dispatch = useDispatch();
  const { ready, signedIn } = useSession();

  useEffect(() => {
    dispatch(hydrateShopping());
  }, [dispatch]);

  useEffect(() => {
    if (!ready) return undefined;
    return startLiveEvents();
  }, [ready, signedIn]);

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      {dataSource === 'local' ? (
        <p className="data-mode-banner" role="note">
          Portfolio demo: data is kept in this browser (the full build runs on Spring Boot and PostgreSQL). Sign in
          with any email; use manager@tunetown.example to open the store admin.
        </p>
      ) : null}
      <Header />
      <main id="main-content" className="main-content" tabIndex="-1">
        <ErrorBoundary>
          <Outlet />
        </ErrorBoundary>
      </main>
      <Footer />
      <ToastViewport />
    </div>
  );
}

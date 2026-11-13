import { useCallback, useEffect, useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Header } from './components/Header';
import { LanguageProvider } from './context/LanguageContext';
import { createInitialDemoStore } from './data/demoData';
import { AdminPage } from './pages/AdminPage';
import { HomePage } from './pages/HomePage';
import { bookingService, type CatalogData } from './services/bookingService';

function AppShell() {
  const [catalog, setCatalog] = useState<CatalogData>(() => {
    const initial = createInitialDemoStore();
    return {
      settings: initial.settings,
      services: initial.services,
      masters: initial.masters,
      schedules: initial.schedules,
      timeOffs: initial.timeOffs,
    };
  });

  const refreshCatalog = useCallback(async () => {
    try {
      const next = await bookingService.getCatalog(false);
      setCatalog(next);
    } catch (err) {
      console.error('Failed to load catalog:', err);
    }
  }, []);

  useEffect(() => {
    refreshCatalog();
  }, [refreshCatalog]);

  return (
    <BrowserRouter>
      <Header salonName={catalog.settings.salon_name} />
      <Routes>
        <Route path="/" element={<HomePage catalog={catalog} />} />
        <Route
          path="/admin"
          element={<AdminPage onCatalogUpdated={refreshCatalog} />}
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export function App() {
  return (
    <LanguageProvider>
      <AppShell />
    </LanguageProvider>
  );
}

export default App;


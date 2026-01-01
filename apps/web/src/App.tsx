import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth';
import Layout from '@/components/layout/Layout';
import LoadingScreen from '@/components/common/LoadingScreen';
import OfflineBanner from '@/components/common/OfflineBanner';

// Lazy load pages for code splitting
const Dashboard = lazy(() => import('@/pages/Dashboard'));
const Animals = lazy(() => import('@/pages/Animals'));
const AddAnimal = lazy(() => import('@/pages/AddAnimal'));
const AnimalDetail = lazy(() => import('@/pages/AnimalDetail'));
const AtRisk = lazy(() => import('@/pages/AtRisk'));
const Transfers = lazy(() => import('@/pages/Transfers'));
const Import = lazy(() => import('@/pages/Import'));
const Settings = lazy(() => import('@/pages/Settings'));
const Login = lazy(() => import('@/pages/Login'));
const NotFound = lazy(() => import('@/pages/NotFound'));

// Protected route wrapper
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
}

// Public route wrapper (redirects if already logged in)
function PublicRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  
  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }
  
  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <OfflineBanner />
      <Suspense fallback={<LoadingScreen />}>
        <Routes>
          {/* Public routes */}
          <Route
            path="/login"
            element={
              <PublicRoute>
                <Login />
              </PublicRoute>
            }
          />

          {/* Protected routes with layout */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="animals" element={<Animals />} />
            <Route path="animals/new" element={<AddAnimal />} />
            <Route path="animals/:id" element={<AnimalDetail />} />
            <Route path="at-risk" element={<AtRisk />} />
            <Route path="transfers" element={<Transfers />} />
            <Route path="import" element={<Import />} />
            <Route path="settings" element={<Settings />} />
          </Route>

          {/* 404 */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

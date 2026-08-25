/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Suspense, lazy, type ReactNode } from "react";
import { FavoritesProvider } from "./context/FavoritesContext";
import { AuthProvider, useAuth } from "./context/AuthContext";
import ErrorBoundary from "./components/ErrorBoundary";
import { ToastProvider } from "./context/ToastContext";

const Layout = lazy(() => import("./components/Layout"));
const Home = lazy(() => import("./pages/Home"));
const Guides = lazy(() => import("./pages/Guides"));
const Food = lazy(() => import("./pages/Food"));
const MapPlanner = lazy(() => import("./pages/MapPlanner"));
const Compare = lazy(() => import("./pages/Compare"));
const Profile = lazy(() => import("./pages/Profile"));
const HotelDetail = lazy(() => import("./pages/HotelDetail"));
const Itinerary = lazy(() => import("./pages/Itinerary"));
const Login = lazy(() => import("./pages/Login"));
const GuideDetail = lazy(() => import("./pages/GuideDetail"));
const RouteDetail = lazy(() => import("./pages/RouteDetail"));
const NotFound = lazy(() => import("./pages/NotFound"));
const AdminSubmissions = lazy(() => import("./pages/AdminSubmissions"));

// 路由守卫：未登录访问受保护页 → 跳 /login
function Protected({ children }: { children: ReactNode }) {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <StartupShell />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function StartupShell() {
  return (
    <div className="min-h-screen bg-orange-50 dark:bg-stone-950" aria-hidden="true">
      <div className="h-16 border-b border-orange-100/80 dark:border-stone-800" />
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="h-8 w-40 rounded-lg bg-orange-100/80 dark:bg-stone-800" />
        <div className="mt-8 h-64 rounded-3xl bg-white/70 dark:bg-stone-900" />
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
    <AuthProvider>
      <FavoritesProvider>
        <BrowserRouter>
        <Suspense fallback={<StartupShell />}>
          <ErrorBoundary>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<Protected><Layout /></Protected>}>
              <Route index element={<Home />} />
              <Route path="guides" element={<Guides />} />
              <Route path="food" element={<Food />} />
              <Route path="planner" element={<MapPlanner />} />
              <Route path="plan/:id" element={<RouteDetail />} />
              <Route path="compare" element={<Compare />} />
              <Route path="hotel/:id" element={<HotelDetail />} />
              <Route path="guide/:id" element={<GuideDetail />} />
              <Route path="itinerary" element={<Itinerary />} />
              <Route path="profile" element={<Profile />} />
              <Route path="admin/submissions" element={<AdminSubmissions />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
          </ErrorBoundary>
        </Suspense>
      </BrowserRouter>
      </FavoritesProvider>
    </AuthProvider>
    </ToastProvider>
  );
}

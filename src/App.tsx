/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Suspense, lazy, type ReactNode } from "react";
import { FavoritesProvider } from "./context/FavoritesContext";
import { AuthProvider, useAuth } from "./context/AuthContext";

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

// 路由守卫：未登录访问受保护页 → 跳 /login
function Protected({ children }: { children: ReactNode }) {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <div style={{ padding: 16 }}>Loading...</div>;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <AuthProvider>
      <FavoritesProvider>
        <BrowserRouter>
        <Suspense fallback={<div style={{ padding: 16 }}>Loading...</div>}>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<Protected><Layout /></Protected>}>
              <Route index element={<Home />} />
              <Route path="guides" element={<Guides />} />
              <Route path="food" element={<Food />} />
              <Route path="planner" element={<MapPlanner />} />
              <Route path="compare" element={<Compare />} />
              <Route path="hotel/:id" element={<HotelDetail />} />
              <Route path="itinerary" element={<Itinerary />} />
              <Route path="profile" element={<Profile />} />
            </Route>
          </Routes>
        </Suspense>
      </BrowserRouter>
      </FavoritesProvider>
    </AuthProvider>
  );
}

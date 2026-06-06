/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter, Routes, Route } from "react-router-dom";
import {lazy, Suspense} from "react";

const Layout = lazy(() => import ("./components/Layout"));
const Home = lazy(() => import ("./pages/Home"));
const Guides = lazy(() => import("./pages/Guides"));
const Food = lazy(() => import ("./pages/Food"));
const MapPlanner = lazy(() => import ("./pages/MapPlanner"));
const Compare = lazy(()=>import('./pages/Compare'));
const Profile = lazy(() => import ("./pages/Profile"));
const HotelDetail = lazy(() => import("./pages/HotelDetail"));
const Auth = lazy(() => import ("./pages/Auth"));
import ProtectedRoute from "./components/ProtectedRoute";
import { FavoritesProvider } from "./context/FavoritesContext";
import { PreferencesProvider } from "./context/PreferencesContext";
import { AuthProvider } from "./context/AuthContext";

export default function App() {
  return (
    <AuthProvider>
      <FavoritesProvider>
        <PreferencesProvider>
          <BrowserRouter>
            <Suspense fallback=''>
              <Routes>
                <Route path="/" element={<Layout />}>
                  <Route index element={<Home />} />
                  <Route path="guides" element={<Guides />} />
                  <Route path="food" element={<Food />} />
                  <Route path="planner" element={<MapPlanner />} />
                  <Route path="compare" element={<Compare />} />
                  <Route path="hotel/:id" element={<HotelDetail />} />
                  <Route path="auth" element={<Auth />} />
                  <Route 
                    path="profile" 
                    element={
                      <ProtectedRoute>
                        <Profile />
                      </ProtectedRoute>
                    } 
                  />
                </Route>
              </Routes>
            </Suspense>
          </BrowserRouter>
        </PreferencesProvider>
      </FavoritesProvider>
    </AuthProvider>
  );
}

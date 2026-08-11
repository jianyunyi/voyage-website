/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Suspense, lazy } from "react";
import { FavoritesProvider } from "./context/FavoritesContext";

const Layout = lazy(() => import("./components/Layout"));
const Home = lazy(() => import("./pages/Home"));
const Guides = lazy(() => import("./pages/Guides"));
const Food = lazy(() => import("./pages/Food"));
const MapPlanner = lazy(() => import("./pages/MapPlanner"));
const Compare = lazy(() => import("./pages/Compare"));
const Profile = lazy(() => import("./pages/Profile"));
const HotelDetail = lazy(() => import("./pages/HotelDetail"));
const Itinerary = lazy(() => import("./pages/Itinerary"));

export default function App() {
  return (
    <FavoritesProvider>
      <BrowserRouter>
        <Suspense fallback={<div style={{ padding: 16 }}>Loading...</div>}>
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route index element={<Home />} />
              <Route path="guides" element={<Guides />} />
              <Route path="food" element={<Food />} />
              <Route path="planner" element={<MapPlanner />} />
              <Route path="compare" element={<Compare />} />
              <Route path="profile" element={<Profile />} />
              <Route path="hotel/:id" element={<HotelDetail />} />
              <Route path="itinerary" element={<Itinerary />} />
            </Route>
          </Routes>
        </Suspense>
      </BrowserRouter>
    </FavoritesProvider>
  );
}

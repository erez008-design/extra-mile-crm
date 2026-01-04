import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useState } from "react";
import { ThemeProvider } from "next-themes";
import { OfflineAlert } from "./components/OfflineAlert";
import Dashboard from "./pages/Dashboard";
import Auth from "./pages/Auth";
import Admin from "./pages/Admin";
import Agent from "./pages/Agent";
import Properties from "./pages/Properties";
import PropertyDetails from "./pages/PropertyDetails";
import Invite from "./pages/Invite";
import ResetPassword from "./pages/ResetPassword";
import Buyer from "./pages/Buyer";
import BuyerPropertyDetails from "./pages/BuyerPropertyDetails";
import CompareProperties from "./pages/CompareProperties";
import ManagerDashboard from "./pages/ManagerDashboard";
import Install from "./pages/Install";
import NotFound from "./pages/NotFound";
import Buyers from "./pages/Buyers";
import FollowUps from "./pages/FollowUps";
import Catalog from "./pages/Catalog";
import CatalogPropertyDetails from "./pages/CatalogPropertyDetails";

const App = () => {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
        <TooltipProvider delayDuration={0}>
          <Toaster />
          <Sonner />
          <OfflineAlert />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/admin" element={<Admin />} />
              <Route path="/agent" element={<Agent />} />
              <Route path="/properties" element={<Properties />} />
              <Route path="/property/:id" element={<PropertyDetails />} />
              <Route path="/invite/:token" element={<Invite />} />
              <Route path="/buyer/:buyerId" element={<Buyer />} />
              <Route path="/buyer/:buyerId/property/:propertyId" element={<BuyerPropertyDetails />} />
              <Route path="/compare" element={<CompareProperties />} />
              <Route path="/manager/dashboard" element={<ManagerDashboard />} />
              <Route path="/buyers" element={<Buyers />} />
              <Route path="/follow-ups" element={<FollowUps />} />
              <Route path="/catalog" element={<Catalog />} />
              <Route path="/catalog/:propertyId" element={<CatalogPropertyDetails />} />
              <Route path="/install" element={<Install />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;

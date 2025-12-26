import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
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
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
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
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

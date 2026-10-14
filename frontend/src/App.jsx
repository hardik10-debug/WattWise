
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import DashboardLayout from "./components/layout/DashboardLayout";
import Overview from "./pages/Overview";
import Consumption from "./pages/Consumption";
import Bills from "./pages/Bills";
import MeterReadings from "./pages/MeterReadings";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<DashboardLayout />}>
          <Route path="/" element={<Overview />} />
          <Route path="/consumption" element={<Consumption />} />
          <Route path="/bills" element={<Bills />} />
          <Route path="/readings" element={<MeterReadings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;

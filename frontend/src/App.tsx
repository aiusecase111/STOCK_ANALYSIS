import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import ProtectedRoute from './components/ProtectedRoute';
import Dashboard from './pages/Dashboard';
import SectorList from './pages/SectorList';
import SectorDashboard from './pages/SectorDashboard';
import StockDetailPage from './pages/StockDetail';
import AnalyzedStocks from './pages/AnalyzedStocks';
import PendingStocks from './pages/PendingStocks';
import Progress from './pages/Progress';
import ImportData from './pages/ImportData';
import QualityStocks from './pages/QualityStocks';
import Layout from './components/layout/Layout';

function Settings() {
  return (
    <Layout title="Settings" subtitle="Application preferences">
      <div style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>
        Settings coming soon.
      </div>
    </Layout>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <ProtectedRoute>
          <Routes>
            <Route path="/"            element={<Dashboard />} />
            <Route path="/sectors"     element={<SectorList />} />
            <Route path="/sectors/:id" element={<SectorDashboard />} />
            <Route path="/stocks/:id"  element={<StockDetailPage />} />
            <Route path="/analyzed"    element={<AnalyzedStocks />} />
            <Route path="/pending"     element={<PendingStocks />} />
            <Route path="/quality"     element={<QualityStocks />} />
            <Route path="/progress"    element={<Progress />} />
            <Route path="/import"      element={<ImportData />} />
            <Route path="/settings"    element={<Settings />} />
          </Routes>
        </ProtectedRoute>
      </BrowserRouter>
    </ThemeProvider>
  );
}

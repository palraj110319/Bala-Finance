import { Routes, Route } from 'react-router-dom';
import { Login } from '@/pages/Login';
import { Dashboard } from '@/pages/Dashboard';
import { FinancialRecords } from '@/pages/FinancialRecords';
import { Interest } from '@/pages/Interest';
import { Renewals } from '@/pages/Renewals';
import { Reports } from '@/pages/Reports';
import { ExcelImport } from '@/pages/ExcelImport';
import { Settings } from '@/pages/Settings';
import { ProtectedRoute } from '@/components/ProtectedRoute';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/records"
        element={
          <ProtectedRoute>
            <FinancialRecords />
          </ProtectedRoute>
        }
      />
      <Route
        path="/interest"
        element={
          <ProtectedRoute>
            <Interest />
          </ProtectedRoute>
        }
      />
      <Route
        path="/renewals"
        element={
          <ProtectedRoute>
            <Renewals />
          </ProtectedRoute>
        }
      />
      <Route
        path="/reports"
        element={
          <ProtectedRoute>
            <Reports />
          </ProtectedRoute>
        }
      />
      <Route
        path="/import"
        element={
          <ProtectedRoute>
            <ExcelImport />
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <Settings />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

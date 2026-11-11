import { BrowserRouter, Navigate, Route, Routes } from 'react-router'
import { Header } from './components/layout/Header'
import { UserManagementPage } from './features/admin/pages/UserManagementPage'
import { AccountPage } from './features/advisor/pages/AccountPage'
import { AdvisorHomePage } from './features/advisor/pages/AdvisorHomePage'
import { Client360Page } from './features/advisor/pages/Client360Page'
import { ClientListPage } from './features/advisor/pages/ClientListPage'
import { HouseholdListPage } from './features/advisor/pages/HouseholdListPage'
import { HouseholdPage } from './features/advisor/pages/HouseholdPage'
import { PortfolioPage } from './features/advisor/pages/PortfolioPage'
import { RecommendationsPage } from './features/advisor/pages/RecommendationsPage'
import { RiskDashboardPage } from './features/advisor/pages/RiskDashboardPage'
import { WizardPage } from './features/application/pages/WizardPage'
import { AuthProvider } from './features/auth/context/AuthProvider'
import { ProtectedRoute } from './features/auth/components/ProtectedRoute'
import { LoginPage } from './features/auth/pages/LoginPage'
import { RegisterPage } from './features/auth/pages/RegisterPage'
import { VerifyEmailPage } from './features/auth/pages/VerifyEmailPage'
import { ClientHomePage } from './features/client/pages/ClientHomePage'
import { HomePage } from './features/home/pages/HomePage'
import { StatusPage } from './features/submission/pages/StatusPage'
import { SummaryPage } from './features/submission/pages/SummaryPage'
import { ReviewDashboardPage } from './features/review/pages/ReviewDashboardPage'
import { ReviewDetailPage } from './features/review/pages/ReviewDetailPage'

export default function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, '') || '/'}>
      <AuthProvider>
        <Header />
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/verify-email" element={<VerifyEmailPage />} />
          <Route path="/client" element={<ProtectedRoute roles={['CLIENT']}><ClientHomePage /></ProtectedRoute>} />
          <Route path="/client/application/:id/step/:stepKey" element={<ProtectedRoute roles={['CLIENT']}><WizardPage /></ProtectedRoute>} />
          <Route path="/client/application/:id/summary" element={<ProtectedRoute roles={['CLIENT']}><SummaryPage /></ProtectedRoute>} />
          <Route path="/client/application/:id/status" element={<ProtectedRoute roles={['CLIENT']}><StatusPage /></ProtectedRoute>} />
          <Route path="/review" element={<ProtectedRoute roles={['OPS', 'COMPLIANCE', 'ADMIN']}><ReviewDashboardPage /></ProtectedRoute>} />
          <Route path="/review/applications/:id" element={<ProtectedRoute roles={['OPS', 'COMPLIANCE', 'ADMIN']}><ReviewDetailPage /></ProtectedRoute>} />
          <Route path="/advisor" element={<ProtectedRoute roles={['ADVISOR', 'ADMIN']}><AdvisorHomePage /></ProtectedRoute>} />
          <Route path="/advisor/clients" element={<ProtectedRoute roles={['ADVISOR', 'ADMIN']}><ClientListPage /></ProtectedRoute>} />
          <Route path="/advisor/clients/:id" element={<ProtectedRoute roles={['ADVISOR', 'ADMIN']}><Client360Page /></ProtectedRoute>} />
          <Route path="/advisor/clients/:id/portfolio" element={<ProtectedRoute roles={['ADVISOR', 'ADMIN']}><PortfolioPage /></ProtectedRoute>} />
          <Route path="/advisor/accounts/:id" element={<ProtectedRoute roles={['ADVISOR', 'ADMIN']}><AccountPage /></ProtectedRoute>} />
          <Route path="/advisor/recommendations" element={<ProtectedRoute roles={['ADVISOR', 'ADMIN']}><RecommendationsPage /></ProtectedRoute>} />
          <Route path="/advisor/risk" element={<ProtectedRoute roles={['ADVISOR', 'ADMIN']}><RiskDashboardPage /></ProtectedRoute>} />
          <Route path="/advisor/households" element={<ProtectedRoute roles={['ADVISOR', 'ADMIN']}><HouseholdListPage /></ProtectedRoute>} />
          <Route path="/advisor/households/:id" element={<ProtectedRoute roles={['ADVISOR', 'ADMIN']}><HouseholdPage /></ProtectedRoute>} />
          <Route path="/admin/users" element={<ProtectedRoute roles={['ADMIN']}><UserManagementPage /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

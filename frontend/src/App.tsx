import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Hospitals from './pages/Hospitals'
import HospitalDetail from './pages/HospitalDetail'
import FeedbackList from './pages/FeedbackList'
import QRCodeGenerator from './pages/QRCodeGenerator'
import Settings from './pages/Settings'
import Users from './pages/Users'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'

function App() {
  return (
    <AuthProvider>
      <Router>
        <Toaster position="top-right" toastOptions={{ duration: 3000 }} />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/hospitals" element={<ProtectedRoute><Hospitals /></ProtectedRoute>} />
          <Route path="/hospitals/:id" element={<ProtectedRoute><HospitalDetail /></ProtectedRoute>} />
          <Route path="/feedback" element={<ProtectedRoute><FeedbackList /></ProtectedRoute>} />
          <Route path="/qr-codes" element={<ProtectedRoute><QRCodeGenerator /></ProtectedRoute>} />
          <Route path="/users" element={<ProtectedRoute><Users /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  )
}

export default App

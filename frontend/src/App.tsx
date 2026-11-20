import { BrowserRouter, Routes, Route } from 'react-router-dom'
import HomePage from './pages/HomePage'
import SetupPage from './pages/SetupPage'
import DebatePage from './pages/DebatePage'
import HistoryPage from './pages/HistoryPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/setup" element={<SetupPage />} />
        <Route path="/debate/:sessionId" element={<DebatePage />} />
        <Route path="/history" element={<HistoryPage />} />
      </Routes>
    </BrowserRouter>
  )
}

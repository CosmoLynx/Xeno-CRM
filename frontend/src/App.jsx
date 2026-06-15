import { Route, Routes } from 'react-router-dom'
import Navbar from './components/Navbar'
import CampaignAnalytics from './pages/CampaignAnalytics'
import CampaignDetail from './pages/CampaignDetail'
import Campaigns from './pages/Campaigns'
import Customers from './pages/Customers'
import Dashboard from './pages/Dashboard'
import Segments from './pages/Segments'

export default function App() {
  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <main className="mx-auto max-w-7xl px-6 py-8">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/customers" element={<Customers />} />
          <Route path="/segments" element={<Segments />} />
          <Route path="/campaigns/analytics" element={<CampaignAnalytics />} />
          <Route path="/campaigns" element={<Campaigns />} />
          <Route path="/campaigns/:id" element={<CampaignDetail />} />
        </Routes>
      </main>
    </div>
  )
}

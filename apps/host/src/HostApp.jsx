import { Routes, Route } from 'react-router-dom';
import HostNavbar from './components/HostNavbar.jsx';
import HostHome from './pages/HostHome.jsx';
import AdminDashboard from './pages/AdminDashboard.jsx';
import ResultsWindow from './pages/ResultsWindow.jsx';

export default function HostApp() {
  return (
    <div className="flex min-h-screen flex-col">
      <HostNavbar />
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 pb-12 pt-6 sm:px-6">
        <Routes>
          <Route path="/" element={<HostHome />} />
          <Route path="/admin/:roomCode" element={<AdminDashboard />} />
          <Route path="/admin/:roomCode/results" element={<ResultsWindow />} />
        </Routes>
      </main>
    </div>
  );
}

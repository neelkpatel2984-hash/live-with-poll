import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import AdminDashboard from './pages/AdminDashboard';
import UserRoom from './pages/UserRoom';

export default function App() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 pb-12 pt-6 sm:px-6">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/admin/:roomCode" element={<AdminDashboard />} />
          <Route path="/room/:roomCode" element={<UserRoom />} />
        </Routes>
      </main>
    </div>
  );
}

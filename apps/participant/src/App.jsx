import { Routes, Route } from 'react-router-dom';
import ParticipantNavbar from './components/ParticipantNavbar.jsx';
import Home from './pages/Home.jsx';
import UserRoom from './pages/UserRoom.jsx';

export default function App() {
  return (
    <div className="flex min-h-screen flex-col">
      <ParticipantNavbar />
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 pb-12 pt-6 sm:px-6">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/room/:roomCode" element={<UserRoom />} />
        </Routes>
      </main>
    </div>
  );
}

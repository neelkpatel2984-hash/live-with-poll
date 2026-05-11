import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import { ThemeProvider } from '@shared/context/ThemeContext.jsx';
import HostApp from './HostApp.jsx';
import '@shared/index.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <HashRouter>
      <ThemeProvider>
        <HostApp />
      </ThemeProvider>
    </HashRouter>
  </StrictMode>
);

import { useState } from 'react';
import Sidebar from './components/Sidebar';
import DashboardPage from './pages/DashboardPage';
import ReaderPage from './pages/ReaderPage';
import ReadingsPage from './pages/ReadingsPage';
import TagsPage from './pages/TagsPage';
import ExcelPage from './pages/ExcelPage';
import MatchesPage from './pages/MatchesPage';
import SettingsPage from './pages/SettingsPage';
import RFIDMatchNotification from './components/RFIDMatchNotification';
import { NotificationProvider } from './contexts/NotificationContext';
import { ExcelProvider } from './contexts/ExcelContext';
import { RFIDMatchesProvider } from './contexts/RFIDMatchesContext';
import './App.css';

function App() {
  const [currentPage, setCurrentPage] = useState('dashboard');

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <DashboardPage onNavigate={setCurrentPage} />;
      case 'reader':
        return <ReaderPage />;
      case 'readings':
        return <ReadingsPage />;
      case 'tags':
        return <TagsPage />;
      case 'excel':
        return <ExcelPage />;
      case 'matches':
        return <MatchesPage />;
      case 'settings':
        return <SettingsPage />;
      default:
        return <DashboardPage onNavigate={setCurrentPage} />;
    }
  };

  return (
    <NotificationProvider>
      <ExcelProvider>
        <RFIDMatchesProvider>
          <div className="flex h-screen bg-gray-50">
            <Sidebar currentPage={currentPage} onPageChange={setCurrentPage} />
            <main className="flex-1 overflow-y-auto">
              {renderPage()}
            </main>
            <RFIDMatchNotification />
          </div>
        </RFIDMatchesProvider>
      </ExcelProvider>
    </NotificationProvider>
  );
}

export default App;

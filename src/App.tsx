import { useState } from 'react';
import Navigation from './components/Navigation';
import DashboardPage from './pages/DashboardPage';
import ExcelPage from './pages/ExcelPage';
import MatchesPage from './pages/MatchesPage';
import RFIDMatchNotification from './components/RFIDMatchNotification';
import { NotificationProvider } from './contexts/NotificationContext';
import './App.css';

function App() {
  const [currentPage, setCurrentPage] = useState('dashboard');

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <DashboardPage />;
      case 'excel':
        return <ExcelPage />;
      case 'matches':
        return <MatchesPage />;
      default:
        return <DashboardPage />;
    }
  };

  return (
    <NotificationProvider>
      <div className="App">
        <Navigation currentPage={currentPage} onPageChange={setCurrentPage} />
        <main>
          {renderPage()}
        </main>
        <RFIDMatchNotification />
      </div>
    </NotificationProvider>
  );
}

export default App;

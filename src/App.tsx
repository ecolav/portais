import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import RFIDMatchNotification from './components/RFIDMatchNotification';
import { NotificationProvider } from './contexts/NotificationContext';
import './App.css';

function App() {
  return (
    <NotificationProvider>
      <Router>
        <div className="App">
          <Header />
          <main>
            <Routes>
              <Route path="/" element={<Dashboard />} />
            </Routes>
          </main>
          <RFIDMatchNotification />
        </div>
      </Router>
    </NotificationProvider>
  );
}

export default App;

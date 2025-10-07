import { 
  Home, 
  FileSpreadsheet, 
  CheckCircle, 
  
} from 'lucide-react';

interface NavigationProps {
  currentPage: string;
  onPageChange: (page: string) => void;
}

const Navigation: React.FC<NavigationProps> = ({ currentPage, onPageChange }) => {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Home },
    { id: 'excel', label: 'Planilha Excel', icon: FileSpreadsheet },
    { id: 'matches', label: 'Correspondências', icon: CheckCircle }
  ];

  return (
    <nav className="bg-white border-b">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <img 
              src="/ecolav.jpg" 
              alt="Logo" 
              className="w-8 h-8 rounded"
            />
            <h1 className="text-lg font-semibold text-gray-900">Portal Ecolav</h1>
          </div>

          {/* Menu */}
          <div className="flex gap-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentPage === item.id;
              
              return (
                <button
                  key={item.id}
                  onClick={() => onPageChange(item.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded text-sm font-medium transition ${
                    isActive
                      ? 'bg-primary-600 text-white'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;

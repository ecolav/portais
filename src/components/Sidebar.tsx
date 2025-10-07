import { Home, Radio, List, Tags, FileSpreadsheet, CheckCircle, Settings } from 'lucide-react';

interface SidebarProps {
  currentPage: string;
  onPageChange: (page: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentPage, onPageChange }) => {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Home, section: 'main' },
    { id: 'reader', label: 'Leitor RFID', icon: Radio, section: 'main' },
    { id: 'readings', label: 'Leituras', icon: List, section: 'data' },
    { id: 'tags', label: 'Tags Únicas', icon: Tags, section: 'data' },
    { id: 'excel', label: 'Planilha', icon: FileSpreadsheet, section: 'data' },
    { id: 'matches', label: 'Correspondências', icon: CheckCircle, section: 'data' },
    { id: 'settings', label: 'Configurações', icon: Settings, section: 'system' }
  ];

  const sections = [
    { id: 'main', label: 'Principal' },
    { id: 'data', label: 'Dados' },
    { id: 'system', label: 'Sistema' }
  ];

  return (
    <aside className="w-64 bg-white border-r min-h-screen flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b">
        <div className="flex items-center gap-3">
          <img src="/ecolav.jpg" alt="Logo" className="w-10 h-10 rounded" />
          <div>
            <h1 className="font-bold text-gray-900">Portal Ecolav</h1>
            <p className="text-xs text-gray-500">Sistema RFID</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-6">
        {sections.map((section) => (
          <div key={section.id}>
            <h3 className="text-xs font-semibold text-gray-400 uppercase mb-2 px-3">
              {section.label}
            </h3>
            <div className="space-y-1">
              {menuItems
                .filter(item => item.section === section.id)
                .map((item) => {
                  const Icon = item.icon;
                  const isActive = currentPage === item.id;
                  
                  return (
                    <button
                      key={item.id}
                      onClick={() => onPageChange(item.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition ${
                        isActive
                          ? 'bg-primary-50 text-primary-600'
                          : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      {item.label}
                    </button>
                  );
                })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t">
        <p className="text-xs text-gray-500 text-center">
          Portal RFID v1.0
        </p>
      </div>
    </aside>
  );
};

export default Sidebar;


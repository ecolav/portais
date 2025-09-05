
interface PageHeaderProps {
  title: string;
  subtitle?: string;
}

const PageHeader: React.FC<PageHeaderProps> = ({ title, subtitle }) => {
  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <div className="flex items-center gap-4">
        {/* Logo */}
        <div className="w-12 h-12 rounded-lg overflow-hidden shadow-md">
          <img 
            src="/ecolav.jpg" 
            alt="Logo Ecolav" 
            className="w-full h-full object-cover"
          />
        </div>
        
        {/* Título e Subtítulo */}
        <div>
          <h1 className="text-2xl font-bold text-gray-800">{title}</h1>
          {subtitle && (
            <p className="text-gray-600 mt-1">{subtitle}</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default PageHeader;

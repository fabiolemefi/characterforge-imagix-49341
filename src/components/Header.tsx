import { useState } from "react";
import { HelpCircle, MessageSquare, BookOpen, GraduationCap, Plus } from "lucide-react";
const Header = () => {
  const [helpMenuOpen, setHelpMenuOpen] = useState(false);
  return <div className="h-16 flex items-center justify-end px-6 border-b border-gray-800">
      <div className="flex items-center gap-4 relative">
        {/* YouTube icon */}
        <a href="#" className="flex items-center justify-center w-10 h-10 text-gray-400 hover:text-white transition-colors rounded-md hover:bg-gray-800">
          <img src="/lovable-uploads/739ab3ed-442e-42fb-9219-25ee697b73ba.png" alt="YouTube" className="w-6 h-6" />
        </a>
        
        {/* Discord icon */}
        <a href="#" className="flex items-center justify-center w-10 h-10 text-gray-400 hover:text-white transition-colors rounded-md hover:bg-gray-800">
          <img src="/lovable-uploads/92333427-5a32-4cf8-b110-afc5b57c9f27.png" alt="Discord" className="w-6 h-6" />
        </a>
        
        {/* Help icon with dropdown */}
        <div className="relative">
          <button className="flex items-center justify-center w-10 h-10 text-gray-400 hover:text-white transition-colors rounded-md hover:bg-gray-800" onClick={() => setHelpMenuOpen(!helpMenuOpen)}>
            <HelpCircle size={20} />
          </button>
          
          {helpMenuOpen && <div className="absolute right-0 mt-2 w-48 bg-[#1e1e1e] border border-gray-800 rounded-md shadow-lg py-1 z-50">
              <a href="#" className="flex items-center gap-2 px-4 py-2 text-sm text-gray-300 hover:bg-gray-800">
                <MessageSquare size={16} />
                <span>Feedback</span>
              </a>
              <a href="#" className="flex items-center gap-2 px-4 py-2 text-sm text-gray-300 hover:bg-gray-800">
                <HelpCircle size={16} />
                <span>Help Center</span>
              </a>
              <a href="#" className="flex items-center gap-2 px-4 py-2 text-sm text-gray-300 hover:bg-gray-800">
                <BookOpen size={16} />
                <span>Tutorials</span>
              </a>
              <a href="#" className="flex items-center gap-2 px-4 py-2 text-sm text-gray-300 hover:bg-gray-800">
                <GraduationCap size={16} />
                <span>Wiki</span>
              </a>
            </div>}
        </div>
        
        {/* Upgrade button */}
        <button className="px-4 py-1.5 text-gray-300 text-sm border border-gray-700 rounded-md hover:bg-gray-800 transition-colors">
          Upgrade
        </button>
        
        {/* Create button */}
        <button className="transition-colors text-white flex items-center gap-1 rounded-md px-4 py-1.5 text-sm font-medium bg-blue-700 hover:bg-blue-600">
          <Plus size={16} />
          Create
        </button>
        
        {/* Sign In button */}
        <button className="px-4 py-1.5 text-gray-300 text-sm border border-gray-700 rounded-md hover:bg-gray-800 transition-colors">
          Sign In
        </button>
      </div>
    </div>;
};
export default Header;
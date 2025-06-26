'use client';

import { useState } from 'react';
import { Sidebar } from '@/components/main-components/Sidebar';
import { TextInput } from '@/components/main-components/TextInput';

export default function Home() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  return (
    <div className="h-screen z-0 relative">
      <Sidebar isOpen={isSidebarOpen} onToggle={toggleSidebar} />
      
      {/* Main content area */}
      <div className="h-full flex items-center justify-center px-4">
        <TextInput 
          title="AI Developer Assistant"
          placeholder="Describe your coding task or project..."
          className="w-full max-w-4xl"
        />
      </div>
    </div>
  );
}

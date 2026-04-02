import React, { useState } from 'react';
import { Link, useLocation } from 'react-router';
import { BookOpen, LayoutDashboard, ArrowLeftRight, Library, Menu, X } from 'lucide-react';
import { cn } from '@/src/lib/utils';

export const Layout = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const navigation = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Data Buku', href: '/books', icon: BookOpen },
    { name: 'Sirkulasi (Masuk/Keluar)', href: '/transactions', icon: ArrowLeftRight },
  ];

  const closeSidebar = () => setIsSidebarOpen(false);

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Mobile sidebar backdrop */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={closeSidebar}
        />
      )}

      {/* Sidebar */}
      <div className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 flex flex-col transform transition-transform duration-200 ease-in-out md:relative md:translate-x-0",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="h-16 flex items-center justify-between px-6 border-b border-gray-200">
          <div className="flex items-center">
            <Library className="h-6 w-6 text-blue-600 mr-2" />
            <span className="text-lg font-bold text-gray-900">SoCS Library</span>
          </div>
          <button 
            className="md:hidden text-gray-500 hover:text-gray-700"
            onClick={closeSidebar}
          >
            <X className="h-6 w-6" />
          </button>
        </div>
        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href || (item.href !== '/' && location.pathname.startsWith(item.href));
            return (
              <Link
                key={item.name}
                to={item.href}
                onClick={closeSidebar}
                className={cn(
                  "group flex items-center px-2 py-2 text-sm font-medium rounded-md",
                  isActive
                    ? "bg-blue-50 text-blue-700"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                )}
              >
                <item.icon
                  className={cn(
                    "mr-3 flex-shrink-0 h-5 w-5",
                    isActive ? "text-blue-700" : "text-gray-400 group-hover:text-gray-500"
                  )}
                  aria-hidden="true"
                />
                {item.name}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-16 bg-white border-b border-gray-200 flex items-center px-4 sm:px-8">
          <button
            className="mr-4 text-gray-500 hover:text-gray-700 md:hidden"
            onClick={() => setIsSidebarOpen(true)}
          >
            <Menu className="h-6 w-6" />
          </button>
          <h1 className="text-xl font-semibold text-gray-900 truncate">
            {navigation.find(n => location.pathname === n.href || (n.href !== '/' && location.pathname.startsWith(n.href)))?.name || 'Campus Digital Library'}
          </h1>
        </header>
        <main className="flex-1 overflow-auto p-4 sm:p-8">
          {children}
        </main>
      </div>
    </div>
  );
};

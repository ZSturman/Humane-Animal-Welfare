import { Outlet } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import Sidebar from './Sidebar';
import MobileNav from './MobileNav';
import Header from './Header';

export default function Layout() {
  return (
    <>
      <Helmet>
        <title>Shelter Link</title>
      </Helmet>
      
      <div className="min-h-screen bg-slate-50">
        {/* Desktop sidebar */}
        <Sidebar />
        
        {/* Main content area */}
        <div className="lg:pl-64">
          <Header />
          
          <main className="py-6 px-4 sm:px-6 lg:px-8 pb-20 lg:pb-6">
            <Outlet />
          </main>
        </div>
        
        {/* Mobile bottom navigation */}
        <MobileNav />
      </div>
    </>
  );
}

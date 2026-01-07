import React from 'react';
import Header from '../components/common/Header';
import Footer from '../components/common/Footer';

const MainLayout = ({ children }) => {
    return (
        <div className="min-h-screen flex flex-col font-sans text-slate-100 selection:bg-secondary-500 selection:text-white">
            <Header />

            {/* Main Content Spacer for Fixed Header */}
            <div className="h-20"></div>

            {/* Main Content */}
            <main className="flex-grow relative z-10 w-full">
                {children}
            </main>

            <Footer />
        </div>
    );
};

export default MainLayout;

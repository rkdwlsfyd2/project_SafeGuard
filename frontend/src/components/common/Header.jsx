import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const Header = () => {
    const location = useLocation();
    const isActive = (path) => location.pathname === path;

    return (
        <header className="fixed top-0 w-full z-50 glass border-b-0 transition-all duration-300">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-20 items-center">
                    {/* Logo */}
                    <div className="flex-shrink-0 flex items-center">
                        <Link to="/" className="flex items-center gap-3 group">
                            <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-xl flex items-center justify-center shadow-lg shadow-primary-500/30 transform group-hover:rotate-12 transition-transform duration-300">
                                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>
                            </div>
                            <span className="text-2xl font-extrabold font-display bg-clip-text text-transparent bg-gradient-to-r from-primary-600 via-secondary-500 to-primary-600 animate-gradient-x">
                                모두의 민원
                            </span>
                        </Link>
                    </div>

                    {/* Desktop Navigation */}
                    <nav className="hidden md:flex space-x-1">
                        {[
                            { name: 'AI 자동 신고', path: '/apply-image' },
                            { name: '민원 목록', path: '/list' },
                            { name: '현황 지도', path: '/map' },
                            { name: '소개', path: '/about' }
                        ].map((item) => (
                            <Link
                                key={item.path}
                                to={item.path}
                                className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 relative group ${isActive(item.path)
                                        ? 'text-primary-700 bg-primary-50'
                                        : 'text-slate-600 hover:text-primary-600 hover:bg-primary-50/50'
                                    }`}
                            >
                                <span className="relative z-10">{item.name}</span>
                                {isActive(item.path) && (
                                    <div className="absolute inset-0 bg-primary-100/50 rounded-full -z-0"></div>
                                )}
                            </Link>
                        ))}
                    </nav>

                    {/* Auth Links */}
                    <div className="flex items-center space-x-4">
                        <Link to="/login" className="text-slate-500 hover:text-primary-600 font-medium text-sm transition-colors">
                            로그인
                        </Link>
                        <Link to="/register" className="bg-gradient-to-r from-primary-600 to-secondary-600 hover:from-primary-500 hover:to-secondary-500 text-white text-sm font-bold py-2.5 px-6 rounded-full shadow-lg shadow-primary-500/30 hover:shadow-primary-500/50 transition-all transform hover:-translate-y-0.5">
                            회원가입
                        </Link>
                    </div>
                </div>
            </div>
        </header>
    );
};

export default Header;

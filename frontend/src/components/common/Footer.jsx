import React from 'react';
import { Link } from 'react-router-dom';

const Footer = () => {
    return (
        <footer className="relative z-10 bg-slate-900/90 backdrop-blur-xl border-t border-white/5 pt-16 pb-8 text-slate-300">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
                <div className="col-span-1 md:col-span-2">
                    <span className="text-2xl font-bold font-display bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400 mb-6 block">모두의 민원</span>
                    <p className="text-slate-400 leading-relaxed max-w-sm">
                        최첨단 AI 기술로 도시를 더 깨끗하고 안전하게.<br />
                        시민과 함께 만드는 스마트한 내일.
                    </p>
                </div>
                <div>
                    <h4 className="text-sm font-bold uppercase tracking-widest text-primary-400 mb-6">Service</h4>
                    <ul className="space-y-4">
                        <li><Link to="/apply-image" className="hover:text-white transition-colors flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-secondary-500"></div>자동 신고</Link></li>
                        <li><Link to="/map" className="hover:text-white transition-colors flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-secondary-500"></div>현황 지도</Link></li>
                    </ul>
                </div>
                <div>
                    <h4 className="text-sm font-bold uppercase tracking-widest text-primary-400 mb-6">Contact</h4>
                    <ul className="space-y-4 text-sm">
                        <li className="flex items-center gap-2">
                            <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
                            help@modu-minwon.kr
                        </li>
                        <li className="flex items-center gap-2">
                            <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path></svg>
                            02-1234-5678
                        </li>
                    </ul>
                </div>
            </div>
            <div className="border-t border-white/5 pt-8 text-center text-sm text-slate-500">
                <p>&copy; {new Date().getFullYear()} Team SafeGuard. All rights reserved.</p>
            </div>
        </footer>
    );
};

export default Footer;

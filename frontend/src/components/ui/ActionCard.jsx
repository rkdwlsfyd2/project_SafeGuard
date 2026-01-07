import React from 'react';

const ActionCard = ({ title, description, icon, onClick, variant = 'default', children }) => {
    const isPrimary = variant === 'primary';

    return (
        <div
            onClick={onClick}
            className={`
        group relative rounded-3xl p-8 shadow-xl transition-all duration-300 transform hover:-translate-y-2 cursor-pointer
        ${isPrimary
                    ? 'bg-gradient-to-br from-primary-600 to-secondary-700 shadow-primary-900/20 hover:shadow-primary-900/40 border border-white/10 text-white'
                    : 'bg-white hover:shadow-2xl transition-all border border-slate-100'
                }
        ${variant === 'default' ? 'hover:shadow-primary-500/20' : ''}
        ${variant === 'voice' ? 'hover:shadow-secondary-500/20' : ''}
      `}
        >
            {/* Hover decoration for non-primary cards */}
            {!isPrimary && (
                <div className={`absolute top-0 left-0 w-full h-2 bg-gradient-to-r transform origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-300 ${variant === 'voice' ? 'from-secondary-400 to-secondary-600' : 'from-primary-400 to-primary-600'
                    }`}></div>
            )}

            {/* Background decoration for primary card */}
            {isPrimary && (
                <div className="absolute top-0 right-0 p-4 opacity-50">
                    <svg className="w-24 h-24 text-white opacity-10" fill="currentColor" viewBox="0 0 24 24"><path d="M4 5a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V7a2 2 0 00-2-2H4zm0 2h16v10H4V7zm2 2a2 2 0 110 4 2 2 0 010-4zm12 8l-4-5-4 5H6l6-7 6 7h-2z"></path></svg>
                </div>
            )}

            {/* Icon */}
            <div className={`
        w-16 h-16 rounded-2xl flex items-center justify-center mb-6 transition-all duration-300
        ${isPrimary
                    ? 'bg-white/20 backdrop-blur-sm group-hover:scale-110'
                    : `bg-${variant === 'voice' ? 'secondary' : 'primary'}-50 group-hover:bg-${variant === 'voice' ? 'secondary' : 'primary'}-500`
                }
      `}>
                {React.cloneElement(icon, {
                    className: `w-8 h-8 transition-colors ${isPrimary
                            ? 'text-white'
                            : `text-${variant === 'voice' ? 'secondary' : 'primary'}-600 group-hover:text-white`
                        }`
                })}
            </div>

            <h3 className={`text-2xl font-bold mb-3 ${!isPrimary ? 'text-slate-800' : ''} ${!isPrimary && variant === 'voice' ? 'group-hover:text-secondary-700' :
                    !isPrimary ? 'group-hover:text-primary-700' : ''
                } transition-colors`}>
                {title}
            </h3>

            <p className={`text-sm ${isPrimary ? 'text-primary-100' : 'text-slate-500'}`}>
                {description}
            </p>

            {/* Footer/Link for primary card */}
            {isPrimary && (
                <div className="mt-6 flex items-center text-sm font-bold text-white/90 group-hover:translate-x-1 transition-transform">
                    바로가기 <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8l4 4m0 0l-4 4m4-4H3"></path></svg>
                </div>
            )}
        </div>
    );
};

export default ActionCard;

import React from 'react';
import { ArrowUp, ArrowDown } from 'lucide-react';

// “민원 건수, 처리율, 증가/감소율” 같은 핵심 지표를 카드 형태로 보여주는 UI 컴포넌트입니다.

const CardDataStats = ({ title, total, rate, levelUp, children }) => {
    return (
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700">
                {children}
            </div>

            <div className="mt-4 flex items-end justify-between">
                <div>
                    <h4 className="text-2xl font-bold text-gray-900 dark:text-white">
                        {total}
                    </h4>
                    <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        {title}
                    </span>
                </div>

                <span
                    className={`flex items-center gap-1 text-sm font-medium ${levelUp ? 'text-green-500' : 'text-red-500'
                        }`}
                >
                    {rate}
                    {levelUp ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
                </span>
            </div>
        </div>
    );
};

export default CardDataStats;
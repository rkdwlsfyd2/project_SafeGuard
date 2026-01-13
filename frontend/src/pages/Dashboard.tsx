import React, { useState, useEffect } from 'react';
import {
    Download
} from 'lucide-react';
import { complaintsAPI } from '../utils/api';
import ComplaintTrendChart from '../components/Charts/ComplaintTrendChart';
import ComplaintCategoryChart from '../components/Charts/ComplaintCategoryChart';




// --- Mock Data ---
const MOCK_KEYWORDS = [
    { id: 1, text: '불법주차 신고', rank: 1, count: 1450, change: 120, changeType: 'up' },
    { id: 2, text: '친환경차 충전구역', rank: 2, count: 980, change: 45, changeType: 'up' },
    { id: 3, text: '충전구역 불법주차', rank: 3, count: 850, change: -12, changeType: 'down' },
    { id: 4, text: '사업 정상화', rank: 4, count: 720, change: 0, changeType: 'same' },
    { id: 5, text: '위례신사선 장기', rank: 5, count: 650, change: 15, changeType: 'up' },
    { id: 6, text: '주무 부처', rank: 6, count: 540, change: -5, changeType: 'down' },
    { id: 7, text: '핵심 교통망', rank: 7, count: 430, change: 8, changeType: 'up' },
    { id: 8, text: '사업촉진 관계기관', rank: 8, count: 320, change: 0, changeType: 'same' },
    { id: 9, text: '광역교통개선대책', rank: 9, count: 210, change: -20, changeType: 'down' },
    { id: 10, text: '변경사항 통보', rank: 10, count: 150, change: 5, changeType: 'up' },
];

const WORD_CLOUD_TAGS = [
    { text: '불법주차 신고', size: 60, color: '#ef4444' },
    { text: '불법 주정차', size: 55, color: '#ef4444' },
    { text: '주정차 신고', size: 45, color: '#f97316' },
    { text: '장애인 전용구역', size: 30, color: '#84cc16' },
    { text: '인도 불법', size: 28, color: '#06b6d4' },
    { text: '친환경차 충전구역', size: 35, color: '#10b981' },
    { text: '전용구역 불법주차', size: 40, color: '#3b82f6' },
    { text: '공사 소음', size: 25, color: '#8b5cf6' },
    { text: '도로 파손', size: 32, color: '#6366f1' },
    { text: '쓰레기 무단투기', size: 24, color: '#ec4899' },
];

const Dashboard = () => {
    const [stats, setStats] = useState({ total: 90, processing: 30, completed: 20 });

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const data = await complaintsAPI.getStats();
                if (data && data.total) setStats(data);
            } catch (error) {
                console.error('Failed to fetch stats, using fallback:', error);
            }
        };
        fetchStats();
    }, []);

    const [selectedCategory, setSelectedCategory] = useState('교통');

    const received = stats.total - (stats.processing + stats.completed);

    return (
        <div className="dash-page">
            <style>{`
            .dash-page { min-height: 100vh; background: #f3f4f6; overflow: auto; }
            .dash-container { width: 100%; max-width: 1600px; margin: 0 auto; padding: 32px; }
            .dash-header { display:flex; justify-content:space-between; align-items:center; margin-bottom: 32px; padding-bottom: 16px; border-bottom: 1px solid #e5e7eb; }
            .dash-title { font-size: 24px; font-weight: 800; color:#1f2937; }
            .dash-actions { display:flex; gap: 8px; }
            .dash-btn { padding: 6px 12px; border: 1px solid #d1d5db; border-radius: 8px; background:#fff; font-size: 13px; cursor:pointer; }
            .dash-btn:hover { background:#f9fafb; }
            .dash-kpi-grid { display:grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 16px; margin-bottom: 32px; }
            .dash-kpi-card { border-radius: 12px; box-shadow: 0 1px 2px rgba(0,0,0,0.06); height: 112px; display:flex; flex-direction:column; align-items:center; justify-content:center; border: 1px solid #e5e7eb; border-top-width: 4px; }
            .dash-kpi-title { color:#6b7280; font-weight: 800; margin-bottom: 8px; }
            .dash-kpi-value { font-size: 32px; font-weight: 900; }

            .dash-main { display:grid; grid-template-columns: repeat(12, minmax(0, 1fr)); gap: 24px; margin-bottom: 32px; }
            .dash-left { grid-column: span 5 / span 5; display:flex; flex-direction:column; gap: 24px; }
            .dash-right { grid-column: span 7 / span 7; }

            .dash-card { background:#fff; border: 1px solid #cbd5e1; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); }
            .dash-card-pad-4 { padding: 16px; }
            .dash-card-pad-6 { padding: 24px; }
            .dash-card-title { font-weight: 800; color:#374151; }

            .dash-bottom { display:grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 24px; }

            @media (max-width: 1024px) {
              .dash-right { grid-column: span 12 / span 12; }
              .dash-bottom { grid-template-columns: 1fr; }
            }
            /* Custom Scrollbar */
            .custom-scrollbar::-webkit-scrollbar { width: 6px; }
            .custom-scrollbar::-webkit-scrollbar-track { background: #f1f1f1; border-radius: 4px; }
            .custom-scrollbar::-webkit-scrollbar-thumb { background: #d1d5db; border-radius: 4px; }
            .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #9ca3af; }
          `}</style>
            <div className="dash-container">
                {/* 상단 타이틀 및 필터 */}
                <div className="dash-header">
                    <h1 className="dash-title">관리자 대시보드</h1>
                </div>

                {/* 나의 민원 현황 (KPI Cards) */}
                <section style={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #E2E8F0',
                    borderRadius: '12px',
                    padding: '32px',
                    marginBottom: '40px',
                    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                    position: 'relative',
                    overflow: 'hidden'
                }}>
                    <div style={{
                        position: 'absolute', top: 0, left: 0, right: 0, height: '6px',
                        background: 'linear-gradient(90deg, #A0C4FF 0%, #B2F2BB 50%, #FFB1B1 100%)'
                    }} />

                    <h3 style={{ marginBottom: '28px', color: '#1e293b', fontWeight: '900', fontSize: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ width: '4px', height: '20px', backgroundColor: '#3B82F6', borderRadius: '2px' }}></span>
                        민원 처리 현황
                    </h3>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px' }}>
                        {[
                            { label: '전 체', count: stats.total, color: '#F1F5F9', textColor: '#334155' },
                            { label: '접 수', count: received, color: '#EFF6FF', textColor: '#2563EB' },
                            { label: '처리중', count: stats.processing, color: '#FEF2F2', textColor: '#EF4444' },
                            { label: '처리완료', count: stats.completed, color: '#F0FDF4', textColor: '#16A34A' }
                        ].map((stat, idx) => (
                            <div key={idx} style={{
                                backgroundColor: stat.color,
                                padding: '30px',
                                borderRadius: '12px',
                                textAlign: 'center',
                                border: '1px solid #E2E8F0',
                                transition: 'all 0.2s ease'
                            }}>
                                <div style={{ fontSize: '1.2rem', marginBottom: '10px', fontWeight: '600', color: '#64748B' }}>{stat.label}</div>
                                <div style={{ fontSize: '2.5rem', fontWeight: '800', color: stat.textColor }}>{stat.count}</div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* 2. Main Content Grid (Boxed Layout) */}
                <div className="bg-slate-50/50 p-6 rounded-2xl border border-slate-200 shadow-inner mb-8">
                    <div className="dash-main !mb-0">
                        {/* Left: Donut Chart -> Replaced with ChartTwo */}
                        <div className="dash-left">
                            <ComplaintCategoryChart selectedCategory={selectedCategory} onSelect={setSelectedCategory} />
                        </div>

                        {/* Right: Trend Chart -> Replaced with ChartOne */}
                        <div className="dash-right">
                            <ComplaintTrendChart selectedCategory={selectedCategory} />
                        </div>
                    </div>
                </div>

                {/* 3. Bottom Grid: Keywords & Word Cloud */}
                <div className="dash-bottom" style={{ marginBottom: '40px' }}>
                    {/* Surging Keyword - Integrated Design */}
                    <div className="dash-card shadow-2xl" style={{ height: 680, display: 'flex', flexDirection: 'column', border: '1px solid #E2E8F0', borderRadius: '12px', overflow: 'hidden', backgroundColor: 'white' }}>
                        {/* Integrated Header Block */}
                        <div style={{ backgroundColor: 'white', borderBottom: 'none', flexShrink: 0 }}>
                            <div className="flex justify-between items-center" style={{ padding: '24px 32px 16px 32px' }}>
                                <h3 className="font-bold text-gray-800 flex items-center gap-3">
                                    <span style={{ fontSize: '20px', fontWeight: '950', letterSpacing: '-0.03em' }}>급증 키워드 분석</span>
                                    <span style={{ fontSize: '12px', color: '#94A3B8', fontWeight: '600', marginLeft: '4px' }}>2026.01.12 12:00</span>
                                </h3>
                                <div className="flex items-center gap-2">
                                    <span className="flex h-2 w-2 rounded-full bg-blue-600 animate-pulse"></span>

                                </div>
                            </div>

                            {/* Table Header integrated into Header Block */}
                            <div style={{ padding: '0 32px 12px 32px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.03)', borderRadius: '12px', padding: '12px 0' }}>
                                    <div style={{ width: '70px', textAlign: 'center', fontSize: '11px', fontWeight: '900', color: '#64748B', textTransform: 'uppercase' }}>Rank</div>
                                    <div style={{ flex: 1, textAlign: 'left', fontSize: '11px', fontWeight: '900', color: '#64748B', textTransform: 'uppercase', paddingLeft: '8px' }}>주요 키워드</div>
                                    <div style={{ width: '100px', textAlign: 'right', fontSize: '11px', fontWeight: '900', color: '#64748B', textTransform: 'uppercase' }}>신청량</div>
                                    <div style={{ width: '90px', textAlign: 'center', fontSize: '11px', fontWeight: '900', color: '#64748B', textTransform: 'uppercase' }}>변동 추이</div>
                                </div>
                            </div>
                        </div>

                        <div className="overflow-y-auto custom-scrollbar flex-1" style={{ padding: '0 32px 24px 32px' }}>
                            <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 4px' }}>
                                <tbody>
                                    {MOCK_KEYWORDS.map((item, index) => (
                                        <tr key={item.id} className="transition-all hover:bg-slate-50 cursor-default group">
                                            <td style={{ width: '60px', padding: '10px 0', textAlign: 'center' }}>
                                                <div style={{
                                                    margin: '0 auto', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '8px', fontSize: '14px', fontWeight: '950',
                                                    backgroundColor: item.rank <= 3 ? '#3B82F6' : '#F1F5F9',
                                                    color: item.rank <= 3 ? 'white' : '#64748B',
                                                    boxShadow: item.rank <= 3 ? '0 4px 8px rgba(59, 130, 246, 0.2)' : 'none'
                                                }}>
                                                    {item.rank}
                                                </div>
                                            </td>
                                            <td style={{ padding: '10px 8px', fontSize: '15px', fontWeight: '850', color: '#1E293B' }}>
                                                <span className="group-hover:text-blue-600 transition-colors">{item.text}</span>
                                            </td>
                                            <td style={{ width: '90px', padding: '10px 0', textAlign: 'right', fontSize: '15px', fontWeight: '900', color: '#334155' }}>
                                                {item.count.toLocaleString()}<span style={{ fontSize: '11px', color: '#94A3B8', marginLeft: '3px', fontWeight: '600' }}>건</span>
                                            </td>
                                            <td style={{ width: '85px', padding: '10px 0', textAlign: 'center' }}>
                                                <div style={{
                                                    fontSize: '12px', fontWeight: '950', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '3px',
                                                    padding: '4px 10px', borderRadius: '6px',
                                                    backgroundColor: item.changeType === 'up' ? '#FEF2F2' : item.changeType === 'down' ? '#EFF6FF' : 'rgba(241, 245, 249, 0.5)',
                                                    color: item.changeType === 'up' ? '#EF4444' : item.changeType === 'down' ? '#3B82F6' : '#94A3B8',
                                                    minWidth: '55px'
                                                }}>
                                                    {item.changeType === 'up' && '▲'}
                                                    {item.changeType === 'down' && '▼'}
                                                    {item.changeType === 'same' && '-'}
                                                    {item.change !== 0 && Math.abs(item.change)}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Word Cloud - Matching Design */}
                    <div className="dash-card shadow-2xl" style={{ height: 680, border: '1px solid #E2E8F0', borderRadius: '12px', display: 'flex', flexDirection: 'column', overflow: 'hidden', backgroundColor: 'white' }}>
                        <div style={{ backgroundColor: 'white', borderBottom: 'none', padding: '24px 32px', flexShrink: 0 }}>
                            <h3 className="font-bold text-gray-800 flex items-center gap-3">
                                <span style={{ fontSize: '20px', fontWeight: '950', letterSpacing: '-0.03em' }}>실시간 키워드 클라우드</span>
                                <span style={{ fontSize: '12px', color: '#94A3B8', fontWeight: '600', marginLeft: '4px' }}>2026.01.12 12:00</span>
                            </h3>
                        </div>
                        <div className="flex-1 flex flex-wrap content-center justify-center gap-6 overflow-hidden relative" style={{ padding: '60px' }}>
                            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '90%', height: '90%', background: 'radial-gradient(circle, rgba(59, 130, 246, 0.04) 0%, transparent 75%)', pointerEvents: 'none' }}></div>
                            {WORD_CLOUD_TAGS.map((tag, i) => (
                                <span
                                    key={i}
                                    className="inline-block transition-all hover:scale-125 hover:rotate-3 cursor-default font-black drop-shadow-md"
                                    style={{
                                        fontSize: `${Math.max(1.0, tag.size / 13)}rem`,
                                        color: tag.color,
                                        opacity: 0.95,
                                        filter: 'saturate(1.3)'
                                    }}
                                >
                                    {tag.text}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div >
    );
};

export default Dashboard;

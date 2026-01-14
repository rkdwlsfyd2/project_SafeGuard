import React, { useState, useEffect, useRef } from 'react';
import {
    Download
} from 'lucide-react';
import { complaintsAPI } from '../utils/api';
import ComplaintTrendChart from '../components/Charts/ComplaintTrendChart';
import ComplaintCategoryChart from '../components/Charts/ComplaintCategoryChart';
import AgeGroupChart from '../components/Charts/AgeGroupChart';
import DistrictBottleneckChart from '../components/Charts/DistrictBottleneckChart';




// --- 임시 데이터 (Mock) ---
const MOCK_OVERDUE_DATA = [
    { id: 1, category: '건축/건설', title: '담장 붕괴 위험 긴급 신고', district: '강남구', overdueTime: '48시간 지연', agency: '건설본부' },
    { id: 2, category: '교통', title: '신호등 오작동 제보', district: '서초구', overdueTime: '24시간 지연', agency: '교통운영과' },
    { id: 3, category: '환경', title: '청계천 인근 악취 민원', district: '종로구', overdueTime: '12시간 지연', agency: '기후환경본부' },
    { id: 4, category: '도로', title: '포트홀 파손 수리 요청', district: '마포구', overdueTime: '8시간 지연', agency: '도로관리과' },
    { id: 5, category: '안전', title: '옹벽 균열 발생 신고', district: '동작구', overdueTime: '36시간 지연', agency: '안전총괄실' },
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

    const [selectedCategory, setSelectedCategory] = useState('도로');
    const overdueListRef = useRef<HTMLDivElement>(null);

    const handleOverdueClick = () => {
        overdueListRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

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
            .dash-kpi-grid { display:grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 20px; margin-bottom: 24px; }
            .dash-kpi-card { border-radius: 12px; box-shadow: 0 1px 2px rgba(0,0,0,0.06); height: 112px; display:flex; flex-direction:column; align-items:center; justify-content:center; border: 1px solid #e5e7eb; border-top-width: 4px; }
            .dash-kpi-title { color:#6b7280; font-weight: 800; margin-bottom: 8px; }
            .dash-kpi-value { font-size: 32px; font-weight: 900; }

            .dash-main { display:grid; grid-template-columns: repeat(12, minmax(0, 1fr)); gap: 24px; margin-bottom: 32px; align-items: stretch; }
            .dash-left { grid-column: span 5 / span 5; display:flex; flex-direction:column; gap: 24px; }
            .dash-right { grid-column: span 7 / span 7; display:flex; flex-direction:column; gap: 24px; }

            .dash-card { background:#fff; border: 1px solid #cbd5e1; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); }
            .dash-card-pad-4 { padding: 16px; }
            .dash-card-pad-6 { padding: 24px; }
            .dash-card-title { font-weight: 800; color:#374151; }

            .dash-bottom { display:grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 24px; }

            @media (max-width: 1024px) {
              .dash-right { grid-column: span 12 / span 12; }
              .dash-bottom { grid-template-columns: 1fr; }
            }
            @keyframes pulse-red {
                0% { box-shadow: 0 0 0 0 rgba(225, 29, 72, 0.4); }
                70% { box-shadow: 0 0 0 15px rgba(225, 29, 72, 0); }
                100% { box-shadow: 0 0 0 0 rgba(225, 29, 72, 0); }
            }
            .animate-pulse-red { animation: pulse-red 2s infinite; }

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

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '16px' }}>
                        {[
                            { label: '전 체', count: stats.total, color: '#F1F5F9', textColor: '#334155' },
                            { label: '접 수', count: received, color: '#EFF6FF', textColor: '#2563EB' },
                            { label: '처리중', count: stats.processing, color: '#FEF2F2', textColor: '#EF4444' },
                            { label: '처리완료', count: stats.completed, color: '#F0FDF4', textColor: '#16A34A' },
                            { label: 'SLA 준수율', count: '94.2%', color: '#EEF2FF', textColor: '#4F46E5' },
                            { label: '지연 민원', count: 12, color: '#FFF1F2', textColor: '#E11D48', isUrgent: true }
                        ].map((stat, idx) => (
                            <div
                                key={idx}
                                onClick={stat.isUrgent ? handleOverdueClick : undefined}
                                className={stat.isUrgent ? 'animate-pulse-red' : ''}
                                style={{
                                    backgroundColor: stat.color,
                                    padding: '24px 16px',
                                    borderRadius: '12px',
                                    textAlign: 'center',
                                    border: stat.isUrgent ? '2px solid #FB7185' : '1px solid #E2E8F0',
                                    transition: 'all 0.2s ease',
                                    cursor: stat.isUrgent ? 'pointer' : 'default',
                                    position: 'relative',
                                    zIndex: 1
                                }}
                            >
                                <div style={{ fontSize: '1rem', marginBottom: '8px', fontWeight: '800', color: '#64748B' }}>{stat.label}</div>
                                <div style={{ fontSize: '2.2rem', fontWeight: '950', color: stat.textColor }}>{stat.count}</div>
                                {stat.isUrgent && (
                                    <div style={{ position: 'absolute', top: '-10px', right: '-10px', backgroundColor: '#E11D48', color: 'white', padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: '900', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>OVERDUE</div>
                                )}
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

                        {/* Right: Trend Chart + Age Group Chart */}
                        <div className="dash-right">
                            <ComplaintTrendChart selectedCategory={selectedCategory} />
                            <div style={{ flex: 1 }}>
                                <AgeGroupChart />
                            </div>
                        </div>
                    </div>
                </div>

                {/* 3. Bottom Grid: District Bottleneck Ranking (Bottleneck Analysis) */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '24px', marginBottom: '40px' }}>
                    <DistrictBottleneckChart type="unprocessed" />
                    <DistrictBottleneckChart type="overdue" />
                </div>
                {/* 4. Delayed Complaint List Section (Drill-down) */}
                <section ref={overdueListRef} style={{ marginBottom: '60px' }}>
                    <div className="dash-card shadow-2xl" style={{ border: '2px solid #FB7185', borderRadius: '16px', overflow: 'hidden', backgroundColor: 'white' }}>
                        <div style={{ backgroundColor: '#FFF1F2', padding: '24px 32px', borderBottom: '1px solid #FECDD3', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 className="font-bold flex items-center gap-3">
                                <span style={{ fontSize: '22px', fontWeight: '950', color: '#9F1239' }}>지연 민원 상세 관리 (SLA Overdue)</span>
                                <span style={{ backgroundColor: '#E11D48', color: 'white', padding: '2px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '900' }}>12 Active</span>
                            </h3>
                            <button style={{ backgroundColor: 'white', color: '#E11D48', border: '1px solid #FECDD3', padding: '8px 16px', borderRadius: '8px', fontSize: '14px', fontWeight: '800', cursor: 'pointer' }}>전체 보기</button>
                        </div>
                        <div style={{ padding: '0 32px 32px 32px' }}>
                            <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 12px' }}>
                                <thead>
                                    <tr style={{ color: '#9F1239', fontSize: '13px', fontWeight: '900', textAlign: 'left' }}>
                                        <th style={{ padding: '12px 16px' }}>분야</th>
                                        <th style={{ padding: '12px 16px' }}>민원 제목</th>
                                        <th style={{ padding: '12px 16px' }}>자치구</th>
                                        <th style={{ padding: '12px 16px' }}>담당 기관</th>
                                        <th style={{ padding: '12px 16px' }}>지연 시간</th>
                                        <th style={{ padding: '12px 16px', textAlign: 'center' }}>조치</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {MOCK_OVERDUE_DATA.map((item) => (
                                        <tr key={item.id} style={{ backgroundColor: '#fff5f5', borderRadius: '12px', transition: 'transform 0.2s' }}>
                                            <td style={{ padding: '20px 16px', borderTopLeftRadius: '12px', borderBottomLeftRadius: '12px', fontWeight: '900', color: '#BE123C' }}>{item.category}</td>
                                            <td style={{ padding: '20px 16px', fontWeight: '700', color: '#1E293B' }}>{item.title}</td>
                                            <td style={{ padding: '20px 16px', color: '#64748B', fontWeight: '800' }}>{item.district}</td>
                                            <td style={{ padding: '20px 16px', color: '#1E293B', fontWeight: '800' }}>{item.agency}</td>
                                            <td style={{ padding: '20px 16px' }}>
                                                <span style={{ color: '#E11D48', fontWeight: '950', backgroundColor: '#FFE4E6', padding: '4px 10px', borderRadius: '6px' }}>{item.overdueTime}</span>
                                            </td>
                                            <td style={{ padding: '20px 16px', borderTopRightRadius: '12px', borderBottomRightRadius: '12px', textAlign: 'center' }}>
                                                <button style={{ backgroundColor: '#E11D48', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '6px', fontSize: '13px', fontWeight: '900', cursor: 'pointer' }}>즉시 점검</button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </section>
            </div>
        </div >
    );
};

export default Dashboard;

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import {
    Download,
    HelpCircle
} from 'lucide-react';
import { complaintsAPI } from '../utils/api';
import ComplaintTrendChart from '../components/Charts/ComplaintTrendChart';
import ComplaintCategoryChart from '../components/Charts/ComplaintCategoryChart';

import DistrictBottleneckChart from '../components/Charts/DistrictBottleneckChart';
import ComplaintGrowthTrendChart from '../components/Charts/ComplaintGrowthTrendChart';


/**
 * 관리자 대시보드 메인 페이지
 * 
 * 주요 기능:
 * 1. 30초 주기 자동 데이터 갱신 (카운트다운 타이머 포함)
 * 2. 민원 현황 KPI 및 다양한 통계 차트(추이, 분류, 연령별, 병목 등) 렌더링
 * 3. 자식 컴포넌트(차트)에 refreshKey를 전파하여 일괄 업데이트 유도
 */
const Dashboard = () => {
    const [stats, setStats] = useState({
        total: 0,
        received: 0,
        processing: 0,
        completed: 0,
        sla_compliance: 0,
        overdue: 0
    });
    const navigate = useNavigate();
    const [overdueList, setOverdueList] = useState<any[]>([]);
    const [showSlaTooltip, setShowSlaTooltip] = useState(false);

    const [selectedCategory, setSelectedCategory] = useState('전체');
    const [timeBasis, setTimeBasis] = useState<'DAY' | 'MONTH' | 'YEAR'>('MONTH');
    const [currentPage, setCurrentPage] = useState(1);

    const ITEMS_PER_PAGE = 5;

    // 자동 갱신 타이머 (Auto-refresh)
    // 30초 자동 갱신을 위한 타이머 및 키 상태 관리
    const [refreshKey, setRefreshKey] = useState(0);
    const [timeLeft, setTimeLeft] = useState(30);

    useEffect(() => {
        const timer = setInterval(() => {
            setTimeLeft((prev) => {
                // 1초 이하일 때 키 업데이트(갱신 트리거) 및 타이머 초기화
                if (prev <= 1) {
                    setRefreshKey((k) => k + 1);
                    return 30;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, []);

    const fetchDashboardData = useCallback(async () => {
        try {
            const params: any = {};
            if (selectedCategory !== '전체') params.category = selectedCategory;
            params.timeBasis = timeBasis;

            const data = await complaintsAPI.getDashboardStats(params);

            if (data) {
                if (data.summary) {
                    setStats(data.summary);
                }
                if (data.overdueList) {
                    setOverdueList(data.overdueList);
                }
            }
        } catch (error) {
            console.error('Failed to fetch dashboard stats:', error);
        }
    }, [selectedCategory, timeBasis, refreshKey]);

    useEffect(() => {
        fetchDashboardData();
    }, [fetchDashboardData]);
    const overdueListRef = useRef<HTMLDivElement>(null);

    const totalPages = Math.ceil(overdueList.length / ITEMS_PER_PAGE);
    const currentOverdueList = overdueList.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    );

    const handlePageChange = (newPage: number) => {
        if (newPage >= 1 && newPage <= totalPages) {
            setCurrentPage(newPage);
        }
    };

    const handleOverdueClick = () => {
        overdueListRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    // const received = stats.total - (stats.processing + stats.completed);


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
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <h1 className="dash-title">관리자 대시보드</h1>
                        <div style={{
                            fontSize: '14px',
                            fontWeight: 700,
                            color: '#64748B',
                            backgroundColor: '#F1F5F9',
                            padding: '6px 12px',
                            borderRadius: '20px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            border: '1px solid #E2E8F0'
                        }}>
                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#22C55E' }}></div>
                            {timeLeft}초 후 갱신
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', backgroundColor: '#E2E8F0', padding: '4px', borderRadius: '12px' }}>
                        {[
                            { label: '일별', value: 'DAY' },
                            { label: '월별', value: 'MONTH' },
                            { label: '연별', value: 'YEAR' }
                        ].map((item) => (
                            <button
                                key={item.value}
                                onClick={() => setTimeBasis(item.value as any)}
                                style={{
                                    padding: '8px 16px',
                                    borderRadius: '10px',
                                    fontSize: '13px',
                                    fontWeight: 800,
                                    backgroundColor: timeBasis === item.value ? 'white' : 'transparent',
                                    color: timeBasis === item.value ? '#334155' : '#64748B',
                                    boxShadow: timeBasis === item.value ? '0 2px 4px rgba(0,0,0,0.05)' : 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s'
                                }}
                            >
                                {item.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* 나의 민원 현황 (KPI Cards) */}
                <section style={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #E2E8F0',
                    borderRadius: '12px',
                    padding: '32px',
                    marginBottom: '40px',
                    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                    position: 'relative'
                }}>
                    <div style={{
                        position: 'absolute', top: 0, left: 0, right: 0, height: '6px',
                        background: 'linear-gradient(90deg, #A0C4FF 0%, #B2F2BB 50%, #FFB1B1 100%)'
                    }} />

                    <h3 style={{ marginBottom: '28px', color: '#1e293b', fontWeight: '900', fontSize: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ width: '4px', height: '20px', backgroundColor: '#3B82F6', borderRadius: '2px' }}></span>
                        민원 처리 현황 {selectedCategory !== '전체' && <span style={{ color: '#3B82F6', marginLeft: 4 }}>[ {selectedCategory} ]</span>}
                        <div
                            style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', marginLeft: '4px', cursor: 'help' }}
                            onMouseEnter={() => setShowSlaTooltip(true)}
                            onMouseLeave={() => setShowSlaTooltip(false)}
                        >
                            <HelpCircle size={16} color="#94A3B8" />
                            {showSlaTooltip && createPortal(
                                <div style={{
                                    position: 'fixed',
                                    top: '190px',
                                    left: '420px',
                                    width: '320px',
                                    padding: '24px',
                                    backgroundColor: '#0f172a',
                                    color: 'white',
                                    borderRadius: '16px',
                                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                                    zIndex: 10000,
                                    textAlign: 'left',
                                    lineHeight: '1.6',
                                    border: '1px solid #334155',
                                    pointerEvents: 'none'
                                }}>
                                    <div style={{ fontWeight: '900', fontSize: '14px', marginBottom: '10px', color: '#60A5FA', borderBottom: '1px solid #334155', paddingBottom: '8px' }}>SLA (Service Level Agreement)</div>
                                    <div style={{ marginBottom: '12px', color: '#E2E8F0', fontSize: '12.5px' }}>행정 서비스 수준 협약으로, 민원 접수 후 해결까지의 목표 처리 시간을 의미합니다.</div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                                        {[
                                            '계산 기준: 주말 및 공휴일을 제외한 영업일 기준 3일 이내 처리',
                                            '공식: (3영업일 내 완료 건수 / 전체 완료 건수) × 100',
                                            '주말(토, 일)은 처리 기간 산정 시 자동으로 제외됩니다.'
                                        ].map((detail, i) => (
                                            <div key={i} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                                                <span style={{ color: '#60A5FA', marginTop: '2px' }}>•</span>
                                                <span style={{ color: '#94A3B8', fontSize: '12px' }}>{detail}</span>
                                            </div>
                                        ))}
                                    </div>
                                    <div style={{
                                        marginTop: '12px',
                                        paddingTop: '12px',
                                        borderTop: '1px solid #334155',
                                        fontSize: '11px',
                                        color: '#64748B',
                                        textAlign: 'center',
                                        fontWeight: '600'
                                    }}>
                                        ※ 본 지표는 선택된 민원 유형 기준으로 산정됩니다.
                                    </div>
                                </div>,
                                document.body
                            )}
                        </div>
                    </h3>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '16px' }}>
                        {[
                            { label: '전 체', count: stats.total, color: '#F1F5F9', textColor: '#334155' },
                            { label: '미처리', count: stats.received, color: '#FFF1F2', textColor: '#E11D48' },
                            { label: '처리중', count: stats.processing, color: '#FFFBEB', textColor: '#B45309' },
                            { label: '처리완료', count: stats.completed, color: '#F0FDF4', textColor: '#16A34A' },
                            { label: 'SLA 준수율', count: `${stats.sla_compliance}%`, color: '#EEF2FF', textColor: '#4F46E5' },
                            { label: '지연 민원', count: stats.overdue, color: '#FFF1F2', textColor: '#E11D48', isUrgent: true }
                        ].map((stat: any, idx) => (
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

                {/* 2. 메인 콘텐츠 그리드 (박스 레이아웃) */}
                <div className="bg-slate-50/50 p-6 rounded-2xl border border-slate-200 shadow-inner mb-8">
                    <div className="dash-main !mb-0">
                        {/* 좌측: 분류별 통계 차트 (Category Chart) */}
                        <div className="dash-left">
                            {/* 분류별 통계: refreshKey 전달하여 동기화 */}
                            <ComplaintCategoryChart selectedCategory={selectedCategory} onSelect={setSelectedCategory} refreshKey={refreshKey} />
                        </div>

                        {/* 우측: 트렌드 차트 + 성장 추이 차트 (Trend + Growth) */}
                        <div className="dash-right">
                            <ComplaintTrendChart selectedCategory={selectedCategory} timeBasis={timeBasis} refreshKey={refreshKey} />
                            <div style={{ flex: 1 }}>
                                <ComplaintGrowthTrendChart selectedCategory={selectedCategory} timeBasis={timeBasis} refreshKey={refreshKey} />
                            </div>
                            {/* 구별 지연 TOP 10: 상단 우측 컬럼으로 이동됨 */}
                            <DistrictBottleneckChart type="overdue" refreshKey={refreshKey} />
                        </div>
                    </div>
                </div>




                {/* 5. 지연 민원 상세 목록 (Drill-down) */}
                <section ref={overdueListRef} style={{ marginBottom: '60px' }}>
                    <div className="dash-card shadow-2xl" style={{ border: '1px solid #FECDD3', borderRadius: '16px', overflow: 'hidden', backgroundColor: 'white' }}>
                        <div style={{ backgroundColor: '#FFFFFF', padding: '24px 32px', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 className="font-bold flex items-center gap-3">
                                <span style={{ fontSize: '22px', fontWeight: '950', color: '#9F1239' }}>지연 민원 상세 관리 (SLA Overdue)</span>
                                <span style={{ backgroundColor: '#E11D48', color: 'white', padding: '2px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '900' }}>{stats.overdue} 개 민원</span>
                            </h3>

                        </div>
                        <div style={{ padding: '0 32px 32px 32px' }}>
                            <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 12px' }}>
                                <thead>
                                    <tr style={{ color: '#9F1239', fontSize: '13px', fontWeight: '900', textAlign: 'left' }}>
                                        <th style={{ padding: '12px 16px' }}>분야</th>
                                        <th style={{ padding: '12px 16px' }}>민원 제목</th>
                                        <th style={{ padding: '12px 16px' }}>자치구</th>
                                        <th style={{ padding: '12px 16px' }}>담당 기관</th>
                                        <th style={{ padding: '12px 16px' }}>지연 시간 (영업일 기준)</th>
                                        <th style={{ padding: '12px 16px', textAlign: 'center' }}>조치</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {currentOverdueList.map((item) => (
                                        <tr key={item.id} style={{ backgroundColor: '#fff5f5', borderRadius: '12px', transition: 'transform 0.2s' }}>
                                            <td style={{ padding: '20px 16px', borderTopLeftRadius: '12px', borderBottomLeftRadius: '12px', fontWeight: '900', color: '#BE123C' }}>{item.category}</td>
                                            <td style={{ padding: '20px 16px', fontWeight: '700', color: '#1E293B' }}>{item.title}</td>
                                            <td style={{ padding: '20px 16px', color: '#64748B', fontWeight: '800' }}>{item.district}</td>
                                            <td style={{ padding: '20px 16px', color: '#1E293B', fontWeight: '800' }}>{item.agency}</td>
                                            <td style={{ padding: '20px 16px' }}>
                                                <span style={{ color: '#E11D48', fontWeight: '950', backgroundColor: '#FFE4E6', padding: '4px 10px', borderRadius: '6px' }}>{item.overduetime}</span>
                                            </td>
                                            <td style={{ padding: '20px 16px', borderTopRightRadius: '12px', borderBottomRightRadius: '12px', textAlign: 'center' }}>
                                                <button
                                                    onClick={() => navigate('/reports/' + item.id)}
                                                    style={{ backgroundColor: '#E11D48', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '6px', fontSize: '13px', fontWeight: '900', cursor: 'pointer' }}
                                                >
                                                    즉시 점검
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>

                            {/* 페이지네이션 컨트롤 */}
                            {totalPages > 1 && (
                                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', marginTop: '20px' }}>
                                    <button
                                        onClick={() => handlePageChange(currentPage - 1)}
                                        disabled={currentPage === 1}
                                        style={{
                                            padding: '8px 16px',
                                            borderRadius: '8px',
                                            border: '1px solid #FECDD3',
                                            backgroundColor: currentPage === 1 ? '#FFF5F5' : 'white',
                                            color: currentPage === 1 ? '#FDA4AF' : '#E11D48',
                                            cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                                            fontWeight: '700'
                                        }}
                                    >
                                        이전
                                    </button>
                                    <span style={{ fontSize: '14px', fontWeight: '700', color: '#9F1239' }}>
                                        {currentPage} / {totalPages}
                                    </span>
                                    <button
                                        onClick={() => handlePageChange(currentPage + 1)}
                                        disabled={currentPage === totalPages}
                                        style={{
                                            padding: '8px 16px',
                                            borderRadius: '8px',
                                            border: '1px solid #FECDD3',
                                            backgroundColor: currentPage === totalPages ? '#FFF5F5' : 'white',
                                            color: currentPage === totalPages ? '#FDA4AF' : '#E11D48',
                                            cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                                            fontWeight: '700'
                                        }}
                                    >
                                        다음
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </section>
            </div >
        </div >
    );
};

export default Dashboard;
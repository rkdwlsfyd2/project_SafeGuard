/**
 * 민원 처리율 및 SLA 준수율 트렌드 차트 (Stacked Bar Components Integration)
 * 
 * 주요 기능:
 * 1. KPI Cards: 접수/처리/완료/미처리 건수 상태 표시 및 전일/전월/전년 대비 증감율 비교
 * 2. Trend Chart: 월별 SLA 준수율(파란선) 및 처리율(초록선) 추이 시각화
 * 3. Backlog(미처리) 통계: 현재 잔량 역산 및 증감 상태(증가/감소)에 따른 색상/아이콘 동적 처리
 */
import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import ReactApexChart from 'react-apexcharts';
import { HelpCircle } from 'lucide-react';
import { complaintsAPI } from '../../utils/api';

interface ChartOneProps {
    selectedCategory: string;
    timeBasis: 'DAY' | 'MONTH' | 'YEAR';
    refreshKey?: number;
}

type TrendRow = { date: string; received: number; completed: number; backlog: number; slaRate: number; completionRate: number };

type BacklogStats = {
    current: number;
    diff: number;           // 전월 대비 증감(건)
    changePercent: number | null; // 전월 대비 증감(%). prev=0이면 null(N/A)
    changeType: 'increase' | 'decrease';
    avgDays: number;        // 평균 처리일수
    completionRate: number; // 완료율
};

// KPI 카드 컴포넌트: 지표 타이틀, 값, 비교 텍스트, 상태 컬러 등을 표현
const KpiCard: React.FC<{
    title: string;
    value: React.ReactNode;
    sub?: React.ReactNode;
    color?: string;
    icon?: React.ReactNode;
    criteria?: string;
}> = ({ title, value, sub, color = '#3B82F6', icon, criteria }) => {
    const [showInfo, setShowInfo] = useState(false);
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

    const handleMouseEnter = (e: React.MouseEvent) => {
        setMousePos({ x: e.clientX, y: e.clientY });
        setShowInfo(true);
    };

    return (
        <div
            style={{
                flex: 1,
                border: `1px solid #E2E8F0`,
                borderTop: `5px solid ${color}`,
                borderRadius: 12,
                padding: '18px 22px',
                backgroundColor: '#FFFFFF',
                boxShadow: '0 10px 15px -3px rgba(15, 23, 42, 0.04)',
                transition: 'all 0.3s ease',
                display: 'flex',
                flexDirection: 'column',
                position: 'relative',
            }}
            className="hover:shadow-lg hover:translate-y-[-2px]"
        >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ fontSize: 14, fontWeight: 800, color: '#64748B', letterSpacing: '-0.01em' }}>{title}</div>
                    {criteria && (
                        <div
                            style={{ cursor: 'help', display: 'flex', alignItems: 'center' }}
                            onMouseEnter={handleMouseEnter}
                            onMouseLeave={() => setShowInfo(false)}
                        >
                            <HelpCircle size={14} color="#94A3B8" />
                        </div>
                    )}
                </div>
                {icon}
            </div>
            <div style={{ fontSize: 30, fontWeight: 950, color: color === '#94A3B8' ? '#94A3B8' : '#0F172A', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
                {value}
            </div>
            <div style={{ marginTop: 10, fontSize: 11.5, fontWeight: 700, minHeight: '1.2em' }}>
                {sub}
            </div>

            {showInfo && criteria && createPortal(
                <div style={{
                    position: 'fixed',
                    top: mousePos.y + 15,
                    left: mousePos.x + 15,
                    backgroundColor: '#1E293B',
                    color: 'white',
                    padding: '12px 16px',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontWeight: 600,
                    zIndex: 10001,
                    boxShadow: '0 10px 15px -3px rgba(0,0,0,0.3)',
                    maxWidth: '260px',
                    pointerEvents: 'none',
                    lineHeight: '1.6'
                }}>
                    <div style={{ color: '#94A3B8', marginBottom: '6px', fontSize: '11px', fontWeight: 800 }}>지표 정의와 기준</div>
                    <div style={{ whiteSpace: 'pre-line' }}>{criteria}</div>
                    <div style={{ marginTop: '10px', paddingTop: '8px', borderTop: '1px solid #334155', color: '#94A3B8', fontSize: '10px', fontWeight: 500 }}>
                        ※ 본 지표는 선택된 민원 유형 기준으로 산정됩니다.
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

const ComplaintTrendChart: React.FC<ChartOneProps> = ({ selectedCategory, timeBasis, refreshKey }) => {
    const [trendData, setTrendData] = useState<TrendRow[]>([]);
    const [backlogStats, setBacklogStats] = useState<BacklogStats>({
        current: 0,
        diff: 0,
        changePercent: null,
        changeType: 'increase',
        avgDays: 0,
        completionRate: 0
    });

    useEffect(() => {
        const params: any = {};
        if (selectedCategory !== '전체') params.category = selectedCategory;
        params.timeBasis = timeBasis;

        complaintsAPI.getDashboardStats(params)
            .then((data) => {
                if (!data?.monthlyTrend || !data?.summary) return;

                const trends = data.monthlyTrend as Array<{ month: string; received: number; completed: number; sla_rate: number }>;

                const anchorPending = (data.summary.received ?? 0) + (data.summary.processing ?? 0);

                const processed: TrendRow[] = [];
                let tempBacklog = anchorPending;

                // 최신 데이터부터 과거로 역산하여 월별 잔량(Backlog) 추정
                for (let i = trends.length - 1; i >= 0; i--) {
                    const item = trends[i];
                    const cRate = item.received > 0 ? Math.min(100, Math.round((item.completed / item.received) * 1000) / 10) : 0;

                    processed.unshift({
                        date: item.month,
                        received: item.received ?? 0,
                        completed: item.completed ?? 0,
                        backlog: tempBacklog,
                        slaRate: item.sla_rate ?? 0,
                        completionRate: cRate
                    });

                    tempBacklog = tempBacklog - (item.received ?? 0) + (item.completed ?? 0);
                    if (tempBacklog < 0) tempBacklog = 0;
                }

                setTrendData(processed);

                setTrendData(processed);

                // 최근 2개월 데이터를 비교하여 Backlog 증감율 및 상태 도출
                let bStats = {
                    current: anchorPending,
                    diff: 0,
                    changePercent: null as number | null,
                    changeType: 'increase' as 'increase' | 'decrease',
                    avgDays: data.summary?.avg_processing_days ?? 0,
                    completionRate: data.summary?.completion_rate ?? 0,

                };

                if (processed.length >= 2) {
                    const last = processed[processed.length - 1].backlog;
                    const prev = processed[processed.length - 2].backlog;
                    const diffValue = last - prev;
                    const percent = prev === 0 ? null : (diffValue / prev) * 100;

                    bStats = {
                        ...bStats,
                        current: last,
                        diff: diffValue,
                        changePercent: percent === null ? null : Math.abs(parseFloat(percent.toFixed(1))),
                        changeType: diffValue >= 0 ? 'increase' : 'decrease'
                    };
                }
                setBacklogStats(bStats);
            })
            // 데이터 로드 실패 시 에러 처리
            .catch((err) => console.error('Failed to fetch dashboard trends:', err));
    }, [selectedCategory, timeBasis, refreshKey]);

    const dates = useMemo(() => trendData.map((d) => d.date), [trendData]);
    const receivedData = useMemo(() => trendData.map((d) => d.received), [trendData]);
    const completedData = useMemo(() => trendData.map((d) => d.completed), [trendData]);
    const slaData = useMemo(() => trendData.map((d) => d.slaRate), [trendData]);
    const completionRateData = useMemo(() => trendData.map((d) => d.completionRate), [trendData]);

    // KPI (이번 달 접수/완료)
    const kpi = useMemo(() => {
        const last = trendData.at(-1);
        return {
            receivedLast: last?.received ?? 0,
            completedLast: last?.completed ?? 0,
        };
    }, [trendData]);




    const backlogSubText = useMemo(() => {
        if (backlogStats.changePercent === null) return <span style={{ color: '#94A3B8' }}>변동 없음</span>;
        const arrow = backlogStats.changeType === 'increase' ? '▲' : '▼';
        // Color for the text itself can still indicate trend, but the Card color should be stable
        const color = backlogStats.changeType === 'increase'
            ? (backlogStats.changePercent > 10 ? '#EF4444' : '#F59E0B')
            : '#3B82F6';

        const periodLabel = timeBasis === 'DAY' ? '전일 대비' : timeBasis === 'YEAR' ? '전년 대비' : '전월 대비';

        return (
            <span style={{ color }}>
                {periodLabel} {arrow} {backlogStats.changePercent}%
            </span>
        );
    }, [backlogStats, timeBasis]); // timeBasis 변경 시 재계산

    return (
        <div
            className="w-full"
            style={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: 16,
                boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.05)',
                padding: 24,
                display: 'flex',
                flexDirection: 'column',
                gap: 24,
            }}
        >
            {/* Header Area */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                    <div style={{ width: 4, height: 24, backgroundColor: '#3B82F6', borderRadius: 2, marginRight: 12 }} />
                    <h5 style={{ fontSize: 20, fontWeight: 950, color: '#0F172A', margin: 0 }}>
                        [{selectedCategory}] 상세 분석 및 트렌드
                    </h5>
                </div>
            </div>

            {/* KPI 행: flex 레이아웃으로 하단 차트와 너비 동기화 */}
            <div style={{ display: 'flex', gap: 24, width: '100%', boxSizing: 'border-box' }}>
                {/* 1. 현재 미처리 건수 */}
                <KpiCard
                    title="현재 미처리 건수"
                    value={`${backlogStats.current} 건`}
                    sub={backlogSubText}
                    color='#3B82F6' // 혼동 방지를 위해 정적 파란색(Blue) 사용
                    criteria={`현재 처리되지 않은 민원 총 건수입니다.\n해당 유형의 행정 업무 부담 규모를 나타냅니다.`}
                />

                {/* 2. 평균 처리 기간 */}
                <KpiCard
                    title="평균 처리 기간"
                    value={backlogStats.avgDays > 0 ? `${backlogStats.avgDays} 일` : '–'}
                    sub={(() => {
                        if (backlogStats.avgDays === 0) return <span style={{ color: '#94A3B8' }}>당월 완료 민원 없음</span>;
                        if (backlogStats.avgDays <= 3) return <span style={{ color: '#3B82F6' }}>처리 속도 정상</span>;
                        if (backlogStats.avgDays <= 7) return <span style={{ color: '#F59E0B' }}>처리 지연 주의</span>;
                        return <span style={{ color: '#EF4444' }}>즉시 대응 필요</span>;
                    })()}
                    color={(() => {
                        if (backlogStats.avgDays === 0) return '#94A3B8'; // Neutral
                        if (backlogStats.avgDays <= 3) return '#3B82F6';
                        if (backlogStats.avgDays <= 7) return '#F59E0B';
                        return '#EF4444';
                    })()}
                    criteria={`민원 접수일부터 처리 완료까지\n소요된 평균 기간(일)입니다.\n완료된 민원만을 기준으로 산정됩니다.`}
                />

                {/* 3. 처리율 */}
                <KpiCard
                    title="처리율"
                    value={backlogStats.completionRate > 0 ? `${backlogStats.completionRate}%` : '–'}
                    sub={(() => {
                        if (backlogStats.completionRate === 0) return <span style={{ color: '#94A3B8' }}>당월 완료 또는 접수 0건</span>;
                        if (backlogStats.completionRate >= 80) return <span style={{ color: '#3B82F6' }}>목표 달성 (우수)</span>;
                        if (backlogStats.completionRate >= 50) return <span style={{ color: '#F59E0B' }}>처리 속도 관리 필요</span>;
                        return <span style={{ color: '#EF4444' }}>대응 인력 부족 위험</span>;
                    })()}
                    color={(() => {
                        if (backlogStats.completionRate === 0) return '#94A3B8';
                        if (backlogStats.completionRate >= 80) return '#3B82F6';
                        if (backlogStats.completionRate >= 50) return '#F59E0B';
                        return '#EF4444';
                    })()}
                    criteria={`당월 접수된 민원 중\n처리 완료된 민원의 비율입니다.`}
                />


            </div>


        </div>
    );
};

export default ComplaintTrendChart;
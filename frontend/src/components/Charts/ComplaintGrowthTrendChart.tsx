
/**
 * 민원 접수 및 증감 추이 복합 차트 (Mixed Chart)
 * 
 * 주요 기능:
 * 1. 상단 Summary Bar: 오늘/이번달/올해 접수 건수 및 전일/전월/전년 대비 증감율 표시
 * 2. 하단 Chart: 월별 접수 건수(Bar)와 전월 대비 증감율(Line)을 시각화
 */
import React, { useEffect, useMemo, useState } from 'react';
import ReactApexChart from 'react-apexcharts';
import { complaintsAPI } from '../../utils/api';

interface ChartProps {
    selectedCategory: string;
    timeBasis: 'DAY' | 'MONTH' | 'YEAR';
    refreshKey?: number;
}

type TrendRow = {
    date: string;
    received: number;
    growthRate: number;
};

type SummaryData = {
    todayCount: number;
    yesterdayCount: number;
    monthCount: number;
    lastMonthCount: number;
    yearCount: number;
    lastYearCount: number;
};

const ComplaintGrowthTrendChart: React.FC<ChartProps> = ({ selectedCategory, timeBasis, refreshKey }) => {
    const [trendData, setTrendData] = useState<TrendRow[]>([]);
    const [summary, setSummary] = useState<SummaryData | null>(null);

    useEffect(() => {
        const params: any = {};
        if (selectedCategory !== '전체') params.category = selectedCategory;
        params.timeBasis = timeBasis;

        complaintsAPI.getDashboardStats(params)
            .then((data) => {
                if (!data?.monthlyTrend) return;

                const trends = data.monthlyTrend as Array<{ month: string; received: number }>;
                trends.sort((a, b) => a.month.localeCompare(b.month));

                const processed: TrendRow[] = [];
                for (let i = 0; i < trends.length; i++) {
                    const current = trends[i];
                    const prev = i > 0 ? trends[i - 1] : null;

                    // 전월 대비 증감율 계산 (전월 데이터 0일 경우 예외 처리)
                    let growthRate = 0;
                    if (prev && prev.received > 0) {
                        const diff = current.received - prev.received;
                        growthRate = (diff / prev.received) * 100;
                    } else if (prev && prev.received === 0 && current.received > 0) {
                        growthRate = 0; // 0에서 증가는 % 계산 불가 (0으로 처리하여 차트 튀는 것 방지)
                    }

                    processed.push({
                        date: current.month,
                        received: current.received ?? 0,
                        growthRate: parseFloat(growthRate.toFixed(1))
                    });
                }
                setTrendData(processed);

                // Summary Stats
                if (data && data.summary) {
                    setSummary({
                        todayCount: data.summary.todayCount || 0,
                        yesterdayCount: data.summary.yesterdayCount || 0,
                        monthCount: data.summary.monthCount || 0,
                        lastMonthCount: data.summary.lastMonthCount || 0,
                        yearCount: data.summary.yearCount || 0,
                        lastYearCount: data.summary.lastYearCount || 0
                    });
                }
            })
            // Fetch 실패 시 에러 로깅
            .catch((err) => console.error('Failed to fetch dashboard trends:', err));
    }, [selectedCategory, timeBasis, refreshKey]);

    const dates = useMemo(() => trendData.map((d) => d.date), [trendData]);
    const receivedData = useMemo(() => trendData.map((d) => d.received), [trendData]);
    const growthData = useMemo(() => trendData.map((d) => d.growthRate), [trendData]);

    const series = useMemo(
        () => [
            { name: '접수 건수', type: 'column', data: receivedData },
            { name: '증감율', type: 'line', data: growthData }
        ],
        [receivedData, growthData]
    );

    const options = useMemo(
        () => ({
            chart: {
                type: 'line' as const,
                fontFamily: 'Pretendard, sans-serif',
                toolbar: { show: false },
                zoom: { enabled: false },
                animations: { enabled: true }
            },
            stroke: {
                width: [0, 3],
                curve: 'smooth' as const
            },
            plotOptions: {
                bar: {
                    columnWidth: '50%',
                    borderRadius: 4
                }
            },
            dataLabels: {
                enabled: true,
                enabledOnSeries: [0], // 막대(Bar) 시리즈(index 0)에만 데이터 라벨 표시
                offsetY: -20,
                style: { fontSize: '12px', colors: ['#304758'] },
                formatter: (val: number) => val > 0 ? val.toLocaleString() : ''
            },
            xaxis: {
                categories: dates, // X축 카테고리 설정
                axisBorder: { show: false },
                axisTicks: { show: false },
                labels: { style: { colors: '#64748B', fontWeight: 600 } },
                tooltip: { enabled: false }
            },
            yaxis: [
                {
                    seriesName: '접수 건수',
                    // title removed as per user request
                    labels: {
                        style: { colors: '#3B82F6', fontWeight: 600 },
                        formatter: (val: number) => val.toFixed(0)
                    },
                },
                {
                    seriesName: '증감율',
                    opposite: true,
                    show: false, // Y축 숨김 (깔끔한 UI를 위해)
                    title: {
                        text: '증감율 (%)',
                        rotate: 0,
                        offsetX: -6,
                        style: { color: '#EF4444', fontWeight: 700 }
                    },
                    labels: {
                        style: { colors: '#EF4444', fontWeight: 600 },
                        formatter: (val: number) => `${val.toFixed(0)}%`
                    },
                }
            ],
            colors: ['#3B82F6', '#EF4444'],
            grid: { borderColor: '#F1F5F9', strokeDashArray: 4 },
            legend: { show: true, position: 'top' as const },
            tooltip: {
                shared: true,
                intersect: false,
                y: {
                    formatter: function (y: number, { seriesIndex }: any) {
                        return seriesIndex === 0 ? y.toFixed(0) + "건" : y.toFixed(1) + "%";
                    }
                }
            }
        }),
        [dates]
    );

    return (
        <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 14, padding: 20, width: '100%', boxSizing: 'border-box' }}>
            <div style={{ fontSize: 16, fontWeight: 900, color: '#0F172A', marginBottom: 16 }}>
                접수 및 증감율 추이
            </div>

            {/* Summary Bar: 주요 기간별 통계 및 증감율 요약 */}
            {summary && (
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    backgroundColor: '#F8FAFC',
                    borderRadius: '12px',
                    padding: '16px 24px',
                    marginBottom: '20px',
                    border: '1px solid #E2E8F0',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                }}>
                    <SummaryItem
                        label="오늘"
                        count={summary.todayCount}
                        prevCount={summary.yesterdayCount}
                    />
                    <div style={{ width: '1px', height: '40px', backgroundColor: '#E2E8F0' }}></div>
                    <SummaryItem
                        label="1월 (이번달)"
                        count={summary.monthCount}
                        prevCount={summary.lastMonthCount}
                    />
                    <div style={{ width: '1px', height: '40px', backgroundColor: '#E2E8F0' }}></div>
                    <SummaryItem
                        label="2026년 (올해)"
                        count={summary.yearCount}
                        prevCount={summary.lastYearCount}
                    />
                </div>
            )}

            <ReactApexChart options={options as any} series={series} type="line" height={320} />
        </div>
    );
};

// 하위 컴포넌트: 요약 아이템 (Summary Item)
const SummaryItem = ({ label, count, prevCount }: { label: string; count: number; prevCount: number }) => {
    const diff = count - prevCount;
    let growthRate: number | null = 0;

    if (prevCount > 0) {
        growthRate = (diff / prevCount) * 100;
    } else if (prevCount === 0 && count > 0) {
        growthRate = null; // 0 -> N 증가는 % 계산 불가 (신규)
    } else {
        growthRate = 0;
    }

    const isPositive = diff > 0;
    const isZero = diff === 0;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', marginBottom: '6px' }}>{label}</span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                <span style={{ fontSize: '18px', fontWeight: 900, color: '#1E293B' }}>{count.toLocaleString()}건</span>
                {!isZero && growthRate !== null && (
                    <span style={{
                        fontSize: '11px',
                        fontWeight: 800,
                        color: isPositive ? '#EF4444' : '#3B82F6',
                        display: 'flex',
                        alignItems: 'center'
                    }}>
                        {isPositive ? '▲' : '▼'} {Math.abs(growthRate).toFixed(1)}%
                    </span>
                )}
                {/* 전 기간 0건에서 증가한 경우 (New) */}
                {!isZero && growthRate === null && (
                    <span style={{
                        fontSize: '11px',
                        fontWeight: 800,
                        color: '#EF4444',
                        display: 'flex',
                        alignItems: 'center'
                    }}>
                        ▲ 신규
                    </span>
                )}
                {isZero && (
                    <span style={{ fontSize: '11px', fontWeight: 800, color: '#94A3B8' }}>-</span>
                )}
            </div>
        </div>
    );
};

export default ComplaintGrowthTrendChart;

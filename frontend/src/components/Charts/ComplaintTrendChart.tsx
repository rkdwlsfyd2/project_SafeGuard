/**
 * 선택된 카테고리의 민원 접수, 완료 건수 및 증감률, 백로그 트렌드를 보여주는 복합 차트 컴포넌트입니다.
 */
import React, { useState, useMemo, useEffect } from 'react';
import ReactApexChart from 'react-apexcharts';

interface ChartOneProps {
    selectedCategory: string;
}

const ComplaintTrendChart: React.FC<ChartOneProps> = ({ selectedCategory }) => {
    // 지표 표시 상태 관리
    const [visibility, setVisibility] = useState({
        received: true,
        completed: true,
        growth: true,
        backlog: true
    });

    const [trendData, setTrendData] = useState<{ date: string, received: number, completed: number, backlog: number }[]>([]);
    const [backlogStats, setBacklogStats] = useState({ current: 0, changePercent: 0, changeType: 'increase' });

    useEffect(() => {
        // 백엔드 API 호출: /api/complaints/stats/dashboard
        const url = `/api/complaints/stats/dashboard?category=${encodeURIComponent(selectedCategory)}`;

        fetch(url)
            .then(res => res.json())
            .then(data => {
                // Backend returns { monthlyTrend: [{ month: '2024-01', received: 10, completed: 5 }, ...], ... }
                // We need { date: string, count: number } for the chart
                if (data && data.monthlyTrend && data.summary) {
                    const trends = data.monthlyTrend; // sorted by date asc
                    const currentProcessing = data.summary.received + data.summary.processing; // Anchor point (Total Pending)

                    // Calculate Backlog backwards
                    // Backlog[i] = Backlog[i-1] + Received[i] - Completed[i]
                    // => Backlog[i-1] = Backlog[i] - Received[i] + Completed[i]

                    const processedTrends = [];
                    let tempBacklog = currentProcessing;

                    // Process from last to first
                    for (let i = trends.length - 1; i >= 0; i--) {
                        const item = trends[i];
                        processedTrends.unshift({
                            date: item.month,
                            received: item.received,
                            completed: item.completed,
                            backlog: tempBacklog
                        });

                        // Prepare backlog for previous month
                        tempBacklog = tempBacklog - item.received + item.completed;
                        if (tempBacklog < 0) tempBacklog = 0; // Safety clamp
                    }

                    setTrendData(processedTrends);

                    // Calculate Backlog Change (Last vs Prev)
                    if (processedTrends.length >= 2) {
                        const last = processedTrends[processedTrends.length - 1].backlog;
                        const prev = processedTrends[processedTrends.length - 2].backlog;
                        const change = last - prev;
                        const percent = prev === 0 ? 0 : ((change / prev) * 100);
                        setBacklogStats({
                            current: last,
                            changePercent: Math.abs(parseFloat(percent.toFixed(1))),
                            changeType: change >= 0 ? 'increase' : 'decrease'
                        });
                    } else if (processedTrends.length === 1) {
                        setBacklogStats({
                            current: processedTrends[0].backlog,
                            changePercent: 0,
                            changeType: 'increase'
                        });
                    }
                }
            })
            .catch(err => console.error("Failed to fetch dashboard trends:", err));
    }, [selectedCategory]);

    const receivedData = trendData.map(d => d.received);
    const completedData = trendData.map(d => d.completed);
    const backlogData = trendData.map(d => d.backlog);
    const dates = trendData.map(d => d.date);

    // 1) 증감률 클램프 설정 (가상효과 극대화)
    const GROWTH_CLAMP = 50; // -50% ~ +50% 범위로 제한

    const growthData = receivedData.map((val, i) => {
        if (i === 0) return 0;
        const prev = receivedData[i - 1];
        if (!prev || prev === 0) return 0;
        const rawGrowth = parseFloat(((val - prev) / prev * 100).toFixed(1));
        // 클램프 적용
        return Math.max(-GROWTH_CLAMP, Math.min(GROWTH_CLAMP, rawGrowth));
    });


    // 임시 데이터 (백로그 지표 추가)
    const series = [
        ...(visibility.received ? [{ name: '접수 건수', type: 'area', data: receivedData }] : []),
        ...(visibility.completed ? [{ name: '완료 건수', type: 'line', data: completedData }] : []),
        ...(visibility.growth ? [{ name: '증감률 (%)', type: 'column', data: growthData }] : []), // column으로 변경
        ...(visibility.backlog ? [{ name: '미처리 잔량 (Backlog)', type: 'line', data: backlogData }] : []),
    ];

    // 선택된 지표에 따라 색상과 스타일 동적 생성
    const activeColors = [
        ...(visibility.received ? ['#3B82F6'] : []),
        ...(visibility.completed ? ['#10B981'] : []),
        ...(visibility.growth ? ['#FF3B30'] : []),
        ...(visibility.backlog ? ['#F59E0B'] : []), // 백로그: 주황색
    ];

    const activeMarkersSize = [
        ...(visibility.received ? [5] : []),
        ...(visibility.completed ? [5] : []),
        ...(visibility.growth ? [0] : []), // Column은 마커 제외
        ...(visibility.backlog ? [6] : []),
    ];

    const options = {
        legend: { show: false },
        colors: activeColors,
        annotations: {
            yaxis: visibility.growth ? [{
                y: 0,
                yAxisIndex: 1, // 증감률 축에 고정
                borderColor: '#FF3B30',
                strokeDashArray: 4,
                width: '100%',
                label: {
                    text: '0%',
                    position: 'right',
                    offsetX: -10,
                    style: { color: '#fff', background: '#FF3B30', fontWeight: 700 }
                }
            }] : []
        },
        chart: {
            fontFamily: 'Pretendard, sans-serif',
            height: 350,
            type: 'line' as const,
            dropShadow: {
                enabled: true,
                color: '#000',
                top: 5,
                blur: 8,
                left: 0,
                opacity: 0.15,
                enabledOnSeries: visibility.backlog ? [activeColors.length - 1] : [] // 백로그 선에만 그림자 효과를 주어 '앞에 있는 느낌' 강화
            },
            toolbar: { show: false },
        },
        stroke: {
            width: [
                ...(visibility.received ? [3] : []),
                ...(visibility.completed ? [3] : []),
                ...(visibility.growth ? [0] : []), // Column stroke width는 0으로
                ...(visibility.backlog ? [4] : []),
            ],
            curve: 'smooth' as const,
            dashArray: [
                ...(visibility.received ? [0] : []),
                ...(visibility.completed ? [0] : []),
                ...(visibility.growth ? [0] : []),
                ...(visibility.backlog ? [4] : []),
            ]
        },
        fill: {
            type: 'gradient',
            gradient: {
                shade: 'light',
                type: 'vertical',
                shadeIntensity: 0.5,
                inverseColors: false,
                opacityFrom: [
                    ...(visibility.received ? [0.45] : []),
                    ...(visibility.completed ? [0.45] : []),
                    ...(visibility.growth ? [0.85] : []),
                    ...(visibility.backlog ? [1.0] : []),
                ],
                opacityTo: [
                    ...(visibility.received ? [0.1] : []),
                    ...(visibility.completed ? [0.1] : []),
                    ...(visibility.growth ? [0.85] : []),
                    ...(visibility.backlog ? [1.0] : []),
                ],
                stops: [0, 100]
            }
        },
        grid: {
            borderColor: '#f1f5f9',
            strokeDashArray: 4,
            xaxis: { lines: { show: true } },
            yaxis: { lines: { show: true } }
        },
        dataLabels: { enabled: false },
        markers: {
            size: activeMarkersSize,
            colors: '#fff',
            strokeColors: activeColors,
            strokeWidth: 3,
            hover: { size: 9 }
        },
        xaxis: {
            type: 'category' as const,
            categories: dates,
            axisBorder: { show: false },
            axisTicks: { show: false },
            labels: { style: { colors: '#64748B', fontWeight: 700 } }
        },
        yaxis: [
            {
                seriesName: ['접수 건수', '완료 건수', '미처리 잔량 (Backlog)'],
                show: visibility.received || visibility.completed || visibility.backlog,
                title: { text: '건수', style: { color: '#64748B', fontWeight: 800 } },
                labels: { style: { colors: '#64748B', fontWeight: 700 } },
                min: 0,
            },
            {
                seriesName: '증감률 (%)',
                opposite: true,
                show: visibility.growth,
                title: { text: '증감률 (%)', style: { color: '#FF3B30', fontWeight: 800 } },
                labels: { style: { colors: '#FF3B30', fontWeight: 700 } },
                min: -GROWTH_CLAMP,
                max: GROWTH_CLAMP,
                tickAmount: 5,
            }
        ],
        tooltip: {
            theme: 'light',
            shared: true,
            intersect: false,
            y: {
                formatter: (val: number, { seriesIndex }: any) => {
                    const seriesName = series[seriesIndex]?.name;
                    if (seriesName === '증감률 (%)') return `${val}%`;
                    return `${val} 건`;
                }
            }
        }
    };

    const toggleSeries = (key: keyof typeof visibility) => {
        setVisibility(prev => ({ ...prev, [key]: !prev[key] }));
    };

    return (
        <div className="w-full" style={{ backgroundColor: 'white', border: '1px solid #E2E8F0', borderRadius: '16px', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05)', padding: '24px', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                    <div style={{ width: '4px', height: '24px', backgroundColor: '#3B82F6', borderRadius: '2px', marginRight: '12px' }}></div>
                    <h5 style={{ fontSize: '20px', fontWeight: '950', color: '#1e293b' }}>
                        [{selectedCategory}] 상세 분석 및 트렌드
                    </h5>
                </div>

                {/* Backlog Summary Overlay */}
                <div style={{ textAlign: 'right', backgroundColor: '#FFF7ED', padding: '12px 20px', borderRadius: '12px', border: '1px solid #FFEDD5' }}>
                    <div style={{ fontSize: '13px', fontWeight: '800', color: '#9A3412', marginBottom: '4px' }}>현재 미처리 잔량 (Backlog)</div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                        <span style={{ fontSize: '24px', fontWeight: '950', color: '#EA580C' }}>{backlogStats.current}</span>
                        <span style={{ fontSize: '14px', fontWeight: '900', color: backlogStats.changeType === 'increase' ? '#C2410C' : '#16A34A' }}>
                            <span style={{ marginRight: '4px' }}>{backlogStats.changeType === 'increase' ? '▲' : '▼'}</span>
                            {backlogStats.changePercent}% <span style={{ fontSize: '12px', color: '#9A3412', fontWeight: '700' }}>(전월 대비)</span>
                        </span>
                    </div>
                </div>
            </div>

            <div style={{ flex: 1, minHeight: '350px' }}>
                <ReactApexChart options={options as any} series={series} type="line" height={350} />
            </div>

            {/* Custom Interactive Legend / Filters */}
            <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '24px', borderTop: '1px solid #f1f5f9', paddingTop: '24px', flexWrap: 'wrap' }}>
                <button
                    onClick={() => toggleSeries('received')}
                    style={{
                        display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', border: 'none', background: 'none',
                        opacity: visibility.received ? 1 : 0.4, transition: 'all 0.2s'
                    }}
                >
                    <div style={{ width: '16px', height: '16px', borderRadius: '4px', backgroundColor: '#3B82F6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {visibility.received && <div style={{ width: '6px', height: '6px', backgroundColor: 'white', borderRadius: '1px' }}></div>}
                    </div>
                    <span style={{ fontSize: '15px', fontWeight: '900', color: '#1e293b' }}>접수</span>
                </button>

                <button
                    onClick={() => toggleSeries('completed')}
                    style={{
                        display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', border: 'none', background: 'none',
                        opacity: visibility.completed ? 1 : 0.4, transition: 'all 0.2s'
                    }}
                >
                    <div style={{ width: '16px', height: '16px', borderRadius: '4px', backgroundColor: '#10B981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {visibility.completed && <div style={{ width: '6px', height: '6px', backgroundColor: 'white', borderRadius: '1px' }}></div>}
                    </div>
                    <span style={{ fontSize: '15px', fontWeight: '900', color: '#1e293b' }}>완료</span>
                </button>

                <button
                    onClick={() => toggleSeries('growth')}
                    style={{
                        display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', border: 'none', background: 'none',
                        opacity: visibility.growth ? 1 : 0.4, transition: 'all 0.2s'
                    }}
                >
                    <div style={{ width: '16px', height: '16px', borderRadius: '4px', backgroundColor: '#FF3B30', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {visibility.growth && <div style={{ width: '6px', height: '6px', backgroundColor: 'white', borderRadius: '1px' }}></div>}
                    </div>
                    <span style={{ fontSize: '15px', fontWeight: '900', color: '#1e293b' }}>증감률</span>
                </button>

                <button
                    onClick={() => toggleSeries('backlog')}
                    style={{
                        display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', border: 'none', background: 'none',
                        opacity: visibility.backlog ? 1 : 0.4, transition: 'all 0.2s'
                    }}
                >
                    <div style={{ width: '16px', height: '16px', borderRadius: '4px', backgroundColor: '#F59E0B', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {visibility.backlog && <div style={{ width: '6px', height: '6px', backgroundColor: 'white', borderRadius: '1px' }}></div>}
                    </div>
                    <span style={{ fontSize: '15px', fontWeight: '900', color: '#1e293b' }}>Backlog(잔량)</span>
                </button>
            </div>
        </div>
    );
};

export default ComplaintTrendChart;
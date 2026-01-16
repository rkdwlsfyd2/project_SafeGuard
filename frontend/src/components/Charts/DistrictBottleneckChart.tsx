/**
 * 자치구별 병목 현황 분석 차트 (Horizontal Bar Chart)
 * 
 * 주요 기능:
 * 1. '미처리(unprocessed)' 또는 '지연(overdue)' 민원 상위 10개 자치구 랭킹 표시
 * 2. 타입(type) prop에 따라 서로 다른 색상 테마(Blue/Red) 적용
 * 3. refreshKey 연동을 통한 실시간 순위 변동 반영
 */
import React, { useState, useEffect } from 'react';
import ReactApexChart from 'react-apexcharts';

interface DistrictBottleneckChartProps {
    type: 'unprocessed' | 'overdue';
    refreshKey?: number;
}

const DistrictBottleneckChart: React.FC<DistrictBottleneckChartProps> = ({ type, refreshKey }) => {
    const [data, setData] = useState<{ x: string, y: number }[]>([]);

    useEffect(() => {
        // 대시보드 통계 API 호출 (병목 데이터 포함)
        fetch(`/api/complaints/stats/dashboard`)
            .then(res => res.json())
            .then(data => {
                let sourceData = [];
                if (type === 'unprocessed') {
                    sourceData = data.bottleneck || [];
                } else {
                    sourceData = data.bottleneckOverdue || [];
                }

                // 차트 데이터 구조 {x, y}에 맞춰 포맷팅
                const formatted = sourceData.map((d: any) => ({
                    x: d.name,
                    y: parseInt(d.count)
                }));
                setData(formatted);
            })
            .catch(err => console.error("Failed to fetch bottleneck stats:", err));
    }, [type, refreshKey]);



    const currentData = data;
    const mainColor = type === 'unprocessed' ? '#3B82F6' : '#EF4444';
    const bgColor = type === 'unprocessed' ? '#EFF6FF' : '#FEF2F2';
    const title = type === 'unprocessed' ? '구별 미처리 TOP 10' : '구별 지연(Overdue) TOP 10';
    const maxY = Math.max(...currentData.map((d) => d.y));
    const xMax = Math.ceil(maxY * 1.3); // 여백 확보를 위한 배수 조정 (1.3배)

    const options = {
        chart: {
            type: 'bar' as const,
            toolbar: { show: false },
            fontFamily: 'Pretendard, sans-serif'
        },
        plotOptions: {
            bar: {
                borderRadius: 4,
                horizontal: true,
                barHeight: '85%',
                distributed: false,
                dataLabels: { position: 'top' }
            }
        },
        colors: [mainColor],
        dataLabels: {
            enabled: true,
            textAnchor: 'start' as const,
            style: { colors: ['#1e293b'], fontWeight: 800 },
            formatter: (val: number) => `${val}건`,
            offsetX: 14
        },
        xaxis: {
            categories: currentData.map(d => d.x),
            labels: { show: false },
            axisBorder: { show: false },
            axisTicks: { show: false },
            max: xMax,
        },
        yaxis: {
            labels: {
                style: { colors: '#475569', fontSize: '14px', fontWeight: 800 },
                padding: 14,
            }
        },
        grid: {
            show: false,
            padding: { left: 10, right: 30 }
        },
        tooltip: {
            theme: 'light',
            y: { formatter: (val: number) => `${val} 건` }
        }
    };

    const series = [{
        name: type === 'unprocessed' ? '미처리 건수' : '지연 건수',
        data: currentData.map(d => d.y)
    }];



    return (
        <div style={{
            backgroundColor: 'white',
            borderRadius: '16px',
            padding: '24px',
            border: `1px solid ${type === 'unprocessed' ? '#E2E8F0' : '#FECDD3'}`,
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.05)',
            height: '100%',
            display: 'flex',
            flexDirection: 'column'
        }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px', gap: '10px' }}>
                <div style={{ width: '4px', height: '20px', backgroundColor: mainColor, borderRadius: '2px' }}></div>
                <h4 style={{ fontSize: '18px', fontWeight: '900', color: '#1e293b' }}>{title}</h4>
                <span style={{ fontSize: '12px', color: '#94A3B8', fontWeight: '600', marginLeft: 'auto' }}>실시간 집계</span>
            </div>
            <div style={{ flex: 1, minHeight: '300px' }}>
                <ReactApexChart options={options as any} series={series} type="bar" height="100%" />
            </div>
        </div>
    );
};

export default DistrictBottleneckChart;
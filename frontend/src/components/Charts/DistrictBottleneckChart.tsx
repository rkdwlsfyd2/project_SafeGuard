import React from 'react';
import ReactApexChart from 'react-apexcharts';

interface DistrictBottleneckChartProps {
    type: 'unprocessed' | 'overdue';
}

const DistrictBottleneckChart: React.FC<DistrictBottleneckChartProps> = ({ type }) => {
    // 임시 데이터 (실제 데이터 연동 필요)
    const unprocessedData = [
        { x: '강남구', y: 145 },
        { x: '서초구', y: 122 },
        { x: '송파구', y: 118 },
        { x: '영등포구', y: 105 },
        { x: '강서구', y: 98 },
        { x: '마포구', y: 85 },
        { x: '관악구', y: 76 },
        { x: '노원구', y: 72 },
        { x: '은평구', y: 68 },
        { x: '용산구', y: 64 },
    ];

    const overdueData = [
        { x: '강남구', y: 24 },
        { x: '동작구', y: 18 },
        { x: '강서구', y: 15 },
        { x: '종로구', y: 14 },
        { x: '마포구', y: 12 },
        { x: '서초구', y: 10 },
        { x: '구로구', y: 9 },
        { x: '금천구', y: 8 },
        { x: '성동구', y: 7 },
        { x: '중구', y: 6 },
    ];

    const currentData = type === 'unprocessed' ? unprocessedData : overdueData;
    const mainColor = type === 'unprocessed' ? '#3B82F6' : '#EF4444';
    const bgColor = type === 'unprocessed' ? '#EFF6FF' : '#FEF2F2';
    const title = type === 'unprocessed' ? '구별 미처리 TOP 10' : '구별 지연(Overdue) TOP 10';

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
                barHeight: '60%',
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
            offsetX: 10
        },
        xaxis: {
            categories: currentData.map(d => d.x),
            labels: { show: false },
            axisBorder: { show: false },
            axisTicks: { show: false }
        },
        yaxis: {
            labels: {
                style: { colors: '#475569', fontSize: '14px', fontWeight: 800 }
            }
        },
        grid: {
            show: false,
            padding: { left: 0, right: 40 }
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

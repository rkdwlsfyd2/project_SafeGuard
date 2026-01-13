import React, { useState } from 'react';
import ReactApexChart from 'react-apexcharts';

'차트 파일2'
'유형 도넛차트에서 유형 클릭시 나오는 오른쪽 꺾은선 그래프 차트'

interface ChartOneProps {
    selectedCategory: string;
}

const ComplaintTrendChart: React.FC<ChartOneProps> = ({ selectedCategory }) => {
    // Generate different data based on category name for demonstration
    const getCategoryData = (name: string) => {
        const seed = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        return Array.from({ length: 10 }, (_, i) => Math.floor(Math.abs(Math.sin(seed + i)) * 100));
    };

    const series = [
        { name: `${selectedCategory} 접수`, data: getCategoryData(selectedCategory) }
    ];

    const [options] = useState({
        legend: { show: false, position: 'top' as const, horizontalAlign: 'left' as const },
        colors: ['#3B82F6'],
        chart: {
            fontFamily: 'Satoshi, sans-serif',
            height: 335,
            type: 'area' as const,
            dropShadow: { enabled: true, color: '#623CEA14', top: 10, blur: 4, left: 0, opacity: 0.1 },
            toolbar: { show: false },
        },
        responsive: [{ breakpoint: 1024, options: { chart: { height: 300 } } }],
        stroke: { width: [2, 2], curve: 'straight' as const },
        grid: { xaxis: { lines: { show: true } }, yaxis: { lines: { show: true } } },
        dataLabels: { enabled: false },
        markers: { size: 4, colors: '#fff', strokeColors: ['#3B82F6', '#10B981'], strokeWidth: 3, hover: { size: 7 } },
        xaxis: {
            type: 'category' as const,
            categories: ['12/25', '12/26', '12/27', '12/28', '12/29', '12/30', '12/31', '01/01', '01/02', '01/03'],
            axisBorder: { show: false },
            axisTicks: { show: false },
        },
        yaxis: { title: { style: { fontSize: '0px' } } },
    });

    return (
        <div className="w-full" style={{ backgroundColor: 'white', border: '1px solid #E2E8F0', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: '16px' }}>
                <h5 style={{ fontSize: '20px', fontWeight: '900', color: '#1e293b' }}>
                    [{selectedCategory}] 상세 현황
                </h5>
            </div>
            <div>
                <div id="chartOne" className="-ml-5">
                    <ReactApexChart options={options} series={series} type="area" height={350} />
                </div>
            </div>

            <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '80px', borderTop: '2px solid #f1f5f9', paddingTop: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '24px', color: '#3B82F6' }}>●</span>
                    <span style={{ fontSize: '18px', fontWeight: '900', color: '#1e293b' }}>접수</span>
                </div>
            </div>
        </div>
    );
};

export default ComplaintTrendChart;

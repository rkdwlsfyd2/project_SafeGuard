/**
 * 지역별 또는 기관별 민원 현황 및 비중을 보여주는 도넛 차트 및 요약 테이블 컴포넌트입니다.
 */
import React, { useState } from 'react';
import ReactApexChart from 'react-apexcharts';

const RegionStatsChart: React.FC = () => {
    const [viewType, setViewType] = useState<'institution' | 'region'>('region');

    // Mock Data for Regions
    const regionSeries = [7417, 4087, 1648, 1500, 1316];
    const regionLabels = ['경기', '서울', '인천', '부산', '경남'];
    // Red, Orange, Teal, Blue, Grey
    const regionColors = ['#FF6B6B', '#FFB84C', '#20B2AA', '#5C7CFA', '#CED4DA'];

    // Mock Data for Institutions (Just to have something when toggled)
    const instSeries = [5000, 3000, 2000, 1000, 500];
    const instLabels = ['경찰청', '국토부', '행안부', '환경부', '교육부'];
    // Blue shades
    const instColors = ['#3B82F6', '#60A5FA', '#93C5FD', '#BFDBFE', '#DBEAFE'];

    const currentSeries = viewType === 'region' ? regionSeries : instSeries;
    const currentLabels = viewType === 'region' ? regionLabels : instLabels;
    const currentColors = viewType === 'region' ? regionColors : instColors;

    const total = currentSeries.reduce((a, b) => a + b, 0);
    const maxVal = Math.max(...currentSeries);
    const maxIndex = currentSeries.indexOf(maxVal);
    const maxLabel = currentLabels[maxIndex];

    const options = {
        chart: {
            type: 'donut' as const,
            fontFamily: 'Satoshi, sans-serif',
        },
        colors: currentColors,
        labels: currentLabels,
        legend: { show: false },
        plotOptions: {
            pie: {
                donut: {
                    size: '75%',
                    labels: {
                        show: true,
                        name: { show: false },
                        value: { show: false },
                        total: {
                            show: true,
                            showAlways: true,
                            label: '최다민원신청',
                            fontSize: '14px',
                            fontWeight: 600,
                            color: '#64748B',
                            formatter: function () {
                                return ''; // We will render custom label via overlay or just rely on the default if needed, but the design shows specific text.
                                // ReactApexCharts donut label customization is tricky for multi-line HTML. 
                                // Let's use absolute positioning overlay for better control like previous charts if needed, 
                                // or use the total label trick. For now, empty string to hide default.
                            }
                        }
                    }
                }
            }
        },
        dataLabels: { enabled: true, dropShadow: { enabled: false } }, // Maybe disable dataLabels for clean look like image
        tooltip: {
            enabled: true,
            y: {
                formatter: function (val: number) {
                    return val.toLocaleString() + " 건"
                }
            }
        }
    };

    // Table Data (Mock)
    const tableData = viewType === 'region' ? [
        { name: '경기', count: 7417, change: 1.7, isUp: true },
        { name: '서울', count: 4087, change: -2.2, isUp: false },
        { name: '인천', count: 1648, change: -11.3, isUp: false },
        { name: '부산', count: 1500, change: 6.8, isUp: true },
        { name: '경남', count: 1316, change: 4.9, isUp: true },
    ] : [
        { name: '경찰청', count: 5000, change: 5.2, isUp: true },
        { name: '국토부', count: 3000, change: 1.1, isUp: true },
        { name: '행안부', count: 2000, change: -0.5, isUp: false },
        { name: '환경부', count: 1000, change: 0.0, isUp: true },
        { name: '교육부', count: 500, change: -1.2, isUp: false },
    ];

    return (
        <div className="w-full" style={{
            backgroundColor: 'white',
            border: '1px solid #E2E8F0',
            borderRadius: '16px',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
            padding: '24px',
            height: '100%',
            display: 'flex',
            flexDirection: 'column'
        }}>
            {/* Header */}
            <div className="flex justify-between items-center mb-6 flex-shrink-0">
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '4px', height: '20px', backgroundColor: '#3B82F6', borderRadius: '2px' }}></div>
                    <h5 style={{ fontSize: '20px', fontWeight: '950', color: '#1e293b' }}>지역·기관별 현황</h5>
                </div>
                <div className="flex items-center gap-2 bg-slate-100 rounded-lg p-1">
                    <button
                        onClick={() => setViewType('institution')}
                        className={`px-3 py-1 text-xs font-extrabold rounded-md transition-all ${viewType === 'institution' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                        기관별
                    </button>
                    <button
                        onClick={() => setViewType('region')}
                        className={`px-3 py-1 text-xs font-extrabold rounded-md transition-all ${viewType === 'region' ? 'bg-white text-red-500 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                        지역별
                    </button>
                </div>
            </div>

            {/* Chart Area */}
            <div className="flex-1 min-h-0 relative flex justify-center items-center">
                {/* Center Overlay Text */}
                <div className="absolute inset-0 flex flex-col justify-center items-center pointer-events-none" style={{ paddingTop: '0px' }}>
                    <div className="text-slate-400 text-xs font-bold mb-1 tracking-tight">최다민원신청</div>
                    <div className="text-red-500 text-xl font-black mb-1 tracking-tight">'{maxLabel}'</div>
                    <div className="text-slate-800 text-3xl font-black tracking-tighter">{maxVal.toLocaleString()}</div>
                </div>

                <ReactApexChart options={{ ...options, dataLabels: { enabled: false } }} series={currentSeries} type="donut" height="100%" width="100%" />
            </div>

            {/* Table Area */}
            <div className="mt-6 flex-shrink-0 w-full overflow-hidden border border-slate-200 rounded-lg">
                <table className="w-full text-center border-collapse">
                    <thead>
                        <tr className="bg-slate-50 border-b border-slate-200">
                            {tableData.map((item, idx) => (
                                <th key={idx} className={`py-2 text-xs font-bold text-slate-500 ${idx !== tableData.length - 1 ? 'border-r border-slate-200' : ''}`}>
                                    {item.name}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        <tr className="border-b border-slate-100">
                            {tableData.map((item, idx) => (
                                <td key={idx} className={`py-2 text-sm font-black text-slate-800 ${idx !== tableData.length - 1 ? 'border-r border-slate-100' : ''}`}>
                                    {item.count.toLocaleString()}
                                    <span className="text-[10px] font-normal text-slate-400 ml-0.5">건</span>
                                </td>
                            ))}
                        </tr>
                        <tr>
                            {tableData.map((item, idx) => (
                                <td key={idx} className={`py-2 ${idx !== tableData.length - 1 ? 'border-r border-slate-100' : ''}`}>
                                    <div className={`text-[11px] font-bold flex justify-center items-center gap-0.5 ${item.isUp ? 'text-rose-500' : 'text-blue-500'}`}>
                                        <span>{item.isUp ? '▲' : '▼'}</span>
                                        {Math.abs(item.change)}%
                                    </div>
                                </td>
                            ))}
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default RegionStatsChart;

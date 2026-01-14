/**
 * 분류별 민원 통계 및 순위를 보여주는 도넛 차트 및 리스트 컴포넌트입니다.
 */
import React, { useState } from 'react';
import ReactApexChart from 'react-apexcharts';

// 민원 유형별 통계 데이터 (이미지 기반 10개 확장)
const MOCK_TYPE_DATA = [
    { name: '교통', value: 10108, change: -4.7, rank: 1 },
    { name: '행정·안전', value: 1516, change: -10.0, rank: 2 },
    { name: '도로', value: 1417, change: 16.4, rank: 3 },
    { name: '주택·건축', value: 858, change: -17.9, rank: 4 },
    { name: '산업·통상', value: 707, change: 7.0, rank: 5 },
    { name: '환경', value: 494, change: -27.0, rank: 6 },
    { name: '경찰·검찰·법원', value: 406, change: 0.5, rank: 7 },
    { name: '교육', value: 381, change: 2.7, rank: 8 },
    { name: '관광', value: 290, change: 14.6, rank: 9 },
    { name: '보건', value: 286, change: -32.4, rank: 10 },
    { name: '정보통신', value: 265, change: 4.2, rank: 11 },
    { name: '산림·농업', value: 240, change: -1.5, rank: 12 },
    { name: '상하수도', value: 215, change: 0.8, rank: 13 },
    { name: '재난·안전', value: 198, change: -2.4, rank: 14 },
    { name: '공원·녹지', value: 175, change: 5.5, rank: 15 },
    { name: '도시계획', value: 152, change: -0.9, rank: 16 },
    { name: '수산·해양', value: 135, change: 1.2, rank: 17 },
    { name: '과학기술', value: 118, change: -3.1, rank: 18 },
    { name: '외교·안보', value: 102, change: 0.4, rank: 19 },
    { name: '기획·예산', value: 85, change: -1.8, rank: 20 },
];

interface ChartTwoProps {
    selectedCategory: string;
    onSelect: (category: string) => void;
}

const ComplaintCategoryChart: React.FC<ChartTwoProps> = ({ selectedCategory, onSelect }) => {
    const [state] = useState({
        series: [10108, 1516, 1417, 858, 707], // TOP 5 시각화용
        options: {
            chart: {
                type: 'donut' as const,
                events: {
                    dataPointSelection: (event: any, chartContext: any, config: any) => {
                        const category = config.w.config.labels[config.dataPointIndex];
                        onSelect(category);
                    }
                }
            },
            colors: ['#A0C4FF', '#B2F2BB', '#FFEC99', '#FFD8A8', '#FFB1B1'],
            labels: ['교통', '행정·안전', '도로', '주택·건축', '산업·통상'],
            legend: { show: false },
            plotOptions: {
                pie: {
                    donut: {
                        size: '50%',
                        labels: {
                            show: true,
                            name: { show: true, fontSize: '16px', fontWeight: 700, color: '#1E293B', offsetY: -10 },
                            value: { show: true, fontSize: '24px', fontWeight: 900, color: '#0F172A', offsetY: 10 },
                            total: {
                                show: true,
                                label: '민원 분류',
                                fontSize: '13px',
                                fontWeight: 700,
                                color: '#475569',
                                formatter: () => 'TOP 5'
                            }
                        }
                    }
                },
            },
            dataLabels: {
                enabled: true,
                formatter: function (val: any, opts: any) {
                    return opts.w.globals.labels[opts.seriesIndex];
                },
                style: {
                    fontSize: '14px',
                    fontFamily: 'Satoshi, sans-serif',
                    fontWeight: 900,
                    colors: ['#3e434aff']
                },
                dropShadow: { enabled: false }
            },
            responsive: [{ breakpoint: 2600, options: { chart: { width: 380 } } }, { breakpoint: 640, options: { chart: { width: 240 } } }],
        }
    });

    return (
        <div className="w-full" style={{
            backgroundColor: 'white',
            border: '1px solid #E2E8F0',
            borderRadius: '12px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.08), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            padding: '32px',
            height: '100%',
            display: 'flex',
            flexDirection: 'column'
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '32px' }}>
                <div style={{ width: '4px', height: '20px', backgroundColor: '#FF8787', borderRadius: '2px', flexShrink: 0 }}></div>
                <h5 style={{ fontSize: '20px', fontWeight: '950', color: '#1e293b' }}>분류별 민원 통계</h5>
            </div>

            <div
                className="mb-6 w-full"
                style={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center'
                }}
            >
                <div
                    id="typeChart"
                    className="cursor-pointer hover:scale-[1.02] transition-transform"
                    style={{
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center'
                    }}
                >
                    <ReactApexChart
                        options={state.options}
                        series={state.series}
                        type="donut"
                        width={440}
                        height={440}
                    />
                </div>
            </div>

            <div className="mt-4 pt-6 border-t border-slate-100 flex-1 flex flex-column">
                <div className="flex items-center justify-center gap-2 mb-8">
                    <h6 style={{ fontSize: '13px', fontWeight: '800', color: '#64748B', letterSpacing: '-0.02em' }}> ▼ 분류별 민원신청 건수 및 전일대비 증감률(%)</h6>
                </div>

                <div className="custom-scrollbar" style={{ height: '520px', overflowY: 'auto', paddingRight: '12px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {MOCK_TYPE_DATA.map((item, i) => (
                            <div
                                key={i}
                                onClick={() => onSelect(item.name)}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    padding: '14px 20px',
                                    borderRadius: '16px',
                                    cursor: 'pointer',
                                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                    backgroundColor: selectedCategory === item.name ? '#EBF8FF' : i % 2 === 0 ? 'white' : '#F8FAFC',
                                    border: selectedCategory === item.name ? '2px solid #A0C4FF' : '1px solid transparent',
                                    boxShadow: selectedCategory === item.name ? '0 10px 15px -3px rgba(160, 196, 255, 0.2)' : 'none',
                                    transform: selectedCategory === item.name ? 'translateX(6px)' : 'none'
                                }}
                                className="hover:bg-slate-50/80 group"
                            >
                                {/* Rank Badge */}
                                <div style={{
                                    width: '36px',
                                    height: '36px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    borderRadius: '12px',
                                    fontSize: '16px',
                                    fontWeight: '950',
                                    marginRight: '20px',
                                    backgroundColor: item.rank <= 5 ? '#A0C4FF' : '#E2E8F0',
                                    color: 'white',
                                    boxShadow: item.rank <= 5 ? '0 4px 6px rgba(160, 196, 255, 0.4)' : 'none',
                                    flexShrink: 0
                                }}>
                                    {item.rank}
                                </div>

                                {/* Category Name */}
                                <div style={{ flex: 1, fontSize: '16.5px', fontWeight: '850', color: '#1E293B', whiteSpace: 'nowrap' }}>
                                    <span className="group-hover:text-blue-600 transition-colors">{item.name}</span>
                                    {selectedCategory === item.name && (
                                        <span className="ml-2 text-[10px] text-[#2563EB] font-black bg-blue-100/50 px-2 py-0.5 rounded-full border border-blue-200">선택됨</span>
                                    )}
                                </div>

                                {/* Value & Change */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexShrink: 0 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', minWidth: '100px', justifyContent: 'flex-end' }}>
                                        <span style={{ fontSize: '17px', fontWeight: '900', color: '#334155' }}>{item.value.toLocaleString()}</span>
                                        <span style={{ fontSize: '11px', fontWeight: '600', color: '#94A3B8' }}>건</span>
                                    </div>
                                    <div style={{
                                        minWidth: '95px',
                                        textAlign: 'center',
                                        fontSize: '13.5px',
                                        fontWeight: '950',
                                        color: item.change > 0 ? '#EF4444' : '#3B82F6',
                                        padding: '5px 10px',
                                        borderRadius: '8px',
                                        backgroundColor: item.change > 0 ? '#FEF2F2' : '#EFF6FF',
                                        border: '1px solid currentColor',
                                        whiteSpace: 'nowrap',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '2px',
                                        flexShrink: 0
                                    }}>
                                        <span style={{ fontSize: '11px', display: 'flex', alignItems: 'center' }}>{item.change > 0 ? '▲' : '▼'}</span>
                                        <span style={{ letterSpacing: '-0.5px' }}>{Math.abs(item.change)}%</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ComplaintCategoryChart;

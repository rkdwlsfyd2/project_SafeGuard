/**
 * 분류별 민원 통계 및 순위 차트 (Donut Chart + List)
 * 
 * 주요 기능:
 * 1. Chart: 상위 5개 민원 유형의 비중을 도넛 차트로 시각화
 * 2. List: 전체 민원 유형의 접수 건수 및 전일 대비 증감율을 리스트로 표시
 * 3. Interaction: 차트/리스트 클릭 시 해당 카테고리로 대시보드 필터링 적용
 * 4. UI: '전체 보기' 버튼 제공 및 리스트 스크롤 처리로 편의성 강화
 */
import React, { useState, useEffect } from 'react';
import ReactApexChart from 'react-apexcharts';
import { RefreshCcw } from 'lucide-react';
import { complaintsAPI } from '../../utils/api';



// 민원 유형별 통계 데이터 (이미지 기반 10개 확장) - State로 대체됨
// const MOCK_TYPE_DATA = [ ... ];

interface ChartTwoProps {
    selectedCategory: string;
    onSelect: (category: string) => void;
    refreshKey?: number;
}

const ComplaintCategoryChart: React.FC<ChartTwoProps> = ({ selectedCategory, onSelect, refreshKey }) => {
    const [categoryData, setCategoryData] = useState<any[]>([]);

    useEffect(() => {
        const params: any = {};
        if (selectedCategory !== '전체') params.category = selectedCategory;

        complaintsAPI.getDashboardStats(params)
            .then(data => {
                if (data && data.categoryStats) {
                    // Backend returns { categoryStats: [{ name: '불법주정차', value: 10 }, ...], ... }
                    const transformed = data.categoryStats.map((d: any, i: number) => ({
                        name: d.name,
                        value: d.value,
                        change: d.change || 0, // 백엔드에서 제공하는 change 값 사용 (없으면 0)
                        rank: i + 1
                    }));

                    // 값 내림차순 정렬 (이미 되어있을 수 있으나 안전장치)
                    transformed.sort((a: any, b: any) => b.value - a.value);
                    // 정렬 후 순위 재할당
                    transformed.forEach((d: any, i: number) => d.rank = i + 1);

                    setCategoryData(transformed);
                }
            })
            // 데이터 로드 실패 시 에러 로깅
            .catch(err => console.error("Failed to fetch category stats:", err));
    }, [selectedCategory, refreshKey]);

    // 차트용 파생 데이터 (상위 5개)
    const top5 = categoryData.slice(0, 5);
    const chartSeries = top5.map(d => d.value);
    const chartLabels = top5.map(d => d.name);

    const [state, setState] = useState({
        series: [], // useEffect에서 데이터 로드 후 설정됨
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
            labels: [],
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
            // ... 기타 차트 옵션

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
                {/* 전체 보기 버튼: 카테고리가 선택된 상태에서만 노출되어 초기화를 지원 */}
                {selectedCategory !== '전체' && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onSelect('전체');
                        }}
                        style={{
                            marginLeft: 'auto',
                            fontSize: '13px',
                            fontWeight: 700,
                            color: '#64748B',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            padding: '4px 8px',
                            borderRadius: '6px',
                            transition: 'background-color 0.2s'
                        }}
                        className="hover:bg-slate-100/80"
                    >
                        <RefreshCcw size={14} /> 전체 보기
                    </button>
                )}
            </div>

            <div
                className="mb-12 w-full"
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
                        options={{ ...state.options, labels: chartLabels }}
                        series={chartSeries}
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

                {/* 리스트 영역: 고정 높이(680px) 및 스크롤 적용으로 레이아웃 안정성 확보 */}
                <div className="custom-scrollbar" style={{ height: '680px', overflowY: 'auto', paddingRight: '12px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {categoryData.map((item, i) => (
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
                                {/* 순위 뱃지 (Rank Badge) */}
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

                                {/* 카테고리명 (Category Name) */}
                                <div style={{ flex: 1, fontSize: '16.5px', fontWeight: '850', color: '#1E293B', whiteSpace: 'nowrap' }}>
                                    <span className="group-hover:text-blue-600 transition-colors">{item.name}</span>
                                </div>

                                {/* 접수 건수 및 증감율 (Value & Change) */}
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
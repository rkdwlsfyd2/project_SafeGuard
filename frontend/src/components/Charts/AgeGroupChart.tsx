/**
 * 연령별 민원접수 현황 차트 (Vertical Bar Chart)
 * 
 * 주요 기능:
 * 1. 10대부터 60대 이상까지 연령대별 민원 접수 분포 시각화
 * 2. 부모 컴포넌트로부터 전달받은 refreshKey에 따라 실시간 데이터 갱신
 */
import React, { useState, useEffect } from 'react';
import ReactApexChart from 'react-apexcharts';

const AgeGroupChart: React.FC<{ refreshKey?: number }> = ({ refreshKey }) => {
    const [series, setSeries] = useState([{
        name: '민원 접수 건수',
        data: [] as number[]
    }]);

    useEffect(() => {
        fetch('/api/complaints/stats/dashboard')
            .then(res => res.json())
            .then(data => {
                if (data && data.ageGroupStats) {
                    const stats = data.ageGroupStats;
                    const categories = ['10대', '20대', '30대', '40대', '50대', '60대+'];
                    const counts = categories.map(cat => {
                        const found = stats.find((d: any) => d.agegroup === cat);
                        return found ? parseInt(found.count) : 0;
                    });
                    setSeries([{ name: '민원 접수 건수', data: counts }]);
                }
            })
            .catch(err => console.error("Failed to fetch age group stats:", err));
    }, [refreshKey]);


    const options = {
        chart: {
            type: 'bar' as const,
            height: '100%',
            toolbar: { show: false },
            fontFamily: 'Satoshi, sans-serif',
        },
        plotOptions: {
            bar: {
                borderRadius: 8,
                columnWidth: '55%',
                distributed: true,
            }
        },
        colors: ['#A0C4FF', '#B2F2BB', '#FFEC99', '#FFD8A8', '#FFB1B1', '#E2E8F0'],
        dataLabels: {
            enabled: true,
            formatter: (val: number) => val.toLocaleString(),
            style: {
                fontSize: '12px',
                fontWeight: 900,
                colors: ['#334155']
            }
        },
        legend: { show: false },
        xaxis: {
            categories: ['10대', '20대', '30대', '40대', '50대', '60대+'],
            axisBorder: { show: false },
            axisTicks: { show: false },
            labels: {
                style: {
                    colors: '#64748B',
                    fontSize: '12px',
                    fontWeight: 700
                }
            }
        },
        yaxis: {
            title: {
                text: '접수 건수',
                style: { color: '#64748B', fontWeight: 800 }
            },
            labels: {
                style: { colors: '#64748B', fontWeight: 700 }
            }
        },
        grid: {
            borderColor: '#f1f5f9',
            strokeDashArray: 4,
        },
        tooltip: {
            theme: 'light',
            y: {
                formatter: (val: number) => `${val.toLocaleString()} 건`
            }
        }
    };

    return (
        <div style={{
            backgroundColor: 'white',
            border: '1px solid #E2E8F0',
            borderRadius: '16px',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
            padding: '20px',
            height: '100%',
            display: 'flex',
            flexDirection: 'column'
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px', flexShrink: 0 }}>
                <div style={{ width: '4px', height: '20px', backgroundColor: '#3B82F6', borderRadius: '2px', flexShrink: 0 }}></div>
                <h5 style={{ fontSize: '20px', fontWeight: '950', color: '#1e293b' }}>연령별 민원접수 현황</h5>
            </div>

            <div id="ageChart" style={{ flex: 1, minHeight: 0 }}>
                <ReactApexChart options={options} series={series} type="bar" height="100%" />
            </div>
        </div>
    );
};

export default AgeGroupChart;
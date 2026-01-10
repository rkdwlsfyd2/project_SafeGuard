import React, { useState, useEffect } from 'react';

function MyPage() {
    const [myReports, setMyReports] = useState([]);

    useEffect(() => {
        // Normally would fetch only current user's reports
        fetch('/api/reports')
            .then(res => res.json())
            .then(data => setMyReports(data))
            .catch(err => console.error(err));
    }, []);

    const statsCards = [
        { label: '전 체', count: myReports.length, color: '#F1F5F9', textColor: '#334155' },
        { label: '접 수', count: myReports.filter(r => r.status === '접수완료').length, color: '#EFF6FF', textColor: '#2563EB' },
        { label: '처리중', count: myReports.filter(r => r.status === '처리중').length, color: '#FEF2F2', textColor: '#EF4444' },
        { label: '처리완료', count: myReports.filter(r => r.status === '처리완료').length, color: '#F0FDF4', textColor: '#16A34A' }
    ];

    return (
        <div className="mypage" style={{ padding: '60px 0' }}>
            <div className="container" style={{ backgroundColor: 'white', padding: '40px', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
                <h2 style={{ color: 'var(--primary-dark)', marginBottom: '40px', fontSize: '2.5rem', fontWeight: '800' }}>마이페이지</h2>

                <section style={{ marginBottom: '50px' }}>
                    <h3 style={{ marginBottom: '20px', color: 'var(--primary-color)' }}>나의 민원 현황</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px' }}>
                        {statsCards.map((stat, idx) => (
                            <div key={idx} style={{ backgroundColor: stat.color, padding: '30px', borderRadius: '12px', textAlign: 'center', border: '1px solid #E2E8F0' }}>
                                <div style={{ fontSize: '1.2rem', marginBottom: '10px', fontWeight: '600', color: '#64748B' }}>{stat.label}</div>
                                <div style={{ fontSize: '2.5rem', fontWeight: '800', color: stat.textColor }}>{stat.count}</div>
                            </div>
                        ))}
                    </div>
                </section>

                <section>
                    <h3 style={{ marginBottom: '20px', color: 'var(--primary-color)' }}>나의 민원 목록</h3>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ backgroundColor: 'var(--primary-color)', color: 'white' }}>
                                <th style={{ padding: '15px' }}>접수번호</th>
                                <th style={{ padding: '15px' }}>제목</th>
                                <th style={{ padding: '15px' }}>지역</th>
                                <th style={{ padding: '15px' }}>신고일</th>
                                <th style={{ padding: '15px' }}>상태</th>
                            </tr>
                        </thead>
                        <tbody>
                            {myReports.length > 0 ? myReports.map((report) => (
                                <tr key={report.id} style={{ textAlign: 'center', borderBottom: '1px solid #EEE' }}>
                                    <td style={{ padding: '15px' }}>{report.id}</td>
                                    <td style={{ padding: '15px', textAlign: 'left' }}>{report.title}</td>
                                    <td style={{ padding: '15px' }}>{report.region}</td>
                                    <td style={{ padding: '15px' }}>{report.date}</td>
                                    <td style={{ padding: '15px', color: report.status === '처리중' ? '#EF4444' : (report.status === '처리완료' ? '#16A34A' : '#2563EB'), fontWeight: 'bold' }}>
                                        {report.status}
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan="5" style={{ padding: '40px', textAlign: 'center', color: '#AAA' }}>내역이 없습니다.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </section>
            </div>
        </div>
    );
}

export default MyPage;

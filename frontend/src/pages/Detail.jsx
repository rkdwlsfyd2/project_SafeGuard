import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

function Detail() {
    const { id } = useParams();
    const [report, setReport] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        fetch(`http://localhost:5000/api/reports/${id}`)
            .then(res => res.json())
            .then(data => setReport(data))
            .catch(err => console.error('Failed to fetch report detail:', err));
    }, [id]);

    if (!report) return <div className="container" style={{ padding: '100px', textAlign: 'center' }}>로딩중...</div>;

    const statusStepStyle = (isActive) => ({
        padding: '10px 25px',
        borderRadius: '20px',
        backgroundColor: isActive ? 'var(--primary-color)' : '#EEE',
        color: isActive ? 'white' : '#777',
        fontWeight: 'bold',
        fontSize: '0.9rem',
        display: 'flex',
        alignItems: 'center'
    });

    return (
        <div className="detail-page" style={{ padding: '60px 0' }}>
            <div className="container" style={{ backgroundColor: 'white', padding: '40px', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
                <div style={{ marginBottom: '10px', fontSize: '0.85rem', color: '#777' }}>민원목록 &gt; 민원 상세 보기</div>
                <h2 style={{ fontSize: '2.2rem', color: 'var(--primary-dark)', marginBottom: '30px' }}>{report.title}</h2>

                {/* Info Table */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0', border: '1px solid #EEE', marginBottom: '40px' }}>
                    <div style={{ display: 'flex', borderBottom: '1px solid #EEE' }}><div style={{ width: '120px', backgroundColor: '#F8FAFC', padding: '12px', fontWeight: 'bold' }}>신고번호</div><div style={{ padding: '12px' }}>{report.id}</div></div>
                    <div style={{ display: 'flex', borderBottom: '1px solid #EEE' }}><div style={{ width: '120px', backgroundColor: '#F8FAFC', padding: '12px', fontWeight: 'bold' }}>신고유형</div><div style={{ padding: '12px' }}>{report.type}</div></div>
                    <div style={{ display: 'flex', borderBottom: '1px solid #EEE' }}><div style={{ width: '120px', backgroundColor: '#F8FAFC', padding: '12px', fontWeight: 'bold' }}>지역</div><div style={{ padding: '12px' }}>{report.region}</div></div>
                    <div style={{ display: 'flex', borderBottom: '1px solid #EEE' }}><div style={{ width: '120px', backgroundColor: '#F8FAFC', padding: '12px', fontWeight: 'bold' }}>처리기관</div><div style={{ padding: '12px' }}>{report.agency}</div></div>
                    <div style={{ display: 'flex' }}><div style={{ width: '120px', backgroundColor: '#F8FAFC', padding: '12px', fontWeight: 'bold' }}>신고일</div><div style={{ padding: '12px' }}>{report.date}</div></div>
                    <div style={{ display: 'flex' }}><div style={{ width: '120px', backgroundColor: '#F8FAFC', padding: '12px', fontWeight: 'bold' }}>처리상태</div><div style={{ padding: '12px', color: 'red', fontWeight: 'bold' }}>{report.status}</div></div>
                </div>

                {/* Content Section */}
                <h3 style={{ marginBottom: '20px', borderBottom: '2px solid var(--primary-color)', paddingBottom: '10px' }}>민원 내용</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '30px', marginBottom: '50px' }}>
                    <img src="https://via.placeholder.com/400x300?text=Attached+Image" alt="Report" style={{ width: '100%', borderRadius: '8px' }} />
                    <div style={{ lineHeight: '1.8' }}>{report.content}</div>
                </div>

                {/* Workflow Section */}
                <h3 style={{ marginBottom: '30px' }}>민원 처리 현황</h3>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '30px', marginBottom: '50px' }}>
                    <div style={statusStepStyle(report.status === '접수완료')}>접수 완료</div>
                    <div style={{ fontSize: '1.5rem', color: '#CCC' }}>➜</div>
                    <div style={statusStepStyle(report.status === '처리중')}>처리중</div>
                    <div style={{ fontSize: '1.5rem', color: '#CCC' }}>➜</div>
                    <div style={statusStepStyle(report.status === '처리완료', '#4CAF50')}>처리완료</div>
                </div>

                {/* 담당자 메모 */}
                {report.status === '처리완료' && (
                    <div style={{ padding: '30px', backgroundColor: '#F8FAFC', borderRadius: '8px' }}>
                        <h4 style={{ marginBottom: '10px' }}>담당자 메모</h4>
                        <div style={{ fontSize: '0.95rem', color: '#555' }}>{report.date} 오후 3시 보수작업이 완료되었습니다.</div>
                    </div>
                )}

                <div style={{ textAlign: 'center', marginTop: '50px' }}>
                    <button
                        onClick={() => navigate('/list')}
                        style={{ padding: '12px 40px', backgroundColor: 'white', color: 'var(--primary-color)', border: '2px solid var(--primary-color)', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' }}
                    >
                        목 록
                    </button>
                </div>
            </div>
        </div>
    );
}

export default Detail;

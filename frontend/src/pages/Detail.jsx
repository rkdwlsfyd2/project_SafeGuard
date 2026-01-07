import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

function Detail() {
    const { id } = useParams();
    const [report, setReport] = useState(null);
    const navigate = useNavigate();

    const fetchDetail = async () => {
        try {
            const res = await fetch(`http://localhost:5000/api/complaints/${id}`);
            const data = await res.json();
            setReport(data);
        } catch (err) {
            console.error('Failed to fetch report detail:', err);
        }
    };

    useEffect(() => {
        fetchDetail();
    }, [id]);

    const handleLike = async () => {
        const token = localStorage.getItem('token');
        if (!token) {
            alert('로그인이 필요한 서비스입니다.');
            navigate('/login');
            return;
        }

        try {
            const res = await fetch(`http://localhost:5000/api/complaints/${id}/like`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const data = await res.json();
            if (!res.ok) {
                alert(data.error || '좋아요 처리에 실패했습니다.');
                return;
            }
            // backend now returns { message, likeCount, liked }
            if (typeof data.liked === 'boolean') {
                setReport(prev => ({ ...prev, likeCount: data.likeCount, liked: data.liked }));
            } else {
                // Fallback if backend doesn't return correct boolean (shouldn't happen with our changes)
                setReport(prev => ({ ...prev, likeCount: data.likeCount, liked: true }));
            }
        } catch (err) {
            console.error('Failed to update like:', err);
        }
    };

    if (!report) return <div className="container" style={{ padding: '100px', textAlign: 'center' }}>로딩중...</div>;

    const statusMap = {
        'RECEIVED': '접수 완료',
        'IN_PROGRESS': '처리중',
        'COMPLETED': '처리완료',
        'REJECTED': '반려',
        'CANCELLED': '취소'
    };

    const formatDate = (dateString) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleDateString('ko-KR', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        });
    };

    const statusStepStyle = (isActive, status) => {
        const activeColors = {
            'RECEIVED': 'var(--primary-color)',
            'IN_PROGRESS': '#d97706', // 노란색
            'COMPLETED': '#16a34a'   // 초록색
        };
        const activeColor = activeColors[status] || 'var(--primary-color)';

        return {
            padding: '10px 25px',
            borderRadius: '20px',
            backgroundColor: isActive ? activeColor : '#EEE',
            color: isActive ? 'white' : '#777',
            fontWeight: 'bold',
            fontSize: '0.9rem',
            display: 'flex',
            alignItems: 'center'
        };
    };

    return (
        <div className="detail-page" style={{ padding: '60px 0' }}>
            <div className="container" style={{ backgroundColor: 'white', padding: '40px', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
                <div style={{ marginBottom: '10px', fontSize: '0.85rem', color: '#777' }}>민원목록 &gt; 민원 상세 보기</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <h2 style={{ fontSize: '2.2rem', color: 'var(--primary-dark)', marginBottom: '30px' }}>{report.title}</h2>
                    <button
                        onClick={handleLike}
                        style={{
                            padding: '10px 20px',
                            backgroundColor: report.liked ? '#fff1f2' : 'white',
                            color: report.liked ? '#e11d48' : '#64748b',
                            border: report.liked ? '1px solid #fda4af' : '1px solid #e2e8f0',
                            borderRadius: '12px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            transition: 'all 0.2s',
                            boxShadow: report.liked ? 'none' : '0 2px 5px rgba(0,0,0,0.05)',
                            minWidth: '100px',
                            justifyContent: 'center'
                        }}
                    >
                        {report.liked ? '❤️' : '🤍'} {report.likeCount || 0}
                    </button>
                </div>

                {/* Info Table */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0', border: '1px solid #EEE', marginBottom: '40px' }}>
                    <div style={{ display: 'flex', borderBottom: '1px solid #EEE' }}><div style={{ width: '120px', backgroundColor: '#F8FAFC', padding: '12px', fontWeight: 'bold' }}>신고번호</div><div style={{ padding: '12px' }}>{report.complaintNo}</div></div>
                    <div style={{ display: 'flex', borderBottom: '1px solid #EEE' }}><div style={{ width: '120px', backgroundColor: '#F8FAFC', padding: '12px', fontWeight: 'bold' }}>신고유형</div><div style={{ padding: '12px' }}>{report.category}</div></div>
                    <div style={{ display: 'flex', borderBottom: '1px solid #EEE' }}><div style={{ width: '120px', backgroundColor: '#F8FAFC', padding: '12px', fontWeight: 'bold' }}>지역</div><div style={{ padding: '12px' }}>{report.address}</div></div>
                    <div style={{ display: 'flex', borderBottom: '1px solid #EEE' }}><div style={{ width: '120px', backgroundColor: '#F8FAFC', padding: '12px', fontWeight: 'bold' }}>작성자</div><div style={{ padding: '12px' }}>{report.authorName}</div></div>
                    <div style={{ display: 'flex' }}><div style={{ width: '120px', backgroundColor: '#F8FAFC', padding: '12px', fontWeight: 'bold' }}>신고일</div><div style={{ padding: '12px' }}>{formatDate(report.createdDate)}</div></div>
                    <div style={{ display: 'flex' }}><div style={{ width: '120px', backgroundColor: '#F8FAFC', padding: '12px', fontWeight: 'bold' }}>처리상태</div><div style={{ padding: '12px', color: '#3F51B5', fontWeight: 'bold' }}>{statusMap[report.status] || report.status}</div></div>
                </div>

                {/* Content Section */}
                <h3 style={{ marginBottom: '20px', borderBottom: '2px solid var(--primary-color)', paddingBottom: '10px' }}>민원 내용</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '30px', marginBottom: '50px' }}>
                    <div style={{ width: '100%', aspectRatio: '4/3', backgroundColor: '#f1f5f9', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {report.imagePath ? (
                            <img src={report.imagePath} alt="ReportAttachment" style={{ maxWidth: '100%', maxHeight: '100%', borderRadius: '8px' }} onError={(e) => {
                                e.target.src = 'https://via.placeholder.com/400x300?text=No+Image';
                            }} />
                        ) : '이미지 없음'}
                    </div>
                    <div style={{ lineHeight: '1.8', whiteSpace: 'pre-wrap' }}>{report.content}</div>
                </div>

                {/* Workflow Section */}
                <h3 style={{ marginBottom: '30px' }}>민원 처리 현황</h3>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '30px', marginBottom: '50px' }}>
                    <div style={statusStepStyle(report.status === 'RECEIVED', 'RECEIVED')}>접수 완료</div>
                    <div style={{ fontSize: '1.5rem', color: '#CCC' }}>➜</div>
                    <div style={statusStepStyle(report.status === 'IN_PROGRESS', 'IN_PROGRESS')}>처리중</div>
                    <div style={{ fontSize: '1.5rem', color: '#CCC' }}>➜</div>
                    <div style={statusStepStyle(report.status === 'COMPLETED', 'COMPLETED')}>처리완료</div>
                </div>

                <div style={{ textAlign: 'center', marginTop: '50px' }}>
                    <button
                        onClick={() => navigate(-1)}
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

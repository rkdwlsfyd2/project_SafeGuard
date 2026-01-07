import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { complaintsAPI } from '../utils/api';

function List() {
    const [complaints, setComplaints] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const navigate = useNavigate();

    useEffect(() => {
        fetchComplaints();
    }, [page]);

    const fetchComplaints = async () => {
        setLoading(true);
        try {
            const data = await complaintsAPI.getList({ page, limit: 10 });
            setComplaints(data.complaints);
            setTotalPages(data.pagination.totalPages);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const getStatusBadge = (status) => {
        const statusMap = {
            'RECEIVED': { text: '접수', bg: '#dbeafe', color: '#2563eb' },
            'IN_PROGRESS': { text: '처리중', bg: '#fef3c7', color: '#d97706' },
            'COMPLETED': { text: '완료', bg: '#dcfce7', color: '#16a34a' },
            'REJECTED': { text: '반려', bg: '#fee2e2', color: '#dc2626' },
            'CANCELLED': { text: '취소', bg: '#f1f5f9', color: '#64748b' }
        };
        const s = statusMap[status] || { text: status, bg: '#f1f5f9', color: '#64748b' };
        return (
            <span style={{
                padding: '6px 12px',
                borderRadius: '20px',
                fontSize: '0.8rem',
                fontWeight: '600',
                backgroundColor: s.bg,
                color: s.color
            }}>
                {s.text}
            </span>
        );
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('ko-KR', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        });
    };

    return (
        <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', padding: '40px 20px' }}>
            <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
                {/* 페이지 헤더 */}
                <div style={{
                    backgroundColor: 'white',
                    borderRadius: '20px',
                    padding: '30px 40px',
                    marginBottom: '24px',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.08)'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <h1 style={{ fontSize: '2rem', fontWeight: '800', color: '#1e293b', margin: 0 }}>
                                📋 민원 목록
                            </h1>
                            <p style={{ color: '#64748b', marginTop: '8px' }}>등록된 민원 현황을 확인하세요</p>
                        </div>
                        <button
                            onClick={() => navigate('/apply-image')}
                            style={{
                                padding: '14px 28px',
                                background: 'linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)',
                                color: 'white',
                                border: 'none',
                                borderRadius: '12px',
                                fontSize: '1rem',
                                fontWeight: '600',
                                cursor: 'pointer',
                                boxShadow: '0 4px 14px rgba(124, 58, 237, 0.4)'
                            }}
                        >
                            ➕ 새 민원 등록
                        </button>
                    </div>

                    {/* 검색바 */}
                    <div style={{
                        display: 'flex',
                        gap: '12px',
                        marginTop: '24px',
                        padding: '20px',
                        backgroundColor: '#f8fafc',
                        borderRadius: '12px'
                    }}>
                        <select style={{
                            padding: '12px 16px',
                            border: '2px solid #e2e8f0',
                            borderRadius: '10px',
                            fontSize: '0.95rem',
                            backgroundColor: 'white',
                            cursor: 'pointer'
                        }}>
                            <option>전체</option>
                            <option>교통</option>
                            <option>환경</option>
                            <option>안전</option>
                        </select>
                        <input
                            type="text"
                            placeholder="🔍 검색어를 입력하세요"
                            style={{
                                flex: 1,
                                padding: '12px 18px',
                                border: '2px solid #e2e8f0',
                                borderRadius: '10px',
                                fontSize: '0.95rem',
                                outline: 'none'
                            }}
                        />
                        <button style={{
                            padding: '12px 24px',
                            backgroundColor: '#1e293b',
                            color: 'white',
                            border: 'none',
                            borderRadius: '10px',
                            fontWeight: '600',
                            cursor: 'pointer'
                        }}>
                            검색
                        </button>
                    </div>
                </div>

                {/* 민원 목록 */}
                <div style={{
                    backgroundColor: 'white',
                    borderRadius: '20px',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                    overflow: 'hidden'
                }}>
                    {loading ? (
                        <div style={{ textAlign: 'center', padding: '80px 20px' }}>
                            <div style={{
                                width: '50px',
                                height: '50px',
                                border: '4px solid #e2e8f0',
                                borderTop: '4px solid #7c3aed',
                                borderRadius: '50%',
                                margin: '0 auto 20px',
                                animation: 'spin 1s linear infinite'
                            }}></div>
                            <p style={{ color: '#64748b' }}>불러오는 중...</p>
                            <style>{`@keyframes spin { to { transform: rotate(360deg); }}`}</style>
                        </div>
                    ) : error ? (
                        <div style={{ textAlign: 'center', padding: '80px 20px', color: '#dc2626' }}>{error}</div>
                    ) : complaints.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '80px 20px' }}>
                            <div style={{ fontSize: '4rem', marginBottom: '16px' }}>📭</div>
                            <p style={{ color: '#64748b', fontWeight: '500' }}>등록된 민원이 없습니다</p>
                            <button
                                onClick={() => navigate('/apply-image')}
                                style={{
                                    marginTop: '20px',
                                    padding: '12px 24px',
                                    background: 'linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '10px',
                                    fontWeight: '600',
                                    cursor: 'pointer'
                                }}
                            >
                                첫 민원 등록하기
                            </button>
                        </div>
                    ) : (
                        <>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ backgroundColor: '#f8fafc' }}>
                                        {['번호', '분류', '제목', '상태', '작성자', '등록일', '좋아요'].map(h => (
                                            <th key={h} style={{
                                                padding: '16px 20px',
                                                textAlign: 'left',
                                                fontSize: '0.85rem',
                                                fontWeight: '700',
                                                color: '#64748b',
                                                borderBottom: '2px solid #e2e8f0'
                                            }}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {complaints.map((c) => (
                                        <tr
                                            key={c.complaintNo}
                                            onClick={() => navigate(`/reports/${c.complaintNo}`)}
                                            style={{
                                                cursor: 'pointer',
                                                transition: 'background-color 0.2s'
                                            }}
                                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                        >
                                            <td style={{ padding: '18px 20px', color: '#94a3b8', borderBottom: '1px solid #f1f5f9' }}>{c.complaintNo}</td>
                                            <td style={{ padding: '18px 20px', borderBottom: '1px solid #f1f5f9' }}>
                                                <span style={{
                                                    padding: '4px 10px',
                                                    backgroundColor: '#f1f5f9',
                                                    borderRadius: '6px',
                                                    fontSize: '0.85rem',
                                                    color: '#64748b'
                                                }}>{c.category}</span>
                                            </td>
                                            <td style={{ padding: '18px 20px', fontWeight: '600', color: '#1e293b', borderBottom: '1px solid #f1f5f9' }}>
                                                {c.title}
                                                {!c.isPublic && <span style={{ marginLeft: '8px', fontSize: '0.8rem' }}>🔒</span>}
                                            </td>
                                            <td style={{ padding: '18px 20px', borderBottom: '1px solid #f1f5f9' }}>{getStatusBadge(c.status)}</td>
                                            <td style={{ padding: '18px 20px', color: '#64748b', borderBottom: '1px solid #f1f5f9' }}>{c.authorName}</td>
                                            <td style={{ padding: '18px 20px', color: '#94a3b8', fontSize: '0.9rem', borderBottom: '1px solid #f1f5f9' }}>{formatDate(c.createdDate)}</td>
                                            <td style={{ padding: '18px 20px', borderBottom: '1px solid #f1f5f9' }}>
                                                <span style={{ color: '#ef4444', fontWeight: '600' }}>❤️ {c.likeCount}</span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>

                            {/* 페이지네이션 */}
                            {totalPages > 1 && (
                                <div style={{
                                    display: 'flex',
                                    justifyContent: 'center',
                                    gap: '8px',
                                    padding: '24px'
                                }}>
                                    <button
                                        onClick={() => setPage(1)}
                                        disabled={page === 1}
                                        style={{
                                            padding: '10px 14px',
                                            borderRadius: '8px',
                                            border: 'none',
                                            backgroundColor: '#f1f5f9',
                                            color: '#64748b',
                                            cursor: page === 1 ? 'not-allowed' : 'pointer',
                                            opacity: page === 1 ? 0.5 : 1
                                        }}
                                    >⏪</button>
                                    {[...Array(Math.min(5, totalPages))].map((_, i) => (
                                        <button
                                            key={i + 1}
                                            onClick={() => setPage(i + 1)}
                                            style={{
                                                width: '40px',
                                                height: '40px',
                                                borderRadius: '10px',
                                                border: 'none',
                                                backgroundColor: page === i + 1 ? '#7c3aed' : '#f1f5f9',
                                                color: page === i + 1 ? 'white' : '#64748b',
                                                fontWeight: '600',
                                                cursor: 'pointer'
                                            }}
                                        >{i + 1}</button>
                                    ))}
                                    <button
                                        onClick={() => setPage(totalPages)}
                                        disabled={page === totalPages}
                                        style={{
                                            padding: '10px 14px',
                                            borderRadius: '8px',
                                            border: 'none',
                                            backgroundColor: '#f1f5f9',
                                            color: '#64748b',
                                            cursor: page === totalPages ? 'not-allowed' : 'pointer',
                                            opacity: page === totalPages ? 0.5 : 1
                                        }}
                                    >⏩</button>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

export default List;

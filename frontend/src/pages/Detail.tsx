import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { complaintsAPI, authAPI } from '../utils/api';
import StatusBadge from '../components/StatusBadge';
import { STATUS_STYLES } from '../utils/statusStyles';

const ImageDisplay = ({ src }: { src?: string | null }) => {
    const [imgError, setImgError] = useState(false);

    if (!src || imgError) {
        return (
            <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', backgroundColor: '#f8fafc' }}>
                <div style={{ fontSize: '3rem', marginBottom: '16px', opacity: 0.5 }}>📸</div>
                <span style={{ fontSize: '1rem', fontWeight: '500', color: '#64748b' }}>
                    {src ? '이미지를 불러올 수 없습니다' : '등록된 이미지가 없습니다'}
                </span>
            </div>
        );
    }

    return (
        <img
            src={src}
            alt="현장 사진"
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            onError={() => setImgError(true)}
        />
    );
};

function Detail() {
    const { id } = useParams();
    const [report, setReport] = useState(null);
    const [user, setUser] = useState(null);
    const [answerText, setAnswerText] = useState('');
    const [isEditing, setIsEditing] = useState(false);
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [accessDenied, setAccessDenied] = useState(false); // New state for explicit private handling if needed

    const fetchDetail = async () => {
        try {
            setLoading(true);
            const data = await complaintsAPI.getDetail(id);
            setReport(data);
            if (data.answer) setAnswerText(data.answer);
        } catch (err) {
            console.error('Failed to fetch report detail:', err);
            // Optionally handle error state
        } finally {
            setLoading(false);
        }
    };

    const fetchUser = async () => {
        try {
            const token = localStorage.getItem('token');
            if (token) {
                const userData = await authAPI.getMe();
                setUser(userData);
            }
        } catch (err) {
            console.error('Failed to fetch user:', err);
        }
    };

    useEffect(() => {
        fetchDetail();
        fetchUser();
    }, [id]);

    const handleStatusChange = async (newStatus) => {
        if (!user || user.role !== 'AGENCY') return;
        try {
            await complaintsAPI.updateStatus(id, newStatus);
            setReport(prev => ({ ...prev, status: newStatus }));
            alert('상태가 변경되었습니다.');
        } catch (err) {
            alert(err.message);
        }
    };

    const handleAnswerSubmit = async () => {
        if (!user || user.role !== 'AGENCY') return;
        try {
            await complaintsAPI.updateAnswer(id, answerText);
            setReport(prev => ({ ...prev, answer: answerText }));
            setIsEditing(false); // Exit edit mode
            alert('답변이 등록되었습니다.');
        } catch (err) {
            alert(err.message);
        }
    };

    const handleReaction = async (type) => {
        const token = localStorage.getItem('token');
        if (!token) {
            alert('로그인이 필요한 서비스입니다.');
            navigate('/login');
            return;
        }

        try {
            const result = await complaintsAPI.toggleReaction(id, type);
            // 만약 API가 업데이트된 데이터를 반환하면 바로 적용
            // 하지만 DTO 구조가 전체 상세와 다를 수 있으므로 fetchDetail 호출하거나 부분 업데이트
            // Backend returns: { message, likeCount, dislikeCount, myReaction }

            setReport(prev => ({
                ...prev,
                likeCount: result.likeCount,
                dislikeCount: result.dislikeCount,
                myReaction: result.myReaction
            }));
        } catch (err) {
            if (err.message && err.message.includes('본인 글')) {
                alert('본인 글에는 반응할 수 없습니다.');
            } else {
                console.error('Failed to update reaction:', err);
                alert('처리 실패');
            }
        }
    };

    if (loading) {
        return <div className="container" style={{ padding: '100px', textAlign: 'center' }}>로딩중...</div>;
    }

    if (!report) {
        return <div className="container" style={{ padding: '100px', textAlign: 'center' }}>게시물을 찾을 수 없습니다.</div>;
    }

    const location = useLocation();

    const handleBack = () => {
        const prevParams = location.state?.searchParams;
        if (prevParams) {
            navigate(`/list?${prevParams}`);
        } else {
            navigate('/list');
        }
    };

    // [Strict Access Control] 비공개 게시물 처리
    if (report.message === "비공개된 게시물입니다") {
        return (
            <div className="container" style={{ padding: '100px', textAlign: 'center' }}>
                <div style={{ fontSize: '64px', marginBottom: '20px' }}>🔒</div>
                <h2>비공개된 게시물입니다</h2>
                <p style={{ color: '#666', marginTop: '10px' }}>
                    작성자와 담당 기관 관계자만 열람할 수 있습니다.
                </p>
                <button
                    onClick={handleBack}
                    style={{
                        marginTop: '30px',
                        padding: '10px 20px',
                        backgroundColor: '#2563eb',
                        color: 'white',
                        border: 'none',
                        borderRadius: '5px',
                        cursor: 'pointer'
                    }}
                >
                    목록으로 돌아가기
                </button>
            </div>
        );
    }



    const formatDate = (dateString) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleDateString('ko-KR', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        });
    };

    const steps = [
        { key: 'UNPROCESSED', label: '미처리', icon: '📥' },
        { key: 'IN_PROGRESS', label: '처리중', icon: '🛠️' },
        { key: 'COMPLETED', label: '처리완료', icon: '✅' }
    ];

    const statusOrder = ['UNPROCESSED', 'IN_PROGRESS', 'COMPLETED'];
    const currentIndex = Math.max(statusOrder.indexOf(report.status), 0);
    const progressPercent = (currentIndex / (statusOrder.length - 1)) * 100;



    const maskName = (name: string) => {
        if (!name) return '';
        if (name.length <= 1) return name;
        if (name.length === 2) {
            return name[0] + '*';
        }
        return name[0] + '*' + name[name.length - 1];
    };

    const isMyComplaint = user && report && user.role === 'AGENCY' && String(report.agencyNo) === String(user.agencyNo);

    return (
        <div className="detail-page" style={{ padding: '40px 0', backgroundColor: '#f8fafc', minHeight: '100vh' }}>
            <div className="container" style={{ maxWidth: '1000px', margin: '0 auto', padding: '0 20px' }}>
                {/* Header Navigation */}
                <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.9rem', color: '#64748b' }}>
                    <span style={{ cursor: 'pointer' }} onClick={() => navigate('/')}>홈</span>
                    <span>&gt;</span>
                    <span style={{ cursor: 'pointer' }} onClick={handleBack}>민원 목록</span>
                    <span>&gt;</span>
                    <span style={{ color: 'var(--primary-color)', fontWeight: '600' }}>상세 보기</span>
                </div>

                {/* Main Content Card */}
                <div style={{ backgroundColor: 'white', borderRadius: '24px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)', overflow: 'hidden' }}>

                    {/* Title Header */}
                    <div style={{ padding: '32px 40px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '20px' }}>

                        {/* LEFT: Info Block */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                                <StatusBadge status={report.status} style={{ fontSize: '0.85rem' }} />
                                <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>No. {report.complaintNo}</span>
                            </div>

                            <h2 style={{ fontSize: '1.75rem', fontWeight: '800', color: '#1e293b', marginBottom: '12px', lineHeight: '1.3' }}>
                                {report.title}
                            </h2>

                            <div style={{ display: 'flex', gap: '12px', color: '#64748b', fontSize: '0.9rem', alignItems: 'center', flexWrap: 'wrap' }}>
                                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                    <span>👤</span> {report.isMyPost ? maskName(report.authorName) : '익명'}
                                </div>
                                <div style={{ width: '1px', height: '12px', backgroundColor: '#e2e8f0' }}></div>
                                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                    <span>📅</span> {formatDate(report.createdDate)}
                                </div>
                                <div style={{ width: '1px', height: '12px', backgroundColor: '#e2e8f0' }}></div>
                                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                    <span>📂</span> {report.category}
                                </div>
                                <div style={{ width: '1px', height: '12px', backgroundColor: '#e2e8f0' }}></div>
                                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                    <span>📍</span>
                                    <span
                                        onClick={() => {
                                            if (report.regionCode) {
                                                navigate(`/list?region=${report.regionCode}`);
                                            }
                                        }}
                                        style={{
                                            cursor: report.regionCode ? 'pointer' : 'default',
                                            textDecoration: report.regionCode ? 'underline' : 'none'
                                        }}
                                    >
                                        {report.regionName || report.address}
                                    </span>
                                </div>
                                <div style={{ width: '1px', height: '12px', backgroundColor: '#e2e8f0' }}></div>
                                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                    <span>🏛️</span>
                                    <span style={{
                                        fontWeight: '600',
                                        color: '#334155'
                                    }}>
                                        {(() => {
                                            if (!report.assignedAgencyText) return '-';
                                            const agencies = report.assignedAgencyText.split(',').map((s: string) => s.trim()).filter((s: string) => s);
                                            return agencies.slice(0, 3).join(', ');
                                        })()}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* RIGHT: Actions Block */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
                            <button
                                onClick={() => handleReaction('LIKE')}
                                disabled={report.isMyPost}
                                style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    width: '56px',
                                    height: '56px',
                                    borderRadius: '50%',
                                    backgroundColor: report.myReaction === 'LIKE' ? '#dcfce7' : '#f8fafc',
                                    color: report.myReaction === 'LIKE' ? '#16a34a' : '#64748b',
                                    border: report.myReaction === 'LIKE' ? '2px solid #86efac' : '1px solid #e2e8f0',
                                    cursor: report.isMyPost ? 'not-allowed' : 'pointer',
                                    transition: 'all 0.2s',
                                    boxShadow: report.myReaction === 'LIKE' ? '0 4px 12px rgba(22, 163, 74, 0.2)' : 'none'
                                }}
                                onMouseOver={(e) => { if (!report.isMyPost && report.myReaction !== 'LIKE') { e.currentTarget.style.backgroundColor = '#f1f5f9'; } }}
                                onMouseOut={(e) => { if (!report.isMyPost && report.myReaction !== 'LIKE') { e.currentTarget.style.backgroundColor = '#f8fafc'; } }}
                            >
                                <span style={{ fontSize: '1.25rem', marginBottom: '2px' }}>👍</span>
                                <span style={{ fontSize: '0.75rem', fontWeight: '700' }}>{report.likeCount || 0}</span>
                            </button>

                            <button
                                onClick={() => handleReaction('DISLIKE')}
                                disabled={report.isMyPost}
                                style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    width: '56px',
                                    height: '56px',
                                    borderRadius: '50%',
                                    backgroundColor: report.myReaction === 'DISLIKE' ? '#fee2e2' : '#f8fafc',
                                    color: report.myReaction === 'DISLIKE' ? '#dc2626' : '#64748b',
                                    border: report.myReaction === 'DISLIKE' ? '2px solid #fca5a5' : '1px solid #e2e8f0',
                                    cursor: report.isMyPost ? 'not-allowed' : 'pointer',
                                    transition: 'all 0.2s',
                                    boxShadow: report.myReaction === 'DISLIKE' ? '0 4px 12px rgba(220, 38, 38, 0.2)' : 'none'
                                }}
                                onMouseOver={(e) => { if (!report.isMyPost && report.myReaction !== 'DISLIKE') { e.currentTarget.style.backgroundColor = '#f1f5f9'; } }}
                                onMouseOut={(e) => { if (!report.isMyPost && report.myReaction !== 'DISLIKE') { e.currentTarget.style.backgroundColor = '#f8fafc'; } }}
                            >
                                <span style={{ fontSize: '1.25rem', marginBottom: '2px' }}>👎</span>
                                <span style={{ fontSize: '0.75rem', fontWeight: '700' }}>{report.dislikeCount || 0}</span>
                            </button>

                            {isMyComplaint && (
                                <button
                                    onClick={async () => {
                                        if (window.confirm('정말 삭제하시겠습니까? (복구 불가)')) {
                                            try {
                                                await complaintsAPI.delete(id);
                                                alert('삭제되었습니다.');
                                                handleBack();
                                            } catch (err: any) {
                                                alert(err.message || '삭제 실패');
                                            }
                                        }
                                    }}
                                    style={{
                                        width: '56px',
                                        height: '56px',
                                        borderRadius: '50%',
                                        backgroundColor: '#fff1f2',
                                        color: '#e11d48',
                                        border: '1px solid #fda4af',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        transition: 'all 0.2s',
                                        fontSize: '1.2rem'
                                    }}
                                    title="삭제하기"
                                    onMouseOver={(e) => { e.currentTarget.style.backgroundColor = '#fee2e2'; }}
                                    onMouseOut={(e) => { e.currentTarget.style.backgroundColor = '#fff1f2'; }}
                                >
                                    🗑️
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Body Content */}
                    <div style={{ padding: '40px' }}>
                        {/* Progress Bar */}
                        <div style={{ marginBottom: '60px', padding: '0 20px' }}>
                            <div style={{ position: 'relative', maxWidth: '600px', margin: '0 auto' }}>
                                {/* Progress Line Background */}
                                <div style={{ position: 'absolute', top: '24px', left: '0', right: '0', height: '4px', backgroundColor: '#e2e8f0', borderRadius: '4px', zIndex: 0 }} />
                                {/* Active Progress Line */}
                                <div style={{
                                    position: 'absolute',
                                    top: '24px',
                                    left: '0',
                                    height: '4px',
                                    width: `${progressPercent}%`,
                                    background: 'linear-gradient(90deg, #6366f1, #8b5cf6)',
                                    borderRadius: '4px',
                                    zIndex: 0,
                                    transition: 'width 0.5s ease-out'
                                }} />

                                <div style={{ display: 'flex', justifyContent: 'space-between', position: 'relative', zIndex: 1 }}>
                                    {steps.map((step, index) => {
                                        const isActive = index <= currentIndex;
                                        const isCurrent = index === currentIndex;



                                        const stepStyle = STATUS_STYLES[step.key];
                                        return (
                                            <div
                                                key={step.key}
                                                style={{ textAlign: 'center' }}
                                            >
                                                <div style={{
                                                    width: '56px',
                                                    height: '56px',
                                                    borderRadius: '50%',
                                                    backgroundColor: isActive ? stepStyle.bg : '#f8fafc',
                                                    border: isCurrent ? `3px solid ${stepStyle.color}` : (isActive ? `2px solid ${stepStyle.color}` : '2px solid #e2e8f0'),
                                                    color: isActive ? stepStyle.color : '#94a3b8',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    fontSize: '1.5rem',
                                                    margin: '0 auto 12px',
                                                    boxShadow: isCurrent ? `0 0 0 4px ${stepStyle.bg}, 0 4px 6px rgba(0,0,0,0.1)` : 'none',
                                                    transform: isCurrent ? 'scale(1.1)' : 'scale(1)',
                                                    opacity: isActive ? 1 : 0.6,
                                                    transition: 'all 0.3s ease'
                                                }}>
                                                    {step.icon}
                                                </div>
                                                <div style={{
                                                    fontSize: '0.9rem',
                                                    fontWeight: isActive ? '700' : '500',
                                                    color: isActive ? '#1e293b' : '#94a3b8',
                                                    marginBottom: '8px'
                                                }}>
                                                    {step.label}
                                                </div>
                                                {/* 1️⃣ 상태 변경 기능 차단: isMyComplaint일 때만 렌더링 */}
                                                {isMyComplaint && !isCurrent && (
                                                    <button
                                                        onClick={() => handleStatusChange(step.key)}
                                                        style={{
                                                            padding: '6px 12px',
                                                            borderRadius: '6px',
                                                            backgroundColor: '#eef2ff',
                                                            color: '#4f46e5',
                                                            fontSize: '0.8rem',
                                                            fontWeight: '600',
                                                            cursor: 'pointer',
                                                            border: 'none',
                                                            transition: 'all 0.2s',
                                                            boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
                                                        }}
                                                        onMouseOver={(e) => { e.currentTarget.style.backgroundColor = '#e0e7ff'; }}
                                                        onMouseOut={(e) => { e.currentTarget.style.backgroundColor = '#eef2ff'; }}
                                                    >
                                                        변경하기
                                                    </button>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        {/* Complaint Content Grid */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '40px', marginBottom: '60px' }}>
                            <div style={{ width: '100%', aspectRatio: '4/3', backgroundColor: '#f8fafc', borderRadius: '16px', overflow: 'hidden', border: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <ImageDisplay src={report.imagePath} />
                            </div>

                            <div>
                                <h3 style={{ fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '16px', color: '#1e293b', paddingLeft: '12px', borderLeft: '4px solid #6366f1' }}>민원 내용</h3>
                                <div style={{
                                    backgroundColor: '#f8fafc',
                                    padding: '24px',
                                    borderRadius: '16px',
                                    lineHeight: '1.8',
                                    color: '#334155',
                                    whiteSpace: 'pre-wrap',
                                    fontSize: '1.05rem',
                                    minHeight: '200px'
                                }}>
                                    {report.content}
                                </div>
                            </div>
                        </div>

                        {/* Answer Section */}
                        <div>
                            <h3 style={{ fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '16px', color: '#1e293b', paddingLeft: '12px', borderLeft: '4px solid #22c55e' }}>담당자 답변</h3>

                            {/* 2️⃣ 담당자 답변 기능 차단: isMyComplaint일 때만 렌더링 */}
                            {isMyComplaint ? (
                                (!report.answer || isEditing) ? (
                                    <div style={{ backgroundColor: '#fff', padding: '24px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                                        <div style={{ marginBottom: '12px', fontWeight: '600', color: '#475569' }}>답변 작성</div>
                                        <textarea
                                            value={answerText}
                                            onChange={(e) => setAnswerText(e.target.value)}
                                            placeholder="민원 처리 결과 및 안내 사항을 자세히 적어주세요."
                                            style={{
                                                width: '100%',
                                                minHeight: '200px',
                                                padding: '16px',
                                                borderRadius: '12px',
                                                border: '1px solid #cbd5e1',
                                                fontSize: '1rem',
                                                lineHeight: '1.6',
                                                resize: 'vertical',
                                                marginBottom: '16px',
                                                fontFamily: 'inherit'
                                            }}
                                        />
                                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                                            {report.answer && (
                                                <button
                                                    onClick={() => {
                                                        setIsEditing(false);
                                                        setAnswerText(report.answer);
                                                    }}
                                                    style={{ padding: '10px 24px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: 'white', color: '#475569', fontWeight: '600', cursor: 'pointer' }}
                                                >
                                                    취소
                                                </button>
                                            )}
                                            <button
                                                onClick={handleAnswerSubmit}
                                                style={{ padding: '10px 24px', borderRadius: '8px', border: 'none', backgroundColor: '#6366f1', color: 'white', fontWeight: '600', cursor: 'pointer', boxShadow: '0 2px 4px rgba(99, 102, 241, 0.3)' }}
                                            >
                                                {report.answer ? '수정 완료' : '답변 등록'}
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div style={{ position: 'relative', backgroundColor: '#f0fdf4', padding: '32px', borderRadius: '16px', border: '1px solid #bbf7d0' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                                            <span style={{ backgroundColor: '#16a34a', color: 'white', padding: '4px 12px', borderRadius: '999px', fontSize: '0.85rem', fontWeight: 'bold' }}>답변 완료</span>
                                            <button
                                                onClick={() => setIsEditing(true)}
                                                style={{ border: 'none', background: 'none', color: '#64748b', textDecoration: 'underline', cursor: 'pointer', fontSize: '0.9rem' }}
                                            >
                                                수정하기
                                            </button>
                                        </div>
                                        <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.8', color: '#1e293b', fontSize: '1.05rem' }}>
                                            {report.answer}
                                        </div>
                                        <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px dashed #bbf7d0', fontSize: '0.9rem', color: '#64748b' }}>
                                            담당자: {user?.name || '관리자'} | 처리일시: {formatDate(new Date().toISOString())} {/* 실제로는 답변 시간을 DB에 저장해야 함 */}
                                        </div>
                                    </div>
                                )
                            ) : (
                                <div style={{
                                    backgroundColor: report.answer ? '#f0fdf4' : '#f8fafc',
                                    padding: '40px',
                                    borderRadius: '16px',
                                    border: report.answer ? '1px solid #bbf7d0' : '1px dashed #cbd5e1',
                                    textAlign: report.answer ? 'left' : 'center'
                                }}>
                                    {report.answer ? (
                                        <>
                                            <div style={{ marginBottom: '16px' }}>
                                                <span style={{ backgroundColor: '#16a34a', color: 'white', padding: '6px 16px', borderRadius: '999px', fontSize: '0.9rem', fontWeight: 'bold' }}>SafeGuard 공식 답변</span>
                                            </div>
                                            <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.8', color: '#1e293b', fontSize: '1.1rem' }}>
                                                {report.answer}
                                            </div>
                                        </>
                                    ) : (
                                        <div style={{ color: '#94a3b8' }}>
                                            <div style={{ fontSize: '3rem', marginBottom: '16px' }}>⏳</div>
                                            <p style={{ fontSize: '1.1rem', fontWeight: '500' }}>아직 답변이 등록되지 않았습니다.</p>
                                            <p style={{ fontSize: '0.9rem' }}>담당자가 내용을 확인 후 빠른 시일 내에 답변해 드리겠습니다.</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* List Button */}
                        <div style={{ marginTop: '60px', textAlign: 'center' }}>
                            <button
                                onClick={handleBack}
                                style={{
                                    padding: '14px 48px',
                                    backgroundColor: 'white',
                                    color: '#475569',
                                    border: '1px solid #cbd5e1',
                                    borderRadius: '12px',
                                    fontWeight: '700',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    fontSize: '1rem'
                                }}
                                onMouseOver={(e) => { (e.target as HTMLElement).style.backgroundColor = '#f8fafc'; (e.target as HTMLElement).style.borderColor = '#94a3b8'; }}
                                onMouseOut={(e) => { (e.target as HTMLElement).style.backgroundColor = 'white'; (e.target as HTMLElement).style.borderColor = '#cbd5e1'; }}
                            >
                                ≡ 목록으로 돌아가기
                            </button>
                        </div>
                    </div>
                </div >
            </div >
        </div >
    );
}

export default Detail;
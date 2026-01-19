import React from 'react';
import { useNavigate } from 'react-router-dom';
import { getToken } from '../utils/api';

interface HomeProps {
    showAlert: (title: string, message: string, callback?: () => void) => void;
}

function Home({ showAlert }: HomeProps) {
    const navigate = useNavigate();
    const [statsData, setStatsData] = React.useState({ total: 0, today: 0, processing: 0, completed: 0 });
    const [topLiked, setTopLiked] = React.useState([]);
    const [latestComplaints, setLatestComplaints] = React.useState([]);

    React.useEffect(() => {
        // 1. Fetch Stats
        fetch('/api/complaints/stats')
            .then(res => {
                if (!res.ok) throw new Error('Network response was not ok');
                return res.json();
            })
            .then(data => setStatsData(data))
            .catch(err => {
                console.error('Failed to fetch stats:', err);
                setStatsData({ total: 0, today: 0, processing: 0, completed: 0 });
            });

        // 2. Fetch Top Liked
        fetch('/api/complaints/top-liked')
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) setTopLiked(data);
                else setTopLiked([]);
            })
            .catch(err => {
                console.error('Failed to fetch top liked:', err);
                setTopLiked([]);
            });

        // 3. Fetch Latest Complaints
        fetch('/api/complaints?limit=5')
            .then(res => res.json())
            .then(data => {
                if (data.complaints && Array.isArray(data.complaints)) {
                    setLatestComplaints(data.complaints);
                } else {
                    setLatestComplaints([]);
                }
            })
            .catch(err => {
                console.error('Failed to fetch latest complaints:', err);
                setLatestComplaints([]);
            });
    }, []);

    const cards = [
        {
            path: '/apply-text',
            icon: '📝',
            title: '텍스트 민원',
            desc: '글로 민원을 작성하세요',
            gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
        },
        {
            path: '/apply-voice',
            icon: '🎤',
            title: '음성 민원',
            desc: '음성으로 민원을 접수하세요',
            gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)'
        },
        {
            path: '/apply-image',
            icon: '📷',
            title: '이미지 민원',
            desc: 'AI가 사진을 분석합니다',
            gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)'
        }
    ];

    const stats = [
        {
            id: 'TODAY',
            label: '오늘 들어온 민원',
            value: statsData.today?.toLocaleString() || '0',
            color: '#d97706', // 텍스트 가독성을 위해 조금 더 진한 색상
            bg: 'linear-gradient(145deg, #fffbeb 0%, #fff7ed 100%)', // 따뜻한 연한 오렌지/앰버 배경
            borderColor: '#feTg8a'
        },
        {
            id: 'ALL',
            label: '전체 민원',
            value: statsData.total.toLocaleString(),
            color: '#7c3aed',
            bg: 'linear-gradient(145deg, #f5f3ff 0%, #ede9fe 100%)', // 연한 바이올렛 배경
            borderColor: '#ddd6fe'
        }
    ];

    return (
        <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc' }}>
            {/* Hero Section */}
            <section style={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                padding: '80px 20px 100px',
                textAlign: 'center',
                position: 'relative',
                overflow: 'hidden'
            }}>
                {/* 배경 장식 */}
                <div style={{
                    position: 'absolute',
                    top: '-50%',
                    left: '-10%',
                    width: '500px',
                    height: '500px',
                    borderRadius: '50%',
                    background: 'rgba(255,255,255,0.1)',
                    filter: 'blur(60px)'
                }}></div>
                <div style={{
                    position: 'absolute',
                    bottom: '-30%',
                    right: '-5%',
                    width: '400px',
                    height: '400px',
                    borderRadius: '50%',
                    background: 'rgba(255,255,255,0.08)',
                    filter: 'blur(80px)'
                }}></div>

                <div style={{ maxWidth: '800px', margin: '0 auto', position: 'relative', zIndex: 10 }}>
                    <div style={{ fontSize: '4rem', marginBottom: '16px' }}>🏛️</div>
                    <h1 style={{
                        fontSize: '3rem',
                        fontWeight: '800',
                        color: 'white',
                        marginBottom: '16px',
                        textShadow: '0 2px 20px rgba(0,0,0,0.2)'
                    }}>
                        모두의 민원
                    </h1>
                    <p style={{
                        fontSize: '1.2rem',
                        color: 'rgba(255,255,255,0.9)',
                        marginBottom: '40px'
                    }}>
                        AI 기반 스마트 민원 처리 시스템
                    </p>

                    {/* 카드 그리드 */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(3, 1fr)',
                        gap: '24px',
                        maxWidth: '900px',
                        margin: '0 auto'
                    }}>
                        {cards.map(card => (
                            <div
                                key={card.path}
                                onClick={() => {
                                    if (!getToken()) {
                                        showAlert('알림', '로그인이 필요합니다.', () => navigate('/login'));
                                    } else {
                                        navigate(card.path);
                                    }
                                }}
                                style={{
                                    backgroundColor: 'white',
                                    borderRadius: '20px',
                                    padding: '40px 24px',
                                    boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
                                    cursor: 'pointer',
                                    transition: 'all 0.3s ease',
                                    transform: 'translateY(0)'
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.transform = 'translateY(-10px)';
                                    e.currentTarget.style.boxShadow = '0 30px 60px rgba(0,0,0,0.3)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.transform = 'translateY(0)';
                                    e.currentTarget.style.boxShadow = '0 20px 40px rgba(0,0,0,0.2)';
                                }}
                            >
                                <div style={{
                                    width: '80px',
                                    height: '80px',
                                    borderRadius: '20px',
                                    background: card.gradient,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '2.5rem',
                                    margin: '0 auto 20px',
                                    boxShadow: '0 8px 20px rgba(0,0,0,0.15)'
                                }}>
                                    {card.icon}
                                </div>
                                <h3 style={{
                                    fontSize: '1.3rem',
                                    fontWeight: '700',
                                    color: '#1e293b',
                                    marginBottom: '8px'
                                }}>
                                    {card.title}
                                </h3>
                                <p style={{ fontSize: '0.9rem', color: '#64748b' }}>{card.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* 통계 섹션 */}
            <section style={{
                maxWidth: '1200px',
                margin: '-50px auto 0',
                padding: '0 20px',
                position: 'relative',
                zIndex: 20
            }}>
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, 1fr)',
                    gap: '24px' // 간격 조정
                }}>
                    {stats.map((stat, idx) => (
                        <div
                            key={idx}
                            style={{
                                background: stat.bg,
                                borderRadius: '24px',
                                padding: '40px',
                                boxShadow: '0 10px 40px rgba(0,0,0,0.08)',
                                border: `1px solid ${stat.borderColor}`,
                                textAlign: 'center',
                                transition: 'transform 0.2s',
                                cursor: 'default'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-5px)'}
                            onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                        >
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px',
                                marginBottom: '12px'
                            }}>
                                <span style={{
                                    color: stat.color,
                                    fontWeight: '600',
                                    fontSize: '1.2rem' // 폰트 사이즈 약간 키움
                                }}>{stat.label}</span>
                            </div>
                            <div style={{
                                fontSize: '3.5rem',
                                fontWeight: '800',
                                color: '#1e293b',
                                lineHeight: '1.2'
                            }}>
                                {stat.value}
                                <span style={{
                                    fontSize: '1.5rem',
                                    fontWeight: '600',
                                    color: '#94a3b8',
                                    marginLeft: '8px',
                                    verticalAlign: 'middle'
                                }}>건</span>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* 민원 피드 섹션 */}
            <div style={{
                maxWidth: '1200px',
                margin: '40px auto 80px',
                padding: '0 20px',
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '24px'
            }}>
                {/* 최신 민원 박스 (필터링 적용) */}
                <div
                    style={{
                        backgroundColor: 'white',
                        borderRadius: '20px',
                        overflow: 'hidden',
                        boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                        display: 'flex',
                        flexDirection: 'column'
                    }}
                >
                    <div style={{
                        background: 'linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)',
                        padding: '20px 24px',
                        color: 'white',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                    }}>
                        <div>
                            <h3 style={{ fontSize: '1.2rem', fontWeight: '700', margin: 0 }}>
                                📋 최신 민원
                            </h3>
                            <p style={{ fontSize: '0.9rem', opacity: 0.9, marginTop: '4px' }}>최근에 올라온 민원</p>
                        </div>
                        <button
                            onClick={() => navigate('/list')}
                            style={{
                                background: 'rgba(255,255,255,0.2)',
                                border: 'none',
                                color: 'white',
                                padding: '6px 12px',
                                borderRadius: '20px',
                                cursor: 'pointer',
                                fontSize: '0.85rem'
                            }}
                        >
                            더보기 &rarr;
                        </button>
                    </div>
                    <div style={{ padding: '0', flex: 1 }}>
                        {latestComplaints.length === 0 ? (
                            <div style={{
                                height: '200px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#94a3b8'
                            }}>
                                <p>등록된 최신 민원이 없습니다</p>
                            </div>
                        ) : (
                            <div>
                                {latestComplaints.map((c, idx) => (
                                    <div
                                        key={c.complaintNo}
                                        onClick={() => navigate(`/reports/${c.complaintNo}`)}
                                        style={{
                                            padding: '16px 24px',
                                            borderBottom: idx < latestComplaints.length - 1 ? '1px solid #f1f5f9' : 'none',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            transition: 'background-color 0.2s'
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
                                    >
                                        <div style={{ overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', marginRight: '10px' }}>
                                            <span style={{
                                                marginRight: '8px',
                                                fontWeight: '600',
                                                fontSize: '0.8rem',
                                                padding: '2px 6px',
                                                borderRadius: '4px',
                                                backgroundColor: c.status === 'COMPLETED' ? '#dcfce7' : (c.status === 'IN_PROGRESS' ? '#fef3c7' : '#fee2e2'),
                                                color: c.status === 'COMPLETED' ? '#166534' : (c.status === 'IN_PROGRESS' ? '#92400e' : '#dc2626')
                                            }}>
                                                {c.status === 'COMPLETED' ? '처리완료' : (c.status === 'IN_PROGRESS' ? '처리중' : '미처리')}
                                            </span>
                                            <span style={{ fontWeight: '600', color: '#334155' }}>{c.title}</span>
                                        </div>
                                        <div style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
                                            {new Date(c.createdDate).toLocaleDateString()}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* 주요 민원 (TOP 5 좋아요) */}
                <div
                    style={{
                        backgroundColor: 'white',
                        borderRadius: '20px',
                        overflow: 'hidden',
                        boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                    }}
                >
                    <div style={{
                        background: 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)',
                        padding: '20px 24px',
                        color: 'white'
                    }}>
                        <h3 style={{ fontSize: '1.2rem', fontWeight: '700', margin: 0 }}>
                            🔥 주요 민원
                        </h3>
                        <p style={{ fontSize: '0.9rem', opacity: 0.9, marginTop: '4px' }}>가장 많은 관심(좋아요)을 받은 민원</p>
                    </div>
                    <div style={{ padding: '0' }}>
                        {topLiked.length === 0 ? (
                            <div style={{
                                height: '200px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#94a3b8'
                            }}>
                                <p>해당하는 주요 민원이 없습니다</p>
                            </div>
                        ) : (
                            <div>
                                {topLiked.map((c, idx) => (
                                    <div
                                        key={c.complaintNo}
                                        onClick={() => navigate(`/reports/${c.complaintNo}`)}
                                        style={{
                                            padding: '16px 24px',
                                            borderBottom: idx < topLiked.length - 1 ? '1px solid #f1f5f9' : 'none',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            transition: 'background-color 0.2s'
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
                                    >
                                        <div style={{ overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', marginRight: '10px' }}>
                                            <span style={{
                                                marginRight: '8px',
                                                fontWeight: '700',
                                                color: idx < 3 ? '#ef4444' : '#64748b'
                                            }}>{idx + 1}.</span>
                                            <span style={{ fontWeight: '600', color: '#334155' }}>{c.title}</span>
                                        </div>
                                        <div style={{ fontSize: '0.9rem', color: '#ef4444', fontWeight: '700', minWidth: '60px', textAlign: 'right' }}>
                                            ❤️ {c.likeCount}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Home;

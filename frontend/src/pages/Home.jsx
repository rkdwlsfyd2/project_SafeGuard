import React from 'react';
import { useNavigate } from 'react-router-dom';

function Home() {
    const navigate = useNavigate();
    const [statsData, setStatsData] = React.useState({ total: 0, processing: 0, completed: 0 });
    const [topLiked, setTopLiked] = React.useState([]);

    React.useEffect(() => {
        // Fetch Stats
        fetch('/api/complaints/stats')
            .then(res => res.json())
            .then(data => setStatsData(data))
            .catch(err => console.error('Failed to fetch stats:', err));

        // Fetch Top Liked
        fetch('/api/complaints/top-liked')
            .then(res => res.json())
            .then(data => setTopLiked(data))
            .catch(err => console.error('Failed to fetch top liked:', err));
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
        { label: '전체 민원', value: statsData.total.toLocaleString(), color: '#7c3aed', icon: '📊' },
        { label: '처리 중', value: statsData.processing.toLocaleString(), color: '#f59e0b', icon: '⏳', percent: statsData.total > 0 ? (statsData.processing / statsData.total * 100) : 0 },
        { label: '답변 완료', value: statsData.completed.toLocaleString(), color: '#10b981', icon: '✅', percent: statsData.total > 0 ? (statsData.completed / statsData.total * 100) : 0 }
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
                                onClick={() => navigate(card.path)}
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
                    backgroundColor: 'white',
                    borderRadius: '24px',
                    padding: '40px',
                    boxShadow: '0 10px 40px rgba(0,0,0,0.08)',
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: '40px'
                }}>
                    {stats.map((stat, idx) => (
                        <div key={idx} style={{ textAlign: 'center' }}>
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px',
                                marginBottom: '12px'
                            }}>
                                <span style={{ fontSize: '1.5rem' }}>{stat.icon}</span>
                                <span style={{
                                    color: stat.color,
                                    fontWeight: '600',
                                    fontSize: '1rem'
                                }}>{stat.label}</span>
                            </div>
                            <div style={{
                                fontSize: '2.5rem',
                                fontWeight: '800',
                                color: '#1e293b',
                                marginBottom: '12px'
                            }}>
                                {stat.value}<span style={{ fontSize: '1rem', fontWeight: '500', marginLeft: '4px' }}>건</span>
                            </div>
                            {stat.percent && (
                                <div style={{
                                    height: '8px',
                                    backgroundColor: '#f1f5f9',
                                    borderRadius: '4px',
                                    overflow: 'hidden',
                                    maxWidth: '200px',
                                    margin: '0 auto'
                                }}>
                                    <div style={{
                                        height: '100%',
                                        width: `${stat.percent}%`,
                                        backgroundColor: stat.color,
                                        borderRadius: '4px',
                                        transition: 'width 1s ease'
                                    }}></div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </section>

            {/* 민원 피드 섹션 */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '24px'
            }}>
                {/* 최신 민원 박스 (기존 유지) */}
                <div
                    onClick={() => navigate('/list')}
                    style={{
                        backgroundColor: 'white',
                        borderRadius: '20px',
                        overflow: 'hidden',
                        boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                        cursor: 'pointer',
                        transition: 'box-shadow 0.3s',
                        display: 'flex',
                        flexDirection: 'column'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 10px 40px rgba(0,0,0,0.15)'}
                    onMouseLeave={(e) => e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.08)'}
                >
                    <div style={{
                        background: 'linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)',
                        padding: '20px 24px',
                        color: 'white'
                    }}>
                        <h3 style={{ fontSize: '1.2rem', fontWeight: '700', margin: 0 }}>📋 최신 민원</h3>
                        <p style={{ fontSize: '0.9rem', opacity: 0.9, marginTop: '4px' }}>목록으로 이동</p>
                    </div>
                    <div style={{
                        flex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#94a3b8',
                        padding: '40px'
                    }}>
                        <div style={{ textAlign: 'center' }}>
                            <p style={{ fontSize: '1rem', color: '#64748b' }}>전체 목록 보러가기</p>
                        </div>
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
                        <h3 style={{ fontSize: '1.2rem', fontWeight: '700', margin: 0 }}>🔥 주요 민원 (화제의 민원)</h3>
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
                                <p>아직 주요 민원이 없습니다</p>
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

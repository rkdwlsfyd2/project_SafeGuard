import React from 'react';
import { useNavigate } from 'react-router-dom';

function Home() {
    const navigate = useNavigate();
    const iconStyle = {
        backgroundImage: 'url("/assets/icons.png")',
        backgroundSize: '100% 300%',
        width: '120px',
        height: '120px',
        borderRadius: '50%',
        backgroundColor: 'white',
        boxShadow: '0 4px 10px rgba(0,0,0,0.05)',
    };

    return (
        <main>
            {/* Hero Section */}
            <section className="hero">
                <div className="container">
                    <div className="hero__grid">
                        <div className="card" onClick={() => navigate('/apply-text')}>
                            <div className="card__icon-wrapper" style={{ ...iconStyle, backgroundPosition: 'center 5%' }}></div>
                            <h3 className="card__title">민원 신청</h3>
                        </div>
                        <div className="card" onClick={() => navigate('/apply-voice')}>
                            <div className="card__icon-wrapper" style={{ ...iconStyle, backgroundPosition: 'center 50%' }}></div>
                            <h3 className="card__title">음성 민원 신청</h3>
                        </div>
                        <div className="card" onClick={() => navigate('/apply-image')}>
                            <div className="card__icon-wrapper" style={{ ...iconStyle, backgroundPosition: 'center 95%' }}></div>
                            <h3 className="card__title">이미지 민원 신청</h3>
                        </div>
                    </div>
                </div>
            </section>

            {/* Status Section */}
            <section className="status-section">
                <div className="container">
                    <h4 className="status__title">신고현황</h4>
                    <div className="status__grid">
                        <div className="status__item">
                            <div className="status__label" style={{ color: '#3F51B5' }}>전체(누계)</div>
                            <div className="status__value">1,272,379 <span className="status__unit">건</span></div>
                        </div>
                        <div className="status__item">
                            <div className="status__label" style={{ color: '#009688' }}>진행중</div>
                            <div className="status__value">196,266 <span className="status__unit">건</span></div>
                            <div className="progress-bar">
                                <div className="progress-fill" style={{ width: '15.43%', backgroundColor: '#009688' }}></div>
                            </div>
                        </div>
                        <div className="status__item">
                            <div className="status__label" style={{ color: '#4CAF50' }}>답변완료</div>
                            <div className="status__value">1,076,113 <span className="status__unit">건</span></div>
                            <div className="progress-bar">
                                <div className="progress-fill" style={{ width: '84.6%', backgroundColor: '#4CAF50' }}></div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Feed Section */}
            <section className="feed-section">
                <div className="container">
                    <div className="feed__grid">
                        <div className="feed-box" onClick={() => navigate('/list')} style={{ cursor: 'pointer' }}>
                            <div className="feed-box__header">최신 민원 (목록보기)</div>
                            <div className="feed-box__content">
                                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: '#CCC', fontSize: '0.9rem' }}>
                                    최근 접수된 민원이 없습니다.
                                </div>
                            </div>
                        </div>
                        <div className="feed-box" onClick={() => navigate('/list')} style={{ cursor: 'pointer' }}>
                            <div className="feed-box__header">주요 민원 (목록보기)</div>
                            <div className="feed-box__content">
                                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: '#CCC', fontSize: '0.9rem' }}>
                                    주목받는 주요 민원이 없습니다.
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </main>
    );
}

export default Home;

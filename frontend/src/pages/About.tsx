import React from 'react';

function About() {
    const cardStyle: React.CSSProperties = { backgroundColor: 'white', padding: '25px', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' };
    const iconBgStyle: React.CSSProperties = { width: '80px', height: '80px', borderRadius: '50%', backgroundColor: '#EEF2FF', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '15px' };

    return (
        <div className="about-page" style={{ padding: '60px 0', backgroundColor: '#F8FAFC' }}>
            <div className="container">
                {/* Main Intro */}
                <div style={{ backgroundColor: 'white', padding: '50px', borderRadius: '16px', boxShadow: '0 5px 25px rgba(0,0,0,0.05)', marginBottom: '50px' }}>
                    <div>
                        <h2 style={{ fontSize: '2.5rem', color: 'var(--primary-color)', marginBottom: '20px', fontWeight: '800' }}>모두의 민원이란?</h2>
                        <p style={{ fontSize: '1.1rem', color: '#555', marginBottom: '20px', lineHeight: '1.8' }}>
                            <strong>모두의 민원</strong>은 국민이 겪는 불편과 요청을 하나의 창구에서 쉽고 빠르게 전달할 수 있는 민원 서비스입니다.<br /><br />
                            복잡한 행정 구조를 국민이 이해할 필요 없이, 하나의 창구에서 민원을 접수하면 AI가 내용을 이해하고 분류하여 처리 흐름을 안내합니다.
                        </p>
                    </div>

                </div>

                {/* Pain Points */}
                <div style={{ backgroundColor: '#EEF2FF', padding: '40px', borderRadius: '16px', marginBottom: '50px' }}>
                    <h3 style={{ textAlign: 'center', marginBottom: '30px', color: 'var(--primary-color)' }}>이런 점이 불편하지 않으셨나요?</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                        <div style={{ backgroundColor: 'white', padding: '15px 25px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '15px' }}>
                            <span style={{ color: '#FBBF24', fontSize: '1.5rem' }}>⚠️</span>
                            <span style={{ fontWeight: '500' }}>민원을 어디에 접수 해야할지 몰라 헤맨 경험</span>
                        </div>
                        <div style={{ backgroundColor: 'white', padding: '15px 25px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '15px' }}>
                            <span style={{ color: '#FBBF24', fontSize: '1.5rem' }}>⚠️</span>
                            <span style={{ fontWeight: '500' }}>같은 내용을 여러 기관에 반복해서 제출해야 했던 불편</span>
                        </div>
                        <div style={{ backgroundColor: 'white', padding: '15px 25px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '15px' }}>
                            <span style={{ color: '#FBBF24', fontSize: '1.5rem' }}>⚠️</span>
                            <span style={{ fontWeight: '500' }}>접수 후 처리 상황을 알 수 없어 답답했던 경험</span>
                        </div>
                    </div>
                </div>

                {/* Benefits */}
                <h3 style={{ textAlign: 'center', marginBottom: '30px', color: 'var(--primary-color)' }}>모두의 민원은 이렇게 도와드립니다!</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
                    <div style={cardStyle}>
                        <div style={iconBgStyle}>📢</div>
                        <h4 style={{ marginBottom: '10px' }}>누구나 쉽게 민원 접수</h4>
                        <p style={{ fontSize: '0.9rem', color: '#777' }}>말로, 글로, 사진으로 어떤 방식이든 모두의 민원에서 간편하게 접수할 수 있습니다.</p>
                    </div>
                    <div style={cardStyle}>
                        <div style={iconBgStyle}>🤖</div>
                        <h4 style={{ marginBottom: '10px' }}>알아서 선택되는 민원</h4>
                        <p style={{ fontSize: '0.9rem', color: '#777' }}>복잡한 행정 용어나 절차를 몰라도 민원 내용에 맞게 자동으로 선택됩니다.</p>
                    </div>
                    <div style={cardStyle}>
                        <div style={iconBgStyle}>📍</div>
                        <h4 style={{ marginBottom: '10px' }}>지역별 민원 현황 보기</h4>
                        <p style={{ fontSize: '0.9rem', color: '#777' }}>내 주변에서 접수된 민원을 지도를 통해 한눈에 확인할 수 있습니다.</p>
                    </div>
                    <div style={cardStyle}>
                        <div style={iconBgStyle}>📋</div>
                        <h4 style={{ marginBottom: '10px' }}>민원 처리 과정 한눈에 확인</h4>
                        <p style={{ fontSize: '0.9rem', color: '#777' }}>민원 접수부터 처리까지 현재 진행 상황을 쉽게 확인할 수 있습니다.</p>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default About;

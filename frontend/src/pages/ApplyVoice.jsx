import React from 'react';

function ApplyVoice() {
    const sidebarItemStyle = { marginBottom: '25px', display: 'flex', alignItems: 'center', gap: '10px', color: '#555', fontSize: '0.9rem' };

    return (
        <div className="apply-voice-page" style={{ padding: '40px 0' }}>
            <div className="container" style={{ display: 'grid', gridTemplateColumns: '1fr 3fr 1.2fr', gap: '30px' }}>
                {/* Left Sidebar Steps */}
                <div style={{ backgroundColor: '#F9F9F9', padding: '30px', borderRadius: '8px' }}>
                    <div style={sidebarItemStyle}>민원 제목 <span style={{ color: 'red' }}>✓</span></div>
                    <div style={sidebarItemStyle}>음성 인식 <span style={{ color: 'red' }}>✓</span></div>
                    <div style={{ ...sidebarItemStyle, marginTop: '350px' }}>신고 내용 공유 여부 <span style={{ color: 'red' }}>✓</span></div>
                    <div style={sidebarItemStyle}>개인정보 동의 여부 <span style={{ color: 'red' }}>✓</span></div>
                </div>

                {/* Center Main Form */}
                <div style={{ backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
                    <div style={{ backgroundColor: 'var(--primary-color)', color: 'white', padding: '15px', textAlign: 'center', fontWeight: 'bold' }}>
                        통합 민원 신청
                    </div>
                    <div style={{ padding: '30px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <input type="text" placeholder="" style={{ width: '100%', padding: '12px', border: '1px solid #E0E0E0', borderRadius: '4px', marginBottom: '40px' }} />

                        <div style={{ width: '120px', height: '120px', borderRadius: '50%', border: '4px solid var(--primary-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '30px' }}>
                            <svg width="60" height="60" viewBox="0 0 24 24" fill="var(--primary-color)">
                                <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
                                <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
                            </svg>
                        </div>

                        <div style={{ width: '100%', backgroundColor: '#EEE', height: '30px', borderRadius: '15px', position: 'relative', overflow: 'hidden', marginBottom: '10px' }}>
                            <div style={{ width: '30%', height: '100%', backgroundColor: '#FF4B4B' }}></div>
                            <div style={{ position: 'absolute', top: '0', left: '10px', height: '100%', display: 'flex', alignItems: 'center', color: 'white', fontSize: '0.8rem' }}>0:30</div>
                            <div style={{ position: 'absolute', top: '0', right: '10px', height: '100%', display: 'flex', alignItems: 'center', color: '#555', fontSize: '0.8rem' }}>5:00</div>
                        </div>

                        <div style={{ width: '100%', marginBottom: '20px', marginTop: '30px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                                <span style={{ fontWeight: 'bold' }}>발생 위치</span>
                                <button style={{ backgroundColor: 'var(--primary-color)', color: 'white', border: 'none', padding: '5px 15px', borderRadius: '4px', cursor: 'pointer' }}>위치 찾기</button>
                            </div>
                            <div style={{ width: '100%', height: '180px', backgroundColor: '#EEE', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                                <img src="https://via.placeholder.com/600x200?text=Map+Placeholder" alt="Map" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            </div>
                        </div>

                        <div style={{ width: '100%', display: 'flex', gap: '20px', marginBottom: '15px' }}>
                            <label><input type="radio" name="share" /> 공개</label>
                            <label><input type="radio" name="share" /> 비공개</label>
                        </div>
                        <div style={{ width: '100%', display: 'flex', gap: '20px' }}>
                            <label><input type="radio" name="agree" /> 동의</label>
                            <label><input type="radio" name="agree" /> 비동의</label>
                        </div>
                    </div>
                </div>

                {/* Right AI Analysis */}
                <div style={{ background: 'linear-gradient(to bottom, #7C3AED, #60A5FA)', borderRadius: '12px', padding: '2px' }}>
                    <div style={{ backgroundColor: 'white', borderRadius: '10px', height: '100%', padding: '20px' }}>
                        <h3 style={{ textAlign: 'center', color: '#4F46E5', marginBottom: '20px' }}>AI 분석결과</h3>
                        <div style={{ padding: '15px', backgroundColor: '#EEF2FF', borderRadius: '8px', marginBottom: '15px' }}>
                            <div style={{ fontSize: '0.8rem', color: '#6366F1', marginBottom: '5px' }}>민원 유형 AI 결과</div>
                            <div style={{ fontWeight: 'bold', textAlign: 'center' }}>유형: <span style={{ color: '#4F46E5' }}>교통</span></div>
                        </div>
                        <div style={{ padding: '15px', backgroundColor: '#EEF2FF', borderRadius: '8px', marginBottom: '15px' }}>
                            <div style={{ fontSize: '0.8rem', color: '#6366F1', marginBottom: '5px' }}>처리 기관 AI 분류 결과</div>
                            <div style={{ fontWeight: 'bold', textAlign: 'center' }}>처리기관: <span style={{ color: '#4F46E5' }}>도로교통부</span></div>
                        </div>
                        <div style={{ padding: '15px', backgroundColor: '#EEF2FF', borderRadius: '8px' }}>
                            <div style={{ fontSize: '0.8rem', color: '#6366F1', marginBottom: '5px' }}>음성 인식 결과</div>
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: '0.85rem', color: '#312E81', marginBottom: '5px' }}>발생지점</div>
                                <div style={{ fontSize: '0.8rem', marginBottom: '10px' }}>서울 강남구 남부순환로365길 33</div>
                                <div style={{ fontSize: '0.85rem', color: '#312E81', marginBottom: '5px' }}>민원 내용</div>
                                <div style={{ fontSize: '0.8rem' }}>공원 내 잡초 제거 요청</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default ApplyVoice;

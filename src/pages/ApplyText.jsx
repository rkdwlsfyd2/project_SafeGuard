import React from 'react';

function ApplyText() {
    const sidebarItemStyle = { marginBottom: '25px', display: 'flex', alignItems: 'center', gap: '10px', color: '#555', fontSize: '0.9rem' };

    return (
        <div className="apply-text-page" style={{ padding: '40px 0' }}>
            <div className="container" style={{ display: 'grid', gridTemplateColumns: '1fr 3fr 1.2fr', gap: '30px' }}>
                {/* Left Sidebar Steps */}
                <div style={{ backgroundColor: '#F9F9F9', padding: '30px', borderRadius: '8px' }}>
                    <div style={sidebarItemStyle}>민원 제목 <span style={{ color: 'red' }}>✓</span></div>
                    <div style={sidebarItemStyle}>내 용 <span style={{ color: 'red' }}>✓</span></div>
                    <div style={{ ...sidebarItemStyle, marginTop: '100px' }}>파일첨부</div>
                    <div style={{ ...sidebarItemStyle, marginTop: '200px' }}>신고 내용 공유 여부 <span style={{ color: 'red' }}>✓</span></div>
                    <div style={sidebarItemStyle}>개인정보 동의 여부 <span style={{ color: 'red' }}>✓</span></div>
                </div>

                {/* Center Main Form */}
                <div style={{ backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
                    <div style={{ backgroundColor: 'var(--primary-color)', color: 'white', padding: '15px', textAlign: 'center', fontWeight: 'bold' }}>
                        통합 민원 신청
                    </div>
                    <div style={{ padding: '30px' }}>
                        <input type="text" placeholder="" style={{ width: '100%', padding: '12px', border: '1px solid #E0E0E0', borderRadius: '4px', marginBottom: '20px' }} />
                        <textarea style={{ width: '100%', height: '150px', padding: '12px', border: '1px solid #E0E0E0', borderRadius: '4px', marginBottom: '20px' }}></textarea>

                        <div style={{ border: '1px solid #E0E0E0', borderRadius: '4px', height: '150px', marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#AAA' }}>
                            파일 목록이 비어 있습니다.
                        </div>

                        <div style={{ marginBottom: '20px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                                <span style={{ fontWeight: 'bold' }}>발생 위치</span>
                                <button style={{ backgroundColor: 'var(--primary-color)', color: 'white', border: 'none', padding: '5px 15px', borderRadius: '4px', cursor: 'pointer' }}>위치 찾기</button>
                                <span style={{ fontSize: '0.9rem' }}>서울특별시 종로구 사직로 161</span>
                            </div>
                            <div style={{ width: '100%', height: '200px', backgroundColor: '#EEE', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                                <img src="https://via.placeholder.com/600x200?text=Map+Placeholder" alt="Map" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '20px', marginBottom: '20px' }}>
                            <label><input type="radio" name="share" /> 공개</label>
                            <label><input type="radio" name="share" /> 비공개</label>
                        </div>
                        <div style={{ display: 'flex', gap: '20px' }}>
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
                        <div style={{ padding: '15px', backgroundColor: '#EEF2FF', borderRadius: '8px' }}>
                            <div style={{ fontSize: '0.8rem', color: '#6366F1', marginBottom: '5px' }}>처리 기관 AI 분류 결과</div>
                            <div style={{ fontWeight: 'bold', textAlign: 'center' }}>처리기관: <span style={{ color: '#4F46E5' }}>도로교통부</span></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default ApplyText;

import React, { useState, useRef } from 'react';

function ApplyImage() {
    const sidebarItemStyle = { marginBottom: '25px', display: 'flex', alignItems: 'center', gap: '10px', color: '#555', fontSize: '0.9rem' };
    const [selectedImage, setSelectedImage] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [aiResult, setAiResult] = useState({ type: '-', agency: '-' });
    const fileInputRef = useRef(null);

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setSelectedImage(file);
        setPreviewUrl(URL.createObjectURL(file));
        setIsAnalyzing(true);
        setAiResult({ type: '분석 중...', agency: '분석 중...' });

        const formData = new FormData();
        formData.append('image', file);

        try {
            console.log('[프론트엔드 로그] AI 분석 요청 시작...');
            const response = await fetch('http://localhost:5000/api/analyze-image', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) throw new Error('분석 실패');

            const data = await response.json();
            console.log('[프론트엔드 로그] 분석 완료:', data);
            setAiResult({ type: data.type, agency: data.agency });
        } catch (error) {
            console.error('[프론트엔드 로그] 오류 발생:', error);
            setAiResult({ type: '오류 발생', agency: '다시 시도해주세요' });
        } finally {
            setIsAnalyzing(false);
        }
    };

    const triggerFileInput = () => {
        fileInputRef.current.click();
    };

    return (
        <div className="apply-image-page" style={{ padding: '40px 0' }}>
            <div className="container" style={{ display: 'grid', gridTemplateColumns: '1fr 3fr 1.2fr', gap: '30px' }}>
                {/* Left Sidebar Steps */}
                <div style={{ backgroundColor: '#F9F9F9', padding: '30px', borderRadius: '8px' }}>
                    <div style={sidebarItemStyle}>민원 제목 <span style={{ color: 'red' }}>✓</span></div>
                    <div style={sidebarItemStyle}>파일첨부 <span style={{ color: selectedImage ? 'green' : 'red' }}>✓</span></div>
                    <div style={{ ...sidebarItemStyle, marginTop: '350px' }}>신고 내용 공유 여부 <span style={{ color: 'red' }}>✓</span></div>
                    <div style={sidebarItemStyle}>개인정보 동의 여부 <span style={{ color: 'red' }}>✓</span></div>
                </div>

                {/* Center Main Form */}
                <div style={{ backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
                    <div style={{ backgroundColor: 'var(--primary-color)', color: 'white', padding: '15px', textAlign: 'center', fontWeight: 'bold' }}>
                        통합 민원 신청
                    </div>
                    <div style={{ padding: '30px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <input type="text" placeholder="민원 제목을 입력하세요." style={{ width: '100%', padding: '12px', border: '1px solid #E0E0E0', borderRadius: '4px', marginBottom: '40px' }} />

                        <input
                            type="file"
                            accept="image/*"
                            onChange={handleFileChange}
                            style={{ display: 'none' }}
                            ref={fileInputRef}
                        />

                        <div
                            onClick={triggerFileInput}
                            style={{
                                width: '150px',
                                height: '150px',
                                borderRadius: '50%',
                                border: `4px solid ${isAnalyzing ? '#DDD' : 'var(--primary-color)'}`,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                marginBottom: '30px',
                                cursor: 'pointer',
                                overflow: 'hidden',
                                position: 'relative'
                            }}
                        >
                            {previewUrl ? (
                                <img src={previewUrl} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                                <img src="/assets/icons.png" alt="Attach" style={{ width: '80px', height: '80px', objectFit: 'contain' }} />
                            )}
                            {isAnalyzing && (
                                <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(255,255,255,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                                    분석 중...
                                </div>
                            )}
                        </div>
                        <p style={{ color: '#777', marginBottom: '40px' }}>
                            {selectedImage ? selectedImage.name : '사진을 업로드해 주세요.'}
                        </p>

                        <div style={{ width: '100%', marginBottom: '20px' }}>
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
                            <div style={{ fontWeight: 'bold', textAlign: 'center' }}>유형: <span style={{ color: '#4F46E5' }}>{aiResult.type}</span></div>
                        </div>
                        <div style={{ padding: '15px', backgroundColor: '#EEF2FF', borderRadius: '8px' }}>
                            <div style={{ fontSize: '0.8rem', color: '#6366F1', marginBottom: '5px' }}>처리 기관 AI 분류 결과</div>
                            <div style={{ fontWeight: 'bold', textAlign: 'center' }}>처리기관: <span style={{ color: '#4F46E5' }}>{aiResult.agency}</span></div>
                        </div>

                        {isAnalyzing && (
                            <div style={{ marginTop: '20px', textAlign: 'center', fontSize: '0.8rem', color: '#777' }}>
                                <div className="loader" style={{ border: '3px solid #f3f3f3', borderTop: '3px solid #3498db', borderRadius: '50%', width: '20px', height: '20px', animation: 'spin 2s linear infinite', margin: '0 auto 10px' }}></div>
                                AI가 이미지를 분석 중입니다...
                            </div>
                        )}

                        <style>{`
                            @keyframes spin {
                                0% { transform: rotate(0deg); }
                                100% { transform: rotate(360deg); }
                            }
                        `}</style>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default ApplyImage;

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { complaintsAPI, getToken } from '../utils/api';

function ApplyImage() {
    const navigate = useNavigate();
    const mapRef = useRef(null);
    const fileInputRef = useRef(null);

    const [formData, setFormData] = useState({
        title: '',
        content: '',
        imagePath: '',
        isPublic: true,
        location: {
            lat: 37.5665,
            lng: 126.9780,
            address: '서울특별시 중구'
        }
    });

    const [selectedImage, setSelectedImage] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [aiResult, setAiResult] = useState({ type: '-', agency: '-' });

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [currentStep, setCurrentStep] = useState(1);

    // 카카오 지도 초기화
    useEffect(() => {
        const loadKakaoMap = () => {
            if (window.kakao && window.kakao.maps) {
                window.kakao.maps.load(() => {
                    const container = mapRef.current;
                    const options = {
                        center: new window.kakao.maps.LatLng(37.5665, 126.9780),
                        level: 3
                    };
                    const newMap = new window.kakao.maps.Map(container, options);

                    const marker = new window.kakao.maps.Marker({
                        position: newMap.getCenter(),
                        map: newMap
                    });

                    window.kakao.maps.event.addListener(newMap, 'click', (mouseEvent) => {
                        const latlng = mouseEvent.latLng;
                        marker.setPosition(latlng);

                        const geocoder = new window.kakao.maps.services.Geocoder();
                        geocoder.coord2Address(latlng.getLng(), latlng.getLat(), (result, status) => {
                            if (status === window.kakao.maps.services.Status.OK) {
                                const addr = result[0].address.address_name;
                                setFormData(prev => ({
                                    ...prev,
                                    location: { lat: latlng.getLat(), lng: latlng.getLng(), address: addr }
                                }));
                            }
                        });
                    });
                });
            }
        };

        const kakaoKey = import.meta.env.VITE_KAKAO_MAP_KEY;
        if (kakaoKey) {
            const script = document.createElement('script');
            script.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${kakaoKey}&autoload=false&libraries=services`;
            script.async = true;
            script.onload = loadKakaoMap;
            document.head.appendChild(script);
            return () => {
                document.head.removeChild(script);
            };
        }
    }, []);

    // 단계 업데이트
    useEffect(() => {
        if (formData.title) setCurrentStep(2);
        if (formData.title && selectedImage) setCurrentStep(3);
        if (formData.title && selectedImage && formData.location.address) setCurrentStep(4);
    }, [formData, selectedImage]);

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // --- 1. 검증 로직을 가장 위로 이동 ---
        if (!file.type.startsWith('image/')) {
            alert("이미지 파일만 업로드 가능합니다.");
            return;
        }
        // 2. 용량 체크
        const MAX_SIZE = 5 * 1024 * 1024; // 5MB
        if (file.size > MAX_SIZE) {
            alert("이미지 용량은 5MB 이하만 업로드 가능합니다.");
            return;
        }

        // --- 2. 검증 통과 후 상태 업데이트 ---
        setSelectedImage(file);
        setPreviewUrl(URL.createObjectURL(file));
        setIsAnalyzing(true);
        setAiResult({ type: '분석 중...', agency: '분석 중...' });

        const uploadData = new FormData();
        uploadData.append('image', file);

        try {
            console.log('[프론트엔드 로그] AI 분석 요청 시작...');
            const response = await fetch('http://localhost:5001/api/analyze-image', {
                method: 'POST',
                body: uploadData,
            });

            if (!response.ok) throw new Error('분석 실패');

            const data = await response.json();
            setAiResult({ type: data.type, agency: data.agency });

            // 분석 결과를 내용에 자동 채움
            setFormData(prev => ({
                ...prev,
                content: `[AI 이미지 분석 결과]\n유형: ${data.type}\n담당: ${data.agency}\n\n(상세 내용을 추가로 입력해주세요)`
            }));

        } catch (error) {
            console.error('AI Analysis Error:', error);
            setAiResult({ type: '분석 실패', agency: '-' });
        } finally {
            setIsAnalyzing(false);
        }
    };

    const triggerFileInput = () => {
        fileInputRef.current.click();
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!getToken()) {
            alert('로그인이 필요합니다.');
            navigate('/login');
            return;
        }
        if (!formData.title || !selectedImage) {
            setError('제목과 이미지를 모두 입력해주세요.');
            return;
        }

        setLoading(true);
        setError('');

        try {
            // 1. 이미지를 백엔드 영구 저장소에 업로드
            console.log('[프론트엔드 로그] 서버에 이미지 업로드 시작...');
            const uploadResult = await complaintsAPI.uploadImage(selectedImage);
            const imagePath = uploadResult.imagePath; // 서버에서 반환한 경로

            // 2. 업로드된 경로를 포함하여 민원 생성 전송
            const result = await complaintsAPI.create({
                category: '이미지',
                title: formData.title,
                content: formData.content,
                isPublic: formData.isPublic,
                location: formData.location,
                imagePath: imagePath // 저장된 경로 전달
            });

            alert(`이미지 민원이 접수되었습니다. (접수번호: ${result.complaintNo})`);
            navigate('/list');
        } catch (err) {
            console.error('Submit Error:', err);
            setError(err.message || '민원 접수 중 오류가 발생했습니다.');
        } finally {
            setLoading(false);
        }
    };

    const steps = [
        { num: 1, label: '제목 입력', done: !!formData.title },
        { num: 2, label: '사진 첨부', done: !!selectedImage },
        { num: 3, label: '위치 선택', done: true },
        { num: 4, label: '접수 완료', done: false }
    ];

    return (
        <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', padding: '40px 20px' }}>
            <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
                {/* 페이지 헤더 */}
                <div style={{ textAlign: 'center', marginBottom: '40px' }}>
                    <h1 style={{ fontSize: '2.5rem', fontWeight: '800', color: '#1e293b', marginBottom: '10px' }}>
                        📷 이미지 민원 신청
                    </h1>
                    <p style={{ color: '#64748b', fontSize: '1.1rem' }}>현장 사진으로 정확하게 민원을 신청하세요</p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr 320px', gap: '24px' }}>
                    {/* 왼쪽 - 진행 단계 */}
                    <div style={{
                        backgroundColor: 'white',
                        borderRadius: '20px',
                        padding: '30px',
                        boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                        height: 'fit-content',
                        position: 'sticky',
                        top: '100px'
                    }}>
                        <h3 style={{ fontSize: '1rem', fontWeight: '700', color: '#374151', marginBottom: '24px' }}>
                            📋 작성 단계
                        </h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            {steps.map((step, idx) => (
                                <div key={step.num} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <div style={{
                                        width: '36px',
                                        height: '36px',
                                        borderRadius: '50%',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '0.85rem',
                                        fontWeight: '700',
                                        backgroundColor: currentStep > step.num || step.done ? '#7c3aed' : currentStep === step.num ? '#eef2ff' : '#f1f5f9',
                                        color: currentStep > step.num || step.done ? 'white' : currentStep === step.num ? '#7c3aed' : '#94a3b8',
                                        border: currentStep === step.num ? '2px solid #7c3aed' : 'none',
                                        transition: 'all 0.3s'
                                    }}>
                                        {currentStep > step.num || step.done ? '✓' : step.num}
                                    </div>
                                    <span style={{
                                        fontSize: '0.95rem',
                                        fontWeight: currentStep === step.num ? '600' : '400',
                                        color: currentStep === step.num ? '#1e293b' : '#64748b'
                                    }}>
                                        {step.label}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* 가운데 - 메인 폼 */}
                    <div style={{
                        backgroundColor: 'white',
                        borderRadius: '20px',
                        boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                        overflow: 'hidden'
                    }}>
                        <div style={{
                            background: 'linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)',
                            padding: '24px 30px',
                            color: 'white'
                        }}>
                            <h2 style={{ fontSize: '1.3rem', fontWeight: '700', margin: 0 }}>이미지 민원 신청서</h2>
                            <p style={{ fontSize: '0.9rem', opacity: 0.9, marginTop: '6px' }}>사진을 업로드하면 AI가 분석합니다</p>
                        </div>

                        <form onSubmit={handleSubmit} style={{ padding: '30px' }}>
                            {error && (
                                <div style={{
                                    padding: '14px 18px',
                                    backgroundColor: '#fef2f2',
                                    border: '1px solid #fecaca',
                                    borderRadius: '12px',
                                    color: '#dc2626',
                                    marginBottom: '20px',
                                    fontSize: '0.9rem'
                                }}>
                                    ⚠️ {error}
                                </div>
                            )}

                            {/* 제목 입력 */}
                            <div style={{ marginBottom: '24px' }}>
                                <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>
                                    민원 제목 <span style={{ color: '#ef4444' }}>*</span>
                                </label>
                                <input
                                    type="text"
                                    value={formData.title}
                                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                                    placeholder="민원 제목을 입력하세요"
                                    style={{
                                        width: '100%',
                                        padding: '14px 18px',
                                        border: '2px solid #e2e8f0',
                                        borderRadius: '12px',
                                        fontSize: '1rem',
                                        outline: 'none',
                                        transition: 'border-color 0.2s',
                                        boxSizing: 'border-box'
                                    }}
                                    onFocus={(e) => e.target.style.borderColor = '#7c3aed'}
                                    onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                                />
                            </div>

                            {/* 이미지 업로드 섹션 */}
                            <div style={{ marginBottom: '30px', textAlign: 'center' }}>
                                <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '600', color: '#374151', marginBottom: '16px', textAlign: 'left' }}>
                                    현장 사진 첨부 <span style={{ color: '#ef4444' }}>*</span>
                                </label>

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
                                        padding: '20px',
                                        backgroundColor: '#f8fafc',
                                        borderRadius: '16px',
                                        border: '2px dashed #cbd5e1',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        cursor: 'pointer',
                                        transition: 'all 0.3s',
                                        minHeight: '200px'
                                    }}
                                    onMouseOver={(e) => e.currentTarget.style.borderColor = '#7c3aed'}
                                    onMouseOut={(e) => e.currentTarget.style.borderColor = '#cbd5e1'}
                                >
                                    {previewUrl ? (
                                        <div style={{ position: 'relative', width: '100%', height: '300px' }}>
                                            <img
                                                src={previewUrl}
                                                alt="Preview"
                                                style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: '8px' }}
                                            />
                                            {isAnalyzing && (
                                                <div style={{
                                                    position: 'absolute',
                                                    top: 0,
                                                    left: 0,
                                                    width: '100%',
                                                    height: '100%',
                                                    backgroundColor: 'rgba(255,255,255,0.8)',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    borderRadius: '8px',
                                                    color: '#7c3aed',
                                                    fontWeight: '700'
                                                }}>
                                                    AI 분석 중... 🔄
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <>
                                            <div style={{ fontSize: '3rem', marginBottom: '16px' }}>📸</div>
                                            <div style={{ fontSize: '1rem', color: '#64748b' }}>클릭하여 사진을 업로드하세요</div>
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* 내용 입력 (자동 채움) */}
                            <div style={{ marginBottom: '24px' }}>
                                <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>
                                    민원 내용 (자동 생성됨)
                                </label>
                                <textarea
                                    value={formData.content}
                                    onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                                    placeholder="사진을 업로드하면 AI가 분석 결과를 입력합니다"
                                    style={{
                                        width: '100%',
                                        height: '120px',
                                        padding: '14px 18px',
                                        border: '2px solid #e2e8f0',
                                        borderRadius: '12px',
                                        fontSize: '1rem',
                                        outline: 'none',
                                        resize: 'none',
                                        boxSizing: 'border-box'
                                    }}
                                    onFocus={(e) => e.target.style.borderColor = '#7c3aed'}
                                    onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                                />
                            </div>

                            {/* 위치 선택 */}
                            <div style={{ marginBottom: '24px' }}>
                                <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>
                                    발생 위치
                                    <span style={{ fontWeight: '400', color: '#94a3b8', marginLeft: '8px' }}>지도를 클릭하여 선택</span>
                                </label>
                                <div style={{
                                    padding: '10px 14px',
                                    backgroundColor: '#f0fdf4',
                                    borderRadius: '8px',
                                    marginBottom: '12px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px'
                                }}>
                                    <span style={{ fontSize: '1.1rem' }}>📍</span>
                                    <span style={{ color: '#16a34a', fontWeight: '500' }}>{formData.location.address}</span>
                                </div>
                                <div
                                    ref={mapRef}
                                    style={{
                                        width: '100%',
                                        height: '220px',
                                        backgroundColor: '#f1f5f9',
                                        borderRadius: '12px',
                                        overflow: 'hidden',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: '#94a3b8',
                                        border: '2px dashed #e2e8f0'
                                    }}
                                >
                                    {!import.meta.env.VITE_KAKAO_MAP_KEY && '🗺️ 카카오 맵 API 키가 필요합니다'}
                                </div>
                            </div>

                            {/* 공개 여부 */}
                            <div style={{ marginBottom: '30px' }}>
                                <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '600', color: '#374151', marginBottom: '12px' }}>
                                    공개 여부
                                </label>
                                <div style={{ display: 'flex', gap: '16px' }}>
                                    {[{ value: true, label: '🌐 공개', desc: '다른 시민들도 볼 수 있음' }, { value: false, label: '🔒 비공개', desc: '나와 담당자만 확인 가능' }].map(opt => (
                                        <label key={String(opt.value)} style={{
                                            flex: 1,
                                            padding: '16px',
                                            borderRadius: '12px',
                                            border: formData.isPublic === opt.value ? '2px solid #7c3aed' : '2px solid #e2e8f0',
                                            backgroundColor: formData.isPublic === opt.value ? '#faf5ff' : 'white',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s'
                                        }}>
                                            <input
                                                type="radio"
                                                checked={formData.isPublic === opt.value}
                                                onChange={() => setFormData(prev => ({ ...prev, isPublic: opt.value }))}
                                                style={{ display: 'none' }}
                                            />
                                            <div style={{ fontWeight: '600', color: '#1e293b', marginBottom: '4px' }}>{opt.label}</div>
                                            <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{opt.desc}</div>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {/* 제출 버튼 */}
                            <button
                                type="submit"
                                disabled={loading}
                                style={{
                                    width: '100%',
                                    padding: '18px',
                                    background: loading ? '#94a3b8' : 'linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '14px',
                                    fontSize: '1.1rem',
                                    fontWeight: '700',
                                    cursor: loading ? 'not-allowed' : 'pointer',
                                    boxShadow: '0 4px 14px rgba(124, 58, 237, 0.4)',
                                    transition: 'all 0.3s'
                                }}
                            >
                                {loading ? '접수 중...' : '🚀 민원 접수하기'}
                            </button>
                        </form>
                    </div>

                    {/* 오른쪽 - AI 분석 */}
                    <div style={{
                        backgroundColor: 'white',
                        borderRadius: '20px',
                        boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                        overflow: 'hidden',
                        height: 'fit-content',
                        position: 'sticky',
                        top: '100px'
                    }}>
                        <div style={{
                            background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                            padding: '20px',
                            color: 'white',
                            textAlign: 'center'
                        }}>
                            <div style={{ fontSize: '2rem', marginBottom: '8px' }}>🤖</div>
                            <h3 style={{ fontSize: '1.1rem', fontWeight: '700', margin: 0 }}>AI 이미지 분석</h3>
                        </div>
                        <div style={{ padding: '24px' }}>
                            <div style={{
                                padding: '18px',
                                backgroundColor: '#f5f3ff',
                                borderRadius: '12px',
                                marginBottom: '16px'
                            }}>
                                <div style={{ fontSize: '0.8rem', color: '#7c3aed', fontWeight: '600', marginBottom: '8px' }}>
                                    📊 이미지 분석 결과
                                </div>
                                <div style={{ fontSize: '1.1rem', fontWeight: '700', color: '#1e293b', textAlign: 'center' }}>
                                    {aiResult.type}
                                </div>
                            </div>
                            <div style={{
                                padding: '18px',
                                backgroundColor: '#fdf4ff',
                                borderRadius: '12px'
                            }}>
                                <div style={{ fontSize: '0.8rem', color: '#a855f7', fontWeight: '600', marginBottom: '8px' }}>
                                    🏛️ 처리 기관 분류
                                </div>
                                <div style={{ fontSize: '1.1rem', fontWeight: '700', color: '#1e293b', textAlign: 'center' }}>
                                    {aiResult.agency}
                                </div>
                            </div>
                            <div style={{
                                marginTop: '20px',
                                padding: '14px',
                                backgroundColor: '#f0fdf4',
                                borderRadius: '12px',
                                textAlign: 'center'
                            }}>
                                <span style={{ fontSize: '0.85rem', color: '#16a34a' }}>✨ 사진에서 자동으로 정보를 추출합니다</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default ApplyImage;

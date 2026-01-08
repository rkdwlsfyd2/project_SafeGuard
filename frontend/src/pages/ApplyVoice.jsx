import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { complaintsAPI, sttAPI, getToken, analyzeText } from '../utils/api';

function ApplyVoice() {
    const navigate = useNavigate();
    const mapRef = useRef(null);

    const [formData, setFormData] = useState({
        title: '',
        content: '',
        isPublic: true,
        location: {
            lat: 37.5665,
            lng: 126.9780,
            address: '서울특별시 중구'
        }
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [currentStep, setCurrentStep] = useState(1);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [ragResult, setRagResult] = useState(null);

    // Voice Recording State
    const [isRecording, setIsRecording] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const mediaRecorderRef = useRef(null);
    const chunksRef = useRef([]);

    useEffect(() => {
        let interval;
        if (isRecording) {
            interval = setInterval(() => {
                setRecordingTime(prev => prev + 1);
            }, 1000);
        } else {
            clearInterval(interval);
        }
        return () => clearInterval(interval);
    }, [isRecording]);

    const handleToggleRecord = async () => {
        if (isRecording) {
            // STOP RECORDING
            mediaRecorderRef.current.stop();
            setIsRecording(false);
        } else {
            // START RECORDING
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                const mediaRecorder = new MediaRecorder(stream);
                mediaRecorderRef.current = mediaRecorder;
                chunksRef.current = [];

                mediaRecorder.ondataavailable = (e) => {
                    if (e.data.size > 0) chunksRef.current.push(e.data);
                };

                mediaRecorder.onstop = async () => {
                    const audioBlob = new Blob(chunksRef.current, { type: 'audio/wav' });
                    setLoading(true);
                    setError('');
                    try {
                        const result = await sttAPI.transcribe(audioBlob);
                        if (result && result.stt_text) {
                            setFormData(prev => ({ ...prev, content: result.stt_text }));
                        }
                    } catch (err) {
                        setError('음성 인식에 실패했습니다: ' + err.message);
                    } finally {
                        setLoading(false);
                    }
                    // Stop all tracks
                    stream.getTracks().forEach(track => track.stop());
                };

                mediaRecorder.start();
                setIsRecording(true);
                setRecordingTime(0);
            } catch (err) {
                console.error("Recording error:", err);
                setError("마이크 접근 권한이 필요합니다.");
            }
        }
    };

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

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
            return () => document.head.removeChild(script);
        }
    }, []);

    // 단계 업데이트
    useEffect(() => {
        if (formData.title) setCurrentStep(2);
        if (formData.title && formData.content) setCurrentStep(3);
        if (formData.title && formData.content && formData.location.address) setCurrentStep(4);
    }, [formData]);

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setLoading(true);
        setError('');
        try {
            const result = await sttAPI.transcribe(file);
            if (result && result.sttText) {
                setFormData(prev => ({ ...prev, content: result.sttText }));
            }
        } catch (err) {
            setError('음성 파일 인식에 실패했습니다: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleAnalyze = async () => {
        if (!formData.content) return;
        setIsAnalyzing(true);
        try {
            // content가 URL일 수도 있고 텍스트일 수도 있으나 여기서는 STT 결과를 사용
            const result = await analyzeText(formData.content);
            setRagResult(result);
        } catch (err) {
            setError('AI 분석 중 오류가 발생했습니다: ' + err.message);
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!getToken()) {
            alert('로그인이 필요합니다.');
            navigate('/login');
            return;
        }
        if (!formData.title || !formData.content) {
            setError('제목과 내용을 입력해주세요 (음성 인식을 완료해주세요).');
            return;
        }
        setLoading(true);
        setError('');
        try {
            // Voice complaint is treated as text complaint for now, but category/content could indicate source
            const result = await complaintsAPI.create({
                category: '음성',
                title: formData.title,
                content: formData.content, // Transcription result
                isPublic: formData.isPublic,
                location: formData.location
            });
            alert(`음성 민원이 접수되었습니다. (접수번호: ${result.complaintNo})`);
            navigate('/list');
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const steps = [
        { num: 1, label: '제목 입력', done: !!formData.title },
        { num: 2, label: '음성 녹음/입력', done: !!formData.content },
        { num: 3, label: '위치 선택', done: true },
        { num: 4, label: '접수 완료', done: false }
    ];

    return (
        <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', padding: '40px 20px' }}>
            <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
                {/* 페이지 헤더 */}
                <div style={{ textAlign: 'center', marginBottom: '40px' }}>
                    <h1 style={{ fontSize: '2.5rem', fontWeight: '800', color: '#1e293b', marginBottom: '10px' }}>
                        🎙️ 음성 민원 신청
                    </h1>
                    <p style={{ color: '#64748b', fontSize: '1.1rem' }}>목소리로 쉽고 빠르게 민원을 신청하세요</p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr 340px', gap: '24px' }}>
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
                            <h2 style={{ fontSize: '1.3rem', fontWeight: '700', margin: 0 }}>음성 민원 신청서</h2>
                            <p style={{ fontSize: '0.9rem', opacity: 0.9, marginTop: '6px' }}>음성으로 민원을 작성할 수 있습니다</p>
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

                            {/* 음성 녹음 섹션 */}
                            <div style={{ marginBottom: '30px', textAlign: 'center' }}>
                                <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '600', color: '#374151', marginBottom: '16px', textAlign: 'left' }}>
                                    음성 녹음 <span style={{ color: '#ef4444' }}>*</span>
                                </label>

                                <div style={{
                                    padding: '40px',
                                    backgroundColor: isRecording ? '#faf5ff' : '#f8fafc',
                                    borderRadius: '16px',
                                    border: isRecording ? '2px solid #7c3aed' : '2px dashed #cbd5e1',
                                    transition: 'all 0.3s'
                                }}>
                                    <div
                                        onClick={handleToggleRecord}
                                        style={{
                                            width: '80px',
                                            height: '80px',
                                            borderRadius: '50%',
                                            backgroundColor: isRecording ? '#ef4444' : '#7c3aed',
                                            margin: '0 auto 12px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            cursor: 'pointer',
                                            boxShadow: isRecording ? '0 0 0 10px rgba(239, 68, 68, 0.2)' : '0 4px 12px rgba(124, 58, 237, 0.3)',
                                            transition: 'all 0.3s'
                                        }}
                                    >
                                        <span style={{ fontSize: '2rem' }}>{isRecording ? '⏹' : '🎤'}</span>
                                    </div>
                                    <div style={{ fontSize: '1.2rem', fontWeight: '700', color: isRecording ? '#ef4444' : '#1e293b', marginBottom: '12px' }}>
                                        {isRecording ? formatTime(recordingTime) : '녹음 시작'}
                                    </div>



                                    <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                                        {isRecording ? '말씀을 하신 후 정지 버튼을 눌러주세요' : '버튼을 눌러 음성 인식을 하세요'}
                                    </div>
                                </div>
                            </div>

                            {/* 인식된 텍스트 */}
                            <div style={{ marginBottom: '24px' }}>
                                <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>
                                    음성인식 내용 (수정 가능)
                                </label>
                                <textarea
                                    value={formData.content}
                                    onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                                    placeholder="음성 인식 결과가 여기에 표시됩니다. 직접 입력도 가능합니다."
                                    style={{
                                        width: '100%',
                                        height: '140px',
                                        padding: '14px 18px',
                                        border: '2px solid #e2e8f0',
                                        borderRadius: '12px',
                                        fontSize: '1rem',
                                        outline: 'none',
                                        resize: 'none',
                                        boxSizing: 'border-box',
                                        transition: 'border-color 0.2s'
                                    }}
                                    onFocus={(e) => e.target.style.borderColor = '#7c3aed'}
                                    onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                                />

                                {/* AI 분석 버튼 */}
                                <div style={{ textAlign: 'right', marginTop: '12px' }}>
                                    <button
                                        type="button"
                                        onClick={handleAnalyze}
                                        disabled={isAnalyzing || !formData.content}
                                        style={{
                                            padding: '10px 24px',
                                            backgroundColor: '#7c3aed',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '10px',
                                            fontSize: '0.95rem',
                                            fontWeight: '700',
                                            cursor: (isAnalyzing || !formData.content) ? 'not-allowed' : 'pointer',
                                            opacity: (isAnalyzing || !formData.content) ? 0.7 : 1,
                                            boxShadow: '0 2px 8px rgba(124, 58, 237, 0.3)'
                                        }}
                                    >
                                        {isAnalyzing ? '분석 중...' : '🤖 AI 분석 (RAG)'}
                                    </button>
                                </div>
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
                            padding: '24px',
                            color: 'white',
                            textAlign: 'center'
                        }}>
                            <div style={{ fontSize: '2.5rem', marginBottom: '8px' }}>🤖</div>
                            <h3 style={{ fontSize: '1.2rem', fontWeight: '700', margin: 0 }}>AI 음성 분석</h3>
                        </div>
                        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            {/* 민원 유형 분석 */}
                            <div style={{
                                padding: '18px',
                                backgroundColor: '#f5f3ff',
                                borderRadius: '12px'
                            }}>
                                <div style={{ fontSize: '0.85rem', color: '#7c3aed', fontWeight: '700', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    📊 민원 유형 분석
                                </div>
                                <div style={{ fontSize: '1.1rem', fontWeight: '800', color: '#1e293b', textAlign: 'center' }}>
                                    {ragResult ? ragResult.category : '분석 대기'}
                                </div>
                            </div>

                            {/* 처리 기관 */}
                            <div style={{
                                padding: '18px',
                                backgroundColor: '#fdf4ff',
                                borderRadius: '12px'
                            }}>
                                <div style={{ fontSize: '0.85rem', color: '#a855f7', fontWeight: '700', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    🏛️ 처리 기관
                                </div>
                                <div style={{ fontSize: '1.1rem', fontWeight: '800', color: '#1e293b', textAlign: 'center' }}>
                                    {ragResult ? ragResult.agency_name : '-'}
                                </div>
                            </div>

                            {/* RAG 판단 출력 */}
                            <div style={{
                                padding: '18px',
                                backgroundColor: '#eff6ff',
                                borderRadius: '12px'
                            }}>
                                <div style={{ fontSize: '0.85rem', color: '#3b82f6', fontWeight: '700', marginBottom: '8px' }}>
                                    🔍 RAG 판단 근거
                                </div>
                                <div style={{ fontSize: '0.9rem', color: '#475569', lineHeight: '1.5', minHeight: '60px' }}>
                                    {ragResult ? ragResult.reasoning : '분석 결과가 여기에 표시됩니다.'}
                                </div>
                            </div>

                            <div style={{
                                padding: '12px',
                                backgroundColor: '#f0fdf4',
                                borderRadius: '12px',
                                textAlign: 'center'
                            }}>
                                <span style={{ fontSize: '0.8rem', color: '#16a34a', fontWeight: '500' }}>✨ 음성을 텍스트로 자동 변환합니다</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default ApplyVoice;

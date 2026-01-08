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

    // 🎤 Recording state
    const [isRecording, setIsRecording] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const mediaRecorderRef = useRef(null);
    const chunksRef = useRef([]);
    const recognitionRef = useRef(null);

    /** ⏱️ 녹음 타이머 */
    useEffect(() => {
        let timer;
        if (isRecording) {
            timer = setInterval(() => {
                setRecordingTime(prev => prev + 1);
            }, 1000);
        }
        return () => clearInterval(timer);
    }, [isRecording]);

    /** 🗣️ 브라우저 실시간 음성 인식 (미리보기용) */
    useEffect(() => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) return;

        const recognition = new SpeechRecognition();
        recognition.lang = 'ko-KR';
        recognition.continuous = true;
        recognition.interimResults = true;

        recognition.onresult = (event) => {
            let transcript = '';
            for (let i = event.resultIndex; i < event.results.length; i++) {
                transcript += event.results[i][0].transcript;
            }

            if (transcript) {
                setFormData(prev => ({ ...prev, content: transcript }));
            }
        };

        recognitionRef.current = recognition;
    }, []);

    /** 🎤 녹음 시작 / 종료 */
    const handleToggleRecord = async () => {
        if (isRecording) {
            // ⛔ STOP
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            return;
        }

        // ▶ START
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

            const mediaRecorder = new MediaRecorder(stream, {
                mimeType: 'audio/webm'   // ⭐ 중요
            });

            mediaRecorderRef.current = mediaRecorder;
            chunksRef.current = [];

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) chunksRef.current.push(e.data);
            };

            mediaRecorder.onstop = async () => {
                // 🛑 SpeechRecognition 완전 종료 (덮어쓰기 방지)
                if (recognitionRef.current) {
                    recognitionRef.current.onresult = null;
                    recognitionRef.current.stop();
                }

                const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });

                setLoading(true);
                setError('');

                try {
                    const result = await sttAPI.transcribe(audioBlob);
                    if (result?.stt_text) {
                        setFormData(prev => ({
                            ...prev,
                            content: result.stt_text
                        }));
                    }
                } catch (err) {
                    setError('음성 인식에 실패했습니다: ' + err.message);
                } finally {
                    setLoading(false);
                    stream.getTracks().forEach(t => t.stop());
                }
            };

            setFormData(prev => ({ ...prev, content: '' }));
            mediaRecorder.start();
            recognitionRef.current?.start();

            setRecordingTime(0);
            setIsRecording(true);

        } catch (err) {
            console.error(err);
            setError('마이크 접근 권한이 필요합니다.');
        }
    };

    /** ⏱️ 시간 표시 */
    const formatTime = (sec) => {
        const m = Math.floor(sec / 60);
        const s = sec % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    /** 단계 표시 */
    useEffect(() => {
        if (formData.title) setCurrentStep(2);
        if (formData.title && formData.content) setCurrentStep(3);
        if (formData.title && formData.content && formData.location.address) setCurrentStep(4);
    }, [formData]);

    /** 🤖 RAG 분석 */
    const handleAnalyze = async () => {
        if (!formData.content) return;
        setIsAnalyzing(true);
        try {
            const result = await analyzeText(formData.content);
            setRagResult(result);
        } catch (err) {
            setError('AI 분석 실패: ' + err.message);
        } finally {
            setIsAnalyzing(false);
        }
    };

    /** 🚀 민원 제출 */
    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!getToken()) {
            alert('로그인이 필요합니다.');
            navigate('/login');
            return;
        }

        if (!formData.title || !formData.content) {
            setError('제목과 음성 인식을 완료해주세요.');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const res = await complaintsAPI.create({
                category: '음성',
                title: formData.title,
                content: formData.content,
                isPublic: formData.isPublic,
                location: formData.location
            });

            alert(`음성 민원이 접수되었습니다. (접수번호: ${res.complaintNo})`);
            navigate('/list');
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ padding: '40px' }}>
            <h1>🎙️ 음성 민원 신청</h1>

            {error && <div style={{ color: 'red' }}>{error}</div>}

            <input
                placeholder="민원 제목"
                value={formData.title}
                onChange={e => setFormData(p => ({ ...p, title: e.target.value }))}
            />

            <div style={{ margin: '20px 0' }}>
                <button onClick={handleToggleRecord}>
                    {isRecording ? `⏹ ${formatTime(recordingTime)}` : '🎤 녹음 시작'}
                </button>
            </div>

            <textarea
                rows={6}
                value={formData.content}
                onChange={e => setFormData(p => ({ ...p, content: e.target.value }))}
                placeholder="음성 인식 결과"
            />

            <div style={{ marginTop: 10 }}>
                <button type="button" onClick={handleAnalyze} disabled={isAnalyzing}>
                    {isAnalyzing ? '분석 중...' : '🤖 AI 분석'}
                </button>
            </div>

            <button onClick={handleSubmit} disabled={loading}>
                {loading ? '접수 중...' : '🚀 민원 접수'}
            </button>
        </div>
    );
}
export default ApplyVoice
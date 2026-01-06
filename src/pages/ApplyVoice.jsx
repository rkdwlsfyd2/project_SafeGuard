import React from 'react';


function ApplyVoice() {
    const sidebarItemStyle = { marginBottom: '25px', display: 'flex', alignItems: 'center', gap: '10px', color: '#555', fontSize: '0.9rem' };

    const [isRecording, setIsRecording] = React.useState(false);
    const [mediaRecorder, setMediaRecorder] = React.useState(null);
    const [analysisResult, setAnalysisResult] = React.useState(null);
    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState(null);
    const [realtimeText, setRealtimeText] = React.useState("");
    const [attachedFile, setAttachedFile] = React.useState(null);
    const [videoPreviewUrl, setVideoPreviewUrl] = React.useState(null);
    const recognitionRef = React.useRef(null);
    const fileInputRef = React.useRef(null);
    const chunksRef = React.useRef([]);

    // Ref for realtime text to avoid stale closure in onstop
    const realtimeTextRef = React.useRef("");

    React.useEffect(() => {
        realtimeTextRef.current = realtimeText;
    }, [realtimeText]);

    const handleFileUpload = (event) => {
        const file = event.target.files[0];
        if (!file) return;

        setAttachedFile(file);
        // Create a preview URL for the file
        const url = URL.createObjectURL(file);
        setVideoPreviewUrl(url);

        // Clear existing states
        setRealtimeText("");
        setAnalysisResult(null);

        // Reset file input
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const startRecording = async () => {
        // ... (existing code)
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            console.error("getUserMedia not supported");
            setError("이 브라우저는 음성 녹음을 지원하지 않습니다. (HTTPS 또는 localhost 환경인지 확인하세요)");
            return;
        }

        // Reset real-time text and previous video attachment
        setRealtimeText("");
        setVideoPreviewUrl(null);
        setAttachedFile(null);

        try {
            console.log("Requesting microphone access...");
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            console.log("Microphone access granted");

            // --- Web Speech API (Real-time Transcription) Setup ---
            if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
                const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
                const recognition = new SpeechRecognition();
                recognition.lang = 'ko-KR'; // Korean
                recognition.continuous = true;
                recognition.interimResults = true;

                recognition.onresult = (event) => {
                    let interimTranscript = '';
                    let finalTranscript = '';

                    for (let i = event.resultIndex; i < event.results.length; ++i) {
                        if (event.results[i].isFinal) {
                            finalTranscript += event.results[i][0].transcript;
                        } else {
                            interimTranscript += event.results[i][0].transcript;
                        }
                    }
                    // Currently appending interim to whatever was there, or just showing latest fallback
                    // A simple strategy is to just show recognized text.
                    // For continuous updates, we might want to maintain a "finalized" part and "interim" part.
                    // But here, let's just update with what we have.
                    // Actually, event.results accumulates in continuous mode usually.

                    let fullText = "";
                    for (let i = 0; i < event.results.length; i++) {
                        fullText += event.results[i][0].transcript;
                    }
                    setRealtimeText(fullText);
                };

                recognition.onerror = (event) => {
                    console.error("Speech recognition error", event.error);
                };

                recognition.start();
                recognitionRef.current = recognition;
            } else {
                console.warn("Web Speech API not supported in this browser.");
            }
            // -----------------------------------------------------

            const recorder = new MediaRecorder(stream);

            recorder.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    chunksRef.current.push(e.data);
                }
            };

            recorder.onstop = async () => {
                alert("DEBUG: 녹음 종료 이벤트 발생 (onstop)"); // Debug Alert 3
                console.log("Recording stopped, processing chunks...");
                const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
                chunksRef.current = [];
                console.log("Blob created, size:", blob.size);

                // Upload to backend
                const formData = new FormData();
                formData.append('file', blob, 'recording.webm');
                formData.append('text', realtimeTextRef.current); // Use Ref to get latest text

                setLoading(true);
                setError(null);

                try {
                    alert("DEBUG: 서버로 업로드 시작"); // Debug Alert 4
                    console.log("Uploading to backend...");
                    // Use relative path via Nginx proxy (/api/stt/ -> localhost:8000/)
                    const response = await fetch('/api/stt/upload_voice', {
                        method: 'POST',
                        body: formData,
                    });

                    if (!response.ok) {
                        const errorText = await response.text();
                        console.error("Server error response:", errorText);
                        alert(`서버 전송 실패: ${response.status}`);
                        throw new Error(`Server error: ${response.status} - ${errorText}`);
                    }

                    const data = await response.json();
                    console.log("Analysis result:", data);
                    alert(`서버 분석 완료! Agency: ${data.agency}`);
                    setAnalysisResult(data);
                } catch (err) {
                    console.error("Upload failed", err);
                    if (err.message.includes("음성인식을 다시해주세요")) {
                        setError("음소거가 감지되었습니다. 음성인식을 다시해주세요.");
                        alert("음성인식을 다시해주세요.");
                    } else {
                        setError(`분석 중 오류가 발생했습니다: ${err.message}`);
                        alert(`오류 발생: ${err.message}`);
                    }
                } finally {
                    setLoading(false);
                }
            };

            recorder.start();
            alert("DEBUG: 녹음 시작됨 (recorder.start)"); // Debug Alert 1
            console.log("Recorder started", recorder.state);
            setMediaRecorder(recorder);
            setIsRecording(true);
            setAnalysisResult(null); // Clear previous result
        } catch (err) {
            console.error("Error accessing microphone", err);
            setError(`마이크 접근 실패: ${err.message}. 권한을 허용했는지 확인하세요.`);
            alert(`마이크 에러: ${err.message}`);
        }
    };

    const stopRecording = () => {
        alert("DEBUG: 정지 버튼 클릭됨"); // Debug Alert 2
        if (mediaRecorder && mediaRecorder.state !== 'inactive') {
            mediaRecorder.stop();
            setIsRecording(false);
            mediaRecorder.stream.getTracks().forEach(track => track.stop()); // Stop stream
        } else {
            alert("DEBUG: mediaRecorder가 없거나 이미 정지 상태임");
        }

        // Stop Speech Recognition
        if (recognitionRef.current) {
            recognitionRef.current.stop();
            recognitionRef.current = null;
        }
    };

    const toggleRecording = () => {
        if (isRecording) {
            stopRecording();
        } else {
            startRecording();
        }
    };

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
                        <input
                            type="text"
                            placeholder={analysisResult ? analysisResult.title : ""}
                            value={analysisResult ? analysisResult.title : ""}
                            readOnly
                            style={{ width: '100%', padding: '12px', border: '1px solid #E0E0E0', borderRadius: '4px', marginBottom: '40px' }}
                        />

                        <style>
                            {`
                                @keyframes pulse {
                                    0% { box-shadow: 0 0 0 0 rgba(255, 75, 75, 0.7); }
                                    70% { box-shadow: 0 0 0 15px rgba(255, 75, 75, 0); }
                                    100% { box-shadow: 0 0 0 0 rgba(255, 75, 75, 0); }
                                }
                                @keyframes blink {
                                    50% { opacity: 0; }
                                }
                            `}
                        </style>

                        {/* File Preview (Image or Video) */}
                        {videoPreviewUrl && (
                            <div style={{ width: '100%', maxWidth: '500px', marginBottom: '25px', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 8px 30px rgba(0,0,0,0.1)', border: '1px solid #E0E0E0' }}>
                                {attachedFile && attachedFile.type.startsWith('video/') ? (
                                    <video
                                        src={videoPreviewUrl}
                                        controls
                                        style={{ width: '100%', display: 'block', backgroundColor: '#000' }}
                                    />
                                ) : (
                                    <img
                                        src={videoPreviewUrl}
                                        alt="Preview"
                                        style={{ width: '100%', display: 'block', objectFit: 'contain', maxHeight: '400px', backgroundColor: '#F9F9F9' }}
                                    />
                                )}
                                <div style={{ padding: '8px', backgroundColor: '#F3F4F6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: '0.8rem', color: '#6B7280' }}>
                                        {attachedFile && attachedFile.type.startsWith('video/') ? "동영상 첨부됨" : "이미지 첨부됨"}
                                    </span>
                                    <button
                                        onClick={() => { setVideoPreviewUrl(null); setAttachedFile(null); }}
                                        style={{ backgroundColor: '#EF4444', color: 'white', border: 'none', padding: '4px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem' }}
                                    >
                                        첨부 취소
                                    </button>
                                </div>
                            </div>
                        )}

                        <div
                            onClick={toggleRecording}
                            style={{
                                width: '120px',
                                height: '120px',
                                borderRadius: '50%',
                                border: `4px solid ${isRecording ? '#FF4B4B' : 'var(--primary-color)'}`,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                marginBottom: '20px',
                                cursor: 'pointer',
                                transition: 'all 0.3s ease',
                                transform: isRecording ? 'scale(1.1)' : 'scale(1)',
                                animation: isRecording ? 'pulse 1.5s infinite' : 'none'
                            }}
                        >
                            <svg width="60" height="60" viewBox="0 0 24 24" fill={isRecording ? '#FF4B4B' : 'var(--primary-color)'}>
                                <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
                                <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
                            </svg>
                        </div>

                        {/* File Upload Button (Image, MP4, MOV supported) */}
                        <input
                            type="file"
                            accept="image/*,video/mp4,video/quicktime,.mov"
                            style={{ display: 'none' }}
                            ref={fileInputRef}
                            onChange={handleFileUpload}
                        />
                        <button
                            onClick={() => fileInputRef.current.click()}
                            disabled={isRecording || loading}
                            style={{
                                backgroundColor: '#6B7280',
                                color: 'white',
                                border: 'none',
                                padding: '8px 16px',
                                borderRadius: '4px',
                                cursor: (isRecording || loading) ? 'not-allowed' : 'pointer',
                                marginBottom: '20px',
                                fontSize: '0.9rem',
                                opacity: (isRecording || loading) ? 0.7 : 1
                            }}
                        >
                            파일 첨부
                        </button>

                        {isRecording && (
                            <div style={{ color: '#FF4B4B', fontWeight: 'bold', marginBottom: '10px', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div style={{ width: '10px', height: '10px', backgroundColor: '#FF4B4B', borderRadius: '50%', animation: 'blink 1s infinite' }}></div>
                                녹음 중... (클릭하여 중지)
                            </div>
                        )}

                        {loading && (
                            <div style={{ color: 'var(--primary-color)', fontWeight: 'bold', marginBottom: '10px' }}>
                                분석 중...
                            </div>
                        )}

                        {error && (
                            <div style={{ color: 'red', marginBottom: '10px' }}>
                                {error}
                            </div>
                        )}

                        <div style={{ width: '100%', backgroundColor: '#EEE', height: '30px', borderRadius: '15px', position: 'relative', overflow: 'hidden', marginBottom: '10px' }}>
                            <div style={{ width: isRecording ? '100%' : '0%', height: '100%', backgroundColor: '#FF4B4B', transition: 'width 1s linear' }}></div>
                            <div style={{ position: 'absolute', top: '0', left: '10px', height: '100%', display: 'flex', alignItems: 'center', color: 'white', fontSize: '0.8rem' }}>
                                {isRecording ? "Recording..." : "Ready"}
                            </div>
                        </div>

                        {/* Real-time Transcription Display */}
                        <div style={{ width: '100%', marginBottom: '20px' }}>
                            <div style={{ fontSize: '0.85rem', color: '#555', marginBottom: '5px' }}>실시간 음성 인식 내용</div>
                            <textarea
                                value={realtimeText}
                                readOnly
                                placeholder="마이크 버튼을 누르고 말씀하시면 여기에 실시간으로 표시됩니다..."
                                style={{
                                    width: '100%',
                                    minHeight: '80px',
                                    padding: '10px',
                                    border: '1px solid #E0E0E0',
                                    borderRadius: '4px',
                                    resize: 'vertical',
                                    backgroundColor: '#FAFAFA',
                                    color: '#333'
                                }}
                            />
                        </div>

                        <div style={{ width: '100%', marginBottom: '20px', marginTop: '30px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                                <span style={{ fontWeight: 'bold' }}>발생 위치</span>
                                <button style={{ backgroundColor: 'var(--primary-color)', color: 'white', border: 'none', padding: '5px 15px', borderRadius: '4px', cursor: 'pointer' }}>위치 찾기</button>
                            </div>
                            <div style={{ width: '100%', height: '180px', backgroundColor: '#EEE', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                                {/* Display location if available, otherwise placeholder */}
                                {analysisResult && analysisResult.location && analysisResult.location !== "위치 정보 없음" ? (
                                    <div style={{ padding: '20px', textAlign: 'center' }}>
                                        {analysisResult.location}
                                    </div>
                                ) : (
                                    <img src="https://via.placeholder.com/600x200?text=Map+Placeholder" alt="Map" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                )}
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
                            <div style={{ fontWeight: 'bold', textAlign: 'center' }}>
                                유형: <span style={{ color: '#4F46E5' }}>{analysisResult ? analysisResult.category : "-"}</span>
                            </div>
                        </div>
                        <div style={{ padding: '15px', backgroundColor: '#EEF2FF', borderRadius: '8px', marginBottom: '15px' }}>
                            <div style={{ fontSize: '0.8rem', color: '#6366F1', marginBottom: '5px' }}>처리 기관 AI 분류 결과</div>
                            <div style={{ fontWeight: 'bold', textAlign: 'center' }}>
                                처리기관: <span style={{ color: '#4F46E5' }}>{analysisResult ? analysisResult.agency : "-"}</span>
                            </div>
                        </div>
                        <div style={{ padding: '15px', backgroundColor: '#EEF2FF', borderRadius: '8px' }}>
                            <div style={{ fontSize: '0.8rem', color: '#6366F1', marginBottom: '5px' }}>음성 인식 결과</div>
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: '0.85rem', color: '#312E81', marginBottom: '5px' }}>민원 내용</div>
                                <div style={{ fontSize: '0.8rem' }}>
                                    {analysisResult ? analysisResult.original_text : "-"}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default ApplyVoice;

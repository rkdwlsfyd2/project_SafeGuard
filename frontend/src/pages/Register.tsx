import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authAPI } from '../utils/api';
import Modal from '../components/common/Modal';

// 기관 데이터
const LOCAL_AGENCIES = [
    { id: 1, name: '서울특별시' },
    { id: 2, name: '부산광역시' },
    { id: 3, name: '대구광역시' },
    { id: 4, name: '인천광역시' },
    { id: 5, name: '광주광역시' },
    { id: 6, name: '대전광역시' },
    { id: 7, name: '울산광역시' },
    { id: 8, name: '세종특별자치시' },
    { id: 9, name: '경기도' },
    { id: 10, name: '강원특별자치도' },
    { id: 11, name: '충청북도' },
    { id: 12, name: '충청남도' },
    { id: 13, name: '전북특별자치도' },
    { id: 14, name: '전라남도' },
    { id: 15, name: '경상북도' },
    { id: 16, name: '경상남도' },
    { id: 17, name: '제주특별자치도' },
];

const CENTRAL_AGENCIES = [
    { id: 18, name: '경찰청' },
    { id: 19, name: '국토교통부' },
    { id: 20, name: '고용노동부' },
    { id: 21, name: '국방부' },
    { id: 22, name: '국민권익위원회' },
    { id: 23, name: '식품의약품안전처' },
    { id: 24, name: '대검찰청' },
    { id: 25, name: '기획재정부' },
    { id: 26, name: '행정안전부' },
    { id: 27, name: '보건복지부' },
    { id: 28, name: '과학기술정보통신부' },
    { id: 29, name: '국세청' },
    { id: 30, name: '기후에너지환경부' },
    { id: 31, name: '법무부' },
    { id: 32, name: '공정거래위원회' },
    { id: 33, name: '교육부' },
    { id: 34, name: '해양수산부' },
    { id: 35, name: '농림축산식품부' },
    { id: 36, name: '소방청' },
    { id: 37, name: '인사혁신처' },
    { id: 38, name: '기타' },
];

function Register() {
    const navigate = useNavigate();

    // 회원 유형 상태: 'INDIVIDUAL' (개인) | 'AGENCY_CENTRAL' (중앙행정) | 'AGENCY_LOCAL' (지자체)
    const [userType, setUserType] = useState('INDIVIDUAL');

    const [formData, setFormData] = useState({
        userId: '',
        password: '',
        passwordConfirm: '',
        name: '',
        birthDate: '',
        addr: '',
        phone: '',
        agencyNo: '' // 기관 회원일 경우 설정됨
    });
    const [loading, setLoading] = useState(false);
    const [isIdChecked, setIsIdChecked] = useState(false); // 아이디 중복 확인 상태

    // 인증 모달 상태
    const [authModalOpen, setAuthModalOpen] = useState(false);
    const [pendingUserType, setPendingUserType] = useState('INDIVIDUAL');
    const [adminKeyInput, setAdminKeyInput] = useState('');

    // 모달 상태 관리
    const [modalConfig, setModalConfig] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        callback?: () => void;
    }>({
        isOpen: false,
        title: '',
        message: '',
        callback: undefined
    });

    const showAlert = (title: string, message: string, callback?: () => void) => {
        setModalConfig({
            isOpen: true,
            title,
            message,
            callback
        });
    };

    const closeModal = () => {
        setModalConfig(prev => ({ ...prev, isOpen: false }));
        if (modalConfig.callback) {
            modalConfig.callback();
        }
    };

    // Daum 우편번호 스크립트 로드
    useEffect(() => {
        // Daum Postcode
        const postcodeScript = document.createElement('script');
        postcodeScript.src = '//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js';
        postcodeScript.async = true;
        document.head.appendChild(postcodeScript);

        return () => {
            if (document.head.contains(postcodeScript)) {
                document.head.removeChild(postcodeScript);
            }
        };
    }, []);

    const handleSearchAddress = () => {
        if (!window.daum || !window.daum.Postcode) {
            showAlert('알림', '주소 검색 서비스를 불러오는 중입니다. 잠시 후 다시 시도해주세요.');
            return;
        }

        new window.daum.Postcode({
            oncomplete: function (data: any) {
                const addr = data.roadAddress || data.jibunAddress;
                setFormData(prev => ({
                    ...prev,
                    addr: addr
                }));
            }
        }).open();
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));

        // 아이디 변경 시 중복 확인 상태 초기화
        if (name === 'userId') {
            setIsIdChecked(false);
        }
    };

    const handleUserTypeChange = (e) => {
        const type = e.target.value;
        if (type === 'INDIVIDUAL') {
            setUserType(type);
            setFormData(prev => ({ ...prev, agencyNo: '' }));
        } else {
            // 기관 선택 시 인증 모달 표시
            setPendingUserType(type);
            setAdminKeyInput('');
            setAuthModalOpen(true);
        }
    };

    const handleAuthSubmit = () => {
        if (adminKeyInput === 'admin1234') {
            setUserType(pendingUserType);
            setFormData(prev => ({ ...prev, agencyNo: '' }));
            setAuthModalOpen(false);
        } else {
            showAlert('인증 실패', '관리자 키가 일치하지 않습니다.');
            // 실패 시 선택을 개인으로 되돌리거나, 기존 선택 유지 (여기서는 기존 선택 유지하되 변경되지 않음)
        }
    };

    const closeAuthModal = () => {
        setAuthModalOpen(false);
        // 모달 닫으면 변경 사항 없음 (기존 userType 유지)
    };

    // 휴대전화 번호 자동 포맷팅
    const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value.replace(/[^0-9]/g, '');
        let formatted = '';

        if (value.length <= 3) {
            formatted = value;
        } else if (value.length <= 7) {
            formatted = `${value.slice(0, 3)}-${value.slice(3)}`;
        } else {
            formatted = `${value.slice(0, 3)}-${value.slice(3, 7)}-${value.slice(7, 11)}`;
        }

        setFormData(prev => ({ ...prev, phone: formatted }));
    };

    const handleIdCheck = async () => {
        if (!formData.userId) {
            showAlert('알림', '아이디를 입력해주세요.');
            return;
        }

        // 아이디 유효성 검사 (영문, 숫자만 허용)
        const idRegex = /^[a-zA-Z0-9]+$/;
        if (!idRegex.test(formData.userId)) {
            showAlert('알림', '아이디는 영문과 숫자만 사용 가능합니다.');
            return;
        }
        try {
            const response = await authAPI.checkIdDuplicate(formData.userId);
            if (response.isDuplicate) {
                showAlert('알림', '이미 사용 중인 아이디입니다.');
                setIsIdChecked(false);
            } else {
                setIsIdChecked(true);
            }
        } catch (error) {
            console.error(error);
            showAlert('오류', '중복 확인 중 오류가 발생했습니다.');
            setIsIdChecked(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!isIdChecked) {
            showAlert('알림', '아이디 중복 확인을 해주세요.');
            return;
        }

        if (formData.password !== formData.passwordConfirm) {
            showAlert('오류', '비밀번호가 일치하지 않습니다.');
            return;
        }

        // 비밀번호 유효성 검사 규칙
        const { password } = formData;
        if (password.length < 8) {
            showAlert('오류', '비밀번호는 8자 이상이어야 합니다.');
            return;
        }
        if (password.includes(' ')) {
            showAlert('오류', '비밀번호에 공백을 포함할 수 없습니다.');
            return;
        }
        const specialCharRegex = /[!@#$%^&*(),.?":{}|<>]/;
        if (!specialCharRegex.test(password)) {
            showAlert('오류', '비밀번호는 특수문자를 최소 1개 이상 포함해야 합니다.');
            return;
        }

        // 생년월일 유효성 검사
        const today = new Date();
        const selectedDate = new Date(formData.birthDate);
        if (selectedDate > today) {
            showAlert('오류', '생년월일은 미래 날짜일 수 없습니다.');
            return;
        }

        // 주소 유효성 검사 (필수)
        if (!formData.addr) {
            showAlert('오류', '주소를 입력해주세요.');
            return;
        }

        // 기관 선택 유효성 검사
        if ((userType === 'AGENCY_CENTRAL' || userType === 'AGENCY_LOCAL') && !formData.agencyNo) {
            showAlert('오류', '소속 기관을 선택해주세요.');
            return;
        }

        // 휴대전화 유효성 검사
        const phoneRegex = /^01(?:0|1|[6-9])-(?:\d{3}|\d{4})-\d{4}$/;
        if (!phoneRegex.test(formData.phone)) {
            showAlert('오류', '올바른 휴대전화 번호 형식이 아닙니다.\n(예: 010-1234-5678)');
            return;
        }

        setLoading(true);

        try {
            const { passwordConfirm, ...registerData } = formData;

            // 정리: 개인 회원인 경우 agencyNo가 null/undefined인지 확인
            if (userType === 'INDIVIDUAL') {
                delete (registerData as any).agencyNo;
            } else {
                // agencyNo를 숫자로 변환
                (registerData as any).agencyNo = Number(registerData.agencyNo);
            }

            console.log("Registering:", registerData); // 디버그 로그

            await authAPI.register(registerData);

            // 회원가입 성공 모달 -> 확인 클릭 시 로그인 페이지로 이동
            showAlert('회원가입 성공', '회원가입이 완료되었습니다. 로그인해주세요.', () => {
                showAlert('회원가입 성공', '회원가입이 완료되었습니다. 로그인해주세요.', () => {
                    navigate('/login', { state: { fromRegistration: true } });
                });
            });
        } catch (err: any) {
            console.error(err);
            showAlert('오류', err.message || '회원가입 중 오류가 발생했습니다.');
        } finally {
            setLoading(false);
        }
    };

    const inputStyle: React.CSSProperties = {
        width: '100%',
        padding: '14px 18px',
        border: '2px solid #e2e8f0',
        borderRadius: '12px',
        fontSize: '1rem',
        outline: 'none',
        transition: 'border-color 0.2s, box-shadow 0.2s',
        boxSizing: 'border-box'
    };

    const labelStyle = {
        display: 'block',
        fontSize: '0.9rem',
        fontWeight: '600',
        color: '#374151',
        marginBottom: '8px'
    };

    const radioLabelStyle: React.CSSProperties = {
        display: 'flex',
        alignItems: 'center',
        padding: '12px 16px',
        borderRadius: '10px',
        border: '2px solid #e2e8f0',
        cursor: 'pointer',
        fontWeight: '600',
        fontSize: '0.95rem',
        color: '#475569',
        transition: 'all 0.2s'
    };

    return (
        <div style={{
            minHeight: '100vh',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '40px 20px'
        }}>
            {/* 배경 장식 */}
            <div style={{
                position: 'absolute', top: '5%', left: '10%',
                width: '350px', height: '350px',
                borderRadius: '50%', background: 'rgba(255,255,255,0.1)', filter: 'blur(60px)'
            }}></div>
            <div style={{
                position: 'absolute', bottom: '10%', right: '15%',
                width: '300px', height: '300px',
                borderRadius: '50%', background: 'rgba(255,255,255,0.08)', filter: 'blur(80px)'
            }}></div>

            <div style={{
                width: '100%',
                maxWidth: '580px',
                backgroundColor: 'white',
                borderRadius: '24px',
                boxShadow: '0 25px 50px rgba(0,0,0,0.25)',
                overflow: 'hidden',
                position: 'relative',
                zIndex: 10
            }}>
                {/* 헤더 */}
                <div style={{
                    background: 'linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)',
                    padding: '40px',
                    textAlign: 'center',
                    color: 'white'
                }}>
                    <div style={{
                        width: '80px', height: '80px',
                        background: 'rgba(255,255,255,0.2)',
                        borderRadius: '20px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '2.5rem', margin: '0 auto 20px',
                        backdropFilter: 'blur(10px)'
                    }}>
                        👤
                    </div>
                    <h1 style={{ fontSize: '2rem', fontWeight: '800', margin: 0 }}>
                        회원가입
                    </h1>
                    <p style={{ marginTop: '8px', opacity: 0.9, fontSize: '0.95rem' }}>
                        모두의 민원 서비스에 가입하세요
                    </p>
                </div>

                {/* 폼 */}
                <form onSubmit={handleSubmit} style={{ padding: '40px' }}>
                    {/* 회원 유형 선택 (라디오 버튼) */}
                    <div style={{ marginBottom: '24px' }}>
                        <label style={labelStyle}>회원 유형 <span style={{ color: '#ef4444' }}>*</span></label>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                            <label style={{
                                ...radioLabelStyle,
                                borderColor: userType === 'INDIVIDUAL' ? '#7c3aed' : '#e2e8f0',
                                backgroundColor: userType === 'INDIVIDUAL' ? '#f5f3ff' : 'white',
                                color: userType === 'INDIVIDUAL' ? '#7c3aed' : '#475569'
                            }}>
                                <input
                                    type="radio"
                                    value="INDIVIDUAL"
                                    checked={userType === 'INDIVIDUAL'}
                                    onChange={handleUserTypeChange}
                                    style={{ marginRight: '8px' }}
                                />
                                개인
                            </label>

                            <label style={{
                                ...radioLabelStyle,
                                borderColor: userType === 'AGENCY_CENTRAL' ? '#7c3aed' : '#e2e8f0',
                                backgroundColor: userType === 'AGENCY_CENTRAL' ? '#f5f3ff' : 'white',
                                color: userType === 'AGENCY_CENTRAL' ? '#7c3aed' : '#475569'
                            }}>
                                <input
                                    type="radio"
                                    value="AGENCY_CENTRAL"
                                    checked={userType === 'AGENCY_CENTRAL'}
                                    onChange={handleUserTypeChange}
                                    style={{ marginRight: '8px' }}
                                />
                                중앙행정
                            </label>

                            <label style={{
                                ...radioLabelStyle,
                                borderColor: userType === 'AGENCY_LOCAL' ? '#7c3aed' : '#e2e8f0',
                                backgroundColor: userType === 'AGENCY_LOCAL' ? '#f5f3ff' : 'white',
                                color: userType === 'AGENCY_LOCAL' ? '#7c3aed' : '#475569'
                            }}>
                                <input
                                    type="radio"
                                    value="AGENCY_LOCAL"
                                    checked={userType === 'AGENCY_LOCAL'}
                                    onChange={handleUserTypeChange}
                                    style={{ marginRight: '8px' }}
                                />
                                지자체
                            </label>
                        </div>
                    </div>

                    {/* 기관 선택 (Dropdown) - 조건부 렌더링 */}
                    {userType !== 'INDIVIDUAL' && (
                        <div style={{ marginBottom: '20px', animation: 'fadeIn 0.3s ease-in-out' }}>
                            <label style={labelStyle}>
                                {userType === 'AGENCY_CENTRAL' ? '중앙행정기관 선택' : '광역자치단체 선택'} <span style={{ color: '#ef4444' }}>*</span>
                            </label>
                            <select
                                name="agencyNo"
                                value={formData.agencyNo}
                                onChange={handleChange}
                                required
                                style={{
                                    ...inputStyle,
                                    backgroundColor: 'white',
                                    backgroundImage: 'none', // 일부 브라우저에서 기본 화살표 제거 가능 (현재는 표준 유지)
                                    cursor: 'pointer'
                                }}
                            >
                                <option value="">소속 기관을 선택하세요</option>
                                {userType === 'AGENCY_CENTRAL' ? (
                                    CENTRAL_AGENCIES.map(agency => (
                                        <option key={agency.id} value={agency.id}>{agency.name}</option>
                                    ))
                                ) : (
                                    LOCAL_AGENCIES.map(agency => (
                                        <option key={agency.id} value={agency.id}>{agency.name}</option>
                                    ))
                                )}
                            </select>
                        </div>
                    )}

                    {/* 아이디 */}
                    <div style={{ marginBottom: '20px' }}>
                        <label style={labelStyle}>아이디 <span style={{ color: '#ef4444' }}>*</span></label>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <input
                                type="text"
                                name="userId"
                                value={formData.userId}
                                onChange={handleChange}
                                required
                                placeholder="사용할 아이디를 입력하세요"
                                style={{
                                    flex: 1,
                                    padding: '14px',
                                    borderRadius: '12px',
                                    border: '2px solid #e2e8f0',
                                    fontSize: '1rem'
                                }}
                            />
                            <button
                                type="button"
                                onClick={handleIdCheck}
                                style={{
                                    padding: '0 20px',
                                    borderRadius: '12px',
                                    border: 'none',
                                    background: '#3b82f6',
                                    color: 'white',
                                    fontWeight: '600',
                                    cursor: 'pointer',
                                    whiteSpace: 'nowrap'
                                }}
                            >
                                중복 확인
                            </button>
                        </div>
                        {/* 중복 확인 결과 메시지 */}
                        {formData.userId && (
                            <div style={{ fontSize: '0.85rem', marginTop: '6px', color: isIdChecked ? '#10b981' : '#f59e0b' }}>
                                {isIdChecked ? '✅ 사용 가능한 아이디입니다.' : 'ℹ️ 아이디 중복 확인이 필요합니다.'}
                            </div>
                        )}
                    </div>

                    {/* 비밀번호 */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                        <div>
                            <label style={labelStyle}>비밀번호 <span style={{ color: '#ef4444' }}>*</span></label>
                            <input
                                type="password"
                                name="password"
                                value={formData.password}
                                onChange={handleChange}
                                required
                                placeholder="비밀번호"
                                style={inputStyle}
                            />
                            <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '6px', marginLeft: '4px' }}>
                                * 8자 이상, 특수문자 포함
                            </div>
                        </div>
                        <div>
                            <label style={labelStyle}>비밀번호 확인 <span style={{ color: '#ef4444' }}>*</span></label>
                            <input
                                type="password"
                                name="passwordConfirm"
                                value={formData.passwordConfirm}
                                onChange={handleChange}
                                required
                                placeholder="비밀번호 확인"
                                style={inputStyle}
                            />
                        </div>
                    </div>

                    {/* 이름, 생년월일 */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                        <div>
                            <label style={labelStyle}>성명 <span style={{ color: '#ef4444' }}>*</span></label>
                            <input
                                type="text"
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                required
                                placeholder="이름"
                                style={inputStyle}
                            />
                        </div>
                        <div>
                            <label style={labelStyle}>생년월일 <span style={{ color: '#ef4444' }}>*</span></label>
                            <input
                                type="date"
                                name="birthDate"
                                value={formData.birthDate}
                                onChange={handleChange}
                                required
                                max={new Date().toISOString().split('T')[0]}
                                style={inputStyle}
                            />
                        </div>
                    </div>

                    {/* 주소 */}
                    <div style={{ marginBottom: '20px' }}>
                        <label style={labelStyle}>주소 <span style={{ color: '#ef4444' }}>*</span></label>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <input
                                type="text"
                                name="addr"
                                value={formData.addr}
                                onChange={handleChange}
                                required
                                readOnly
                                placeholder="주소 검색 버튼을 눌러주세요"
                                style={{
                                    ...inputStyle,
                                    cursor: 'pointer',
                                    backgroundColor: '#f8fafc'
                                }}
                                onClick={handleSearchAddress}
                            />
                            <button
                                type="button"
                                onClick={handleSearchAddress}
                                style={{
                                    padding: '0 20px',
                                    borderRadius: '12px',
                                    border: 'none',
                                    background: '#3b82f6',
                                    color: 'white',
                                    fontWeight: '600',
                                    cursor: 'pointer',
                                    whiteSpace: 'nowrap'
                                }}
                            >
                                🔍 검색
                            </button>
                        </div>
                    </div>

                    {/* 휴대전화 */}
                    <div style={{ marginBottom: '30px' }}>
                        <label style={labelStyle}>휴대전화 <span style={{ color: '#ef4444' }}>*</span></label>
                        <input
                            type="tel"
                            name="phone"
                            value={formData.phone}
                            onChange={handlePhoneChange}
                            required
                            placeholder="예: 010-1234-5678"
                            style={inputStyle}
                            maxLength={13}
                        />
                    </div>

                    {/* 버튼 */}
                    <div style={{ display: 'flex', gap: '16px' }}>
                        <button
                            type="submit"
                            style={{
                                flex: 2,
                                padding: '18px',
                                background: 'linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)',
                                color: 'white',
                                border: 'none',
                                borderRadius: '14px',
                                fontSize: '1.1rem',
                                fontWeight: '700',
                                cursor: 'pointer',
                                boxShadow: '0 4px 14px rgba(124, 58, 237, 0.4)',
                                transition: 'all 0.3s'
                            }}
                        >
                            {loading ? '처리 중...' : '🚀 회원가입'}
                        </button>
                        <Link
                            to="/"
                            style={{
                                flex: 1,
                                padding: '18px',
                                backgroundColor: '#f1f5f9',
                                color: '#64748b',
                                border: 'none',
                                borderRadius: '14px',
                                fontSize: '1rem',
                                fontWeight: '600',
                                textAlign: 'center',
                                textDecoration: 'none',
                                display: 'flex', alignItems: 'center', justifyContent: 'center'
                            }}
                        >
                            취소
                        </Link>
                    </div>

                    <div style={{ textAlign: 'center', marginTop: '24px' }}>
                        <span style={{ color: '#64748b', fontSize: '0.95rem' }}>
                            이미 계정이 있으신가요?{' '}
                        </span>
                        <Link to="/login" style={{ color: '#7c3aed', fontWeight: '600', fontSize: '0.95rem' }}>
                            로그인 하기
                        </Link>
                    </div>
                </form>
            </div>

            {/* 관리자 인증 모달 */}
            <Modal
                isOpen={authModalOpen}
                onClose={closeAuthModal}
                title="관리자 인증"
                confirmText="인증하기"
                onConfirm={handleAuthSubmit}
            >
                <div>
                    <p style={{ marginBottom: '12px' }}>
                        기관 회원으로 가입하려면 관리자 인증 키가 필요합니다.
                    </p>
                    <input
                        type="password"
                        value={adminKeyInput}
                        onChange={(e) => setAdminKeyInput(e.target.value)}
                        placeholder="관리자 키 입력"
                        style={{
                            width: '100%',
                            padding: '12px',
                            border: '2px solid #e2e8f0',
                            borderRadius: '8px',
                            fontSize: '1rem',
                            outline: 'none',
                            boxSizing: 'border-box'
                        }}
                    />
                </div>
            </Modal>

            {/* 공통 모달 적용 */}
            <Modal
                isOpen={modalConfig.isOpen}
                onClose={closeModal}
                title={modalConfig.title}
            >
                {modalConfig.message}
            </Modal>
        </div>
    );
}

export default Register;

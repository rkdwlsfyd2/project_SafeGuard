import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authAPI } from '../utils/api';

// Hardcoded Agency Data (Must match init.sql / database)
// Hardcoded Agency Data (Must match init.sql / database)
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

    // User Type State: 'INDIVIDUAL' | 'AGENCY_CENTRAL' | 'AGENCY_LOCAL'
    const [userType, setUserType] = useState('INDIVIDUAL');

    const [formData, setFormData] = useState({
        userId: '',
        password: '',
        passwordConfirm: '',
        name: '',
        birthDate: '',
        addr: '',
        phone: '',
        agencyNo: '' // Will be set if AGENCY
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleUserTypeChange = (e) => {
        const type = e.target.value;
        setUserType(type);
        // Reset agency selection when type changes
        setFormData(prev => ({ ...prev, agencyNo: '' }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (formData.password !== formData.passwordConfirm) {
            setError('비밀번호가 일치하지 않습니다.');
            return;
        }

        // Validate Agency Selection
        if ((userType === 'AGENCY_CENTRAL' || userType === 'AGENCY_LOCAL') && !formData.agencyNo) {
            setError('소속 기관을 선택해주세요.');
            return;
        }

        setLoading(true);

        try {
            const { passwordConfirm, ...registerData } = formData;

            // Clean up: If INDIVIDUAL, ensure agencyNo is null/undefined just in case
            if (userType === 'INDIVIDUAL') {
                delete registerData.agencyNo;
            } else {
                // Ensure agencyNo is Number
                registerData.agencyNo = Number(registerData.agencyNo);
            }

            console.log("Registering:", registerData); // Debug log

            await authAPI.register(registerData);
            alert('회원가입이 완료되었습니다. 로그인해주세요.');
            navigate('/login');
        } catch (err) {
            console.error(err);
            setError(err.message || '회원가입 중 오류가 발생했습니다.');
        } finally {
            setLoading(false);
        }
    };

    const inputStyle = {
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

    const radioLabelStyle = {
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
                    {error && (
                        <div style={{
                            padding: '14px 18px',
                            backgroundColor: '#fef2f2',
                            border: '1px solid #fecaca',
                            borderRadius: '12px',
                            color: '#dc2626',
                            marginBottom: '20px',
                            fontSize: '0.9rem',
                            textAlign: 'center'
                        }}>
                            ⚠️ {error}
                        </div>
                    )}

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
                                    backgroundImage: 'none', // Remove default arrow in some browsers if desired, here keeping standard
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
                        <input
                            type="text"
                            name="userId"
                            value={formData.userId}
                            onChange={handleChange}
                            required
                            placeholder="사용할 아이디를 입력하세요"
                            style={inputStyle}
                        />
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
                                style={inputStyle}
                            />
                        </div>
                    </div>

                    {/* 주소 */}
                    <div style={{ marginBottom: '20px' }}>
                        <label style={labelStyle}>주소 <span style={{ color: '#ef4444' }}>*</span></label>
                        <input
                            type="text"
                            name="addr"
                            value={formData.addr}
                            onChange={handleChange}
                            required
                            placeholder="예: 서울시 강남구"
                            style={inputStyle}
                        />
                    </div>

                    {/* 휴대전화 */}
                    <div style={{ marginBottom: '30px' }}>
                        <label style={labelStyle}>휴대전화 <span style={{ color: '#ef4444' }}>*</span></label>
                        <input
                            type="tel"
                            name="phone"
                            value={formData.phone}
                            onChange={handleChange}
                            required
                            placeholder="예: 01012345678"
                            style={inputStyle}
                        />
                    </div>

                    {/* 버튼 */}
                    <div style={{ display: 'flex', gap: '16px' }}>
                        <button
                            type="submit"
                            disabled={loading}
                            style={{
                                flex: 2,
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
        </div>
    );
}

export default Register;

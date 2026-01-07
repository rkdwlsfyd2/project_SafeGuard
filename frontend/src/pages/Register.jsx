import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authAPI } from '../utils/api';

function Register() {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        userId: '',
        password: '',
        passwordConfirm: '',
        name: '',
        birthDate: '',
        addr: '',
        phone: ''
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (formData.password !== formData.passwordConfirm) {
            setError('비밀번호가 일치하지 않습니다.');
            return;
        }

        setLoading(true);

        try {
            const { passwordConfirm, ...registerData } = formData;
            await authAPI.register(registerData);
            alert('회원가입이 완료되었습니다. 로그인해주세요.');
            navigate('/login');
        } catch (err) {
            setError(err.message);
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
                position: 'absolute',
                top: '5%',
                left: '10%',
                width: '350px',
                height: '350px',
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.1)',
                filter: 'blur(60px)'
            }}></div>
            <div style={{
                position: 'absolute',
                bottom: '10%',
                right: '15%',
                width: '300px',
                height: '300px',
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.08)',
                filter: 'blur(80px)'
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
                        width: '80px',
                        height: '80px',
                        background: 'rgba(255,255,255,0.2)',
                        borderRadius: '20px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '2.5rem',
                        margin: '0 auto 20px',
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
                            onFocus={(e) => {
                                e.target.style.borderColor = '#7c3aed';
                                e.target.style.boxShadow = '0 0 0 4px rgba(124, 58, 237, 0.1)';
                            }}
                            onBlur={(e) => {
                                e.target.style.borderColor = '#e2e8f0';
                                e.target.style.boxShadow = 'none';
                            }}
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
                                onFocus={(e) => {
                                    e.target.style.borderColor = '#7c3aed';
                                    e.target.style.boxShadow = '0 0 0 4px rgba(124, 58, 237, 0.1)';
                                }}
                                onBlur={(e) => {
                                    e.target.style.borderColor = '#e2e8f0';
                                    e.target.style.boxShadow = 'none';
                                }}
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
                                onFocus={(e) => {
                                    e.target.style.borderColor = '#7c3aed';
                                    e.target.style.boxShadow = '0 0 0 4px rgba(124, 58, 237, 0.1)';
                                }}
                                onBlur={(e) => {
                                    e.target.style.borderColor = '#e2e8f0';
                                    e.target.style.boxShadow = 'none';
                                }}
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
                                onFocus={(e) => {
                                    e.target.style.borderColor = '#7c3aed';
                                    e.target.style.boxShadow = '0 0 0 4px rgba(124, 58, 237, 0.1)';
                                }}
                                onBlur={(e) => {
                                    e.target.style.borderColor = '#e2e8f0';
                                    e.target.style.boxShadow = 'none';
                                }}
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
                                onFocus={(e) => {
                                    e.target.style.borderColor = '#7c3aed';
                                    e.target.style.boxShadow = '0 0 0 4px rgba(124, 58, 237, 0.1)';
                                }}
                                onBlur={(e) => {
                                    e.target.style.borderColor = '#e2e8f0';
                                    e.target.style.boxShadow = 'none';
                                }}
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
                            onFocus={(e) => {
                                e.target.style.borderColor = '#7c3aed';
                                e.target.style.boxShadow = '0 0 0 4px rgba(124, 58, 237, 0.1)';
                            }}
                            onBlur={(e) => {
                                e.target.style.borderColor = '#e2e8f0';
                                e.target.style.boxShadow = 'none';
                            }}
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
                            placeholder="010-0000-0000"
                            style={inputStyle}
                            onFocus={(e) => {
                                e.target.style.borderColor = '#7c3aed';
                                e.target.style.boxShadow = '0 0 0 4px rgba(124, 58, 237, 0.1)';
                            }}
                            onBlur={(e) => {
                                e.target.style.borderColor = '#e2e8f0';
                                e.target.style.boxShadow = 'none';
                            }}
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
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
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

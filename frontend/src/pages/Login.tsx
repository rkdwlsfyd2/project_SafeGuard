import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { authAPI } from '../utils/api';

function Login() {
    const [userId, setUserId] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();

    // 회원가입 후 이동했을 때만 스크롤 최상단 이동
    React.useEffect(() => {
        if (location.state?.fromRegistration) {
            window.scrollTo(0, 0);
        }
    }, [location]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const result = await authAPI.login({ userId, password });
            if (result.user.role === 'AGENCY') {
                // Ensure agencyName is stored (redundant check)
                if (result.user.agencyName) {
                    localStorage.setItem('agencyName', result.user.agencyName);
                }
                window.location.href = '/admin/dashboard';
            } else {
                window.location.href = '/';
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            minHeight: '100vh',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
        }}>
            {/* 배경 장식 */}
            <div style={{
                position: 'absolute',
                top: '10%',
                left: '15%',
                width: '300px',
                height: '300px',
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.1)',
                filter: 'blur(60px)'
            }}></div>
            <div style={{
                position: 'absolute',
                bottom: '20%',
                right: '20%',
                width: '400px',
                height: '400px',
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.08)',
                filter: 'blur(80px)'
            }}></div>

            <div style={{
                width: '100%',
                maxWidth: '440px',
                backgroundColor: 'white',
                borderRadius: '24px',
                boxShadow: '0 25px 50px rgba(0,0,0,0.25)',
                overflow: 'hidden',
                position: 'relative',
                zIndex: 10
            }}>
                {/* 헤더 */}
                <div style={{
                    padding: '40px 40px 30px',
                    textAlign: 'center',
                    background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)'
                }}>
                    <div style={{
                        width: '80px',
                        height: '80px',
                        background: 'linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)',
                        borderRadius: '20px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 20px',
                        boxShadow: '0 10px 30px rgba(124, 58, 237, 0.4)',
                        transform: 'rotate(10deg)'
                    }}>
                        <span style={{ fontSize: '2.5rem' }}>🔐</span>
                    </div>
                    <h1 style={{ fontSize: '2rem', fontWeight: '800', color: '#1e293b', margin: 0 }}>
                        로그인
                    </h1>
                    <p style={{ color: '#64748b', marginTop: '8px', fontSize: '0.95rem' }}>
                        모두의 민원 서비스에 오신 것을 환영합니다
                    </p>
                </div>

                {/* 폼 */}
                <div style={{ padding: '30px 40px 40px' }}>
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

                    <form onSubmit={handleSubmit}>
                        <div style={{ marginBottom: '20px' }}>
                            <label style={{
                                display: 'block',
                                fontSize: '0.9rem',
                                fontWeight: '600',
                                color: '#374151',
                                marginBottom: '8px'
                            }}>
                                아이디
                            </label>
                            <input
                                type="text"
                                name="userId"
                                value={userId}
                                onChange={(e) => setUserId(e.target.value)}
                                required
                                placeholder="아이디를 입력하세요"
                                style={{
                                    width: '100%',
                                    padding: '16px 18px',
                                    border: '2px solid #e2e8f0',
                                    borderRadius: '12px',
                                    fontSize: '1rem',
                                    outline: 'none',
                                    transition: 'border-color 0.2s, box-shadow 0.2s',
                                    boxSizing: 'border-box'
                                }}
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

                        <div style={{ marginBottom: '20px' }}>
                            <label style={{
                                display: 'block',
                                fontSize: '0.9rem',
                                fontWeight: '600',
                                color: '#374151',
                                marginBottom: '8px'
                            }}>
                                비밀번호
                            </label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                placeholder="비밀번호를 입력하세요"
                                style={{
                                    width: '100%',
                                    padding: '16px 18px',
                                    border: '2px solid #e2e8f0',
                                    borderRadius: '12px',
                                    fontSize: '1rem',
                                    outline: 'none',
                                    transition: 'border-color 0.2s, box-shadow 0.2s',
                                    boxSizing: 'border-box'
                                }}
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

                        <div style={{
                            display: 'flex',
                            justifyContent: 'flex-end',
                            marginBottom: '24px'
                        }}>
                            <Link to="/find-account" style={{ fontSize: '0.9rem', color: '#7c3aed', fontWeight: '500', textDecoration: 'none' }}>
                                아이디/비밀번호 찾기
                            </Link>
                        </div>

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
                                transition: 'all 0.3s',
                                marginBottom: '24px'
                            }}
                        >
                            {loading ? '로그인 중...' : '🚀 로그인하기'}
                        </button>
                    </form>

                    <div style={{ textAlign: 'center' }}>
                        <span style={{ color: '#64748b', fontSize: '0.95rem' }}>
                            계정이 없으신가요?{' '}
                        </span>
                        <Link to="/register" style={{ color: '#7c3aed', fontWeight: '600', fontSize: '0.95rem' }}>
                            회원가입 하기
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Login;

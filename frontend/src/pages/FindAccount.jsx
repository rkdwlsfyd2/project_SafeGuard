import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authAPI } from '../utils/api';

function FindAccount() {
    const navigate = useNavigate();
    const [tab, setTab] = useState('id'); // 'id' or 'pw'
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [userId, setUserId] = useState('');
    const [resultMessage, setResultMessage] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleFindId = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setResultMessage('');

        try {
            const data = await authAPI.findId({ name, phone });
            setResultMessage(`조회된 아이디: ${data.userId}`);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleResetPassword = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setResultMessage('');

        try {
            await authAPI.verifyReset({ userId, phone });
            // 성공 시 리다이렉트 (userId와 phone 정보를 넘겨줌)
            navigate('/reset-password', { state: { userId, phone } });
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const inputStyle = {
        width: '100%',
        padding: '16px 18px',
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
            padding: '20px'
        }}>
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
                    padding: '40px 40px 20px',
                    textAlign: 'center',
                    background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)'
                }}>
                    <h1 style={{ fontSize: '1.8rem', fontWeight: '800', color: '#1e293b', margin: 0 }}>
                        계정 찾기
                    </h1>
                    <div style={{ display: 'flex', borderBottom: '2px solid #f1f5f9' }}>
                        <button
                            onClick={() => { setTab('id'); setError(''); setResultMessage(''); }}
                            style={{
                                flex: 1,
                                padding: '16px',
                                background: tab === 'id' ? 'white' : 'transparent',
                                border: 'none',
                                borderBottom: tab === 'id' ? '2px solid #7c3aed' : 'none',
                                color: tab === 'id' ? '#7c3aed' : '#64748b',
                                fontWeight: '700',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                marginBottom: '-2px'
                            }}
                        >
                            아이디 찾기
                        </button>
                        <button
                            onClick={() => { setTab('pw'); setError(''); setResultMessage(''); }}
                            style={{
                                flex: 1,
                                padding: '16px',
                                background: tab === 'pw' ? 'white' : 'transparent',
                                border: 'none',
                                borderBottom: tab === 'pw' ? '2px solid #7c3aed' : 'none',
                                color: tab === 'pw' ? '#7c3aed' : '#64748b',
                                fontWeight: '700',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                marginBottom: '-2px'
                            }}
                        >
                            비밀번호 찾기
                        </button>
                    </div>
                </div>

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

                    {resultMessage && (
                        <div style={{
                            padding: '14px 18px',
                            backgroundColor: '#f0fdf4',
                            border: '1px solid #bbf7d0',
                            borderRadius: '12px',
                            color: '#16a34a',
                            marginBottom: '20px',
                            fontSize: '0.9rem',
                            textAlign: 'center',
                            fontWeight: '600'
                        }}>
                            ✅ {resultMessage}
                        </div>
                    )}

                    {tab === 'id' ? (
                        <form onSubmit={handleFindId}>
                            <div style={{ marginBottom: '20px' }}>
                                <label style={labelStyle}>이름</label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    required
                                    placeholder="가입 시 이름을 입력하세요"
                                    style={inputStyle}
                                />
                            </div>
                            <div style={{ marginBottom: '24px' }}>
                                <label style={labelStyle}>전화번호</label>
                                <input
                                    type="text"
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                    required
                                    placeholder="숫자만 입력하세요 (예: 01012345678)"
                                    style={inputStyle}
                                />
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
                                    marginBottom: '20px'
                                }}
                            >
                                {loading ? '조회 중...' : '아이디 찾기'}
                            </button>
                        </form>
                    ) : (
                        <form onSubmit={handleResetPassword}>
                            <div style={{ marginBottom: '20px' }}>
                                <label style={labelStyle}>아이디</label>
                                <input
                                    type="text"
                                    value={userId}
                                    onChange={(e) => setUserId(e.target.value)}
                                    required
                                    placeholder="가입 시 등록한 아이디를 입력하세요"
                                    style={inputStyle}
                                />
                            </div>
                            <div style={{ marginBottom: '24px' }}>
                                <label style={labelStyle}>전화번호</label>
                                <input
                                    type="text"
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                    required
                                    placeholder="등록된 번호를 입력하세요"
                                    style={inputStyle}
                                />
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
                                    marginBottom: '20px'
                                }}
                            >
                                {loading ? '처리 중...' : '비밀번호 재설정'}
                            </button>
                        </form>
                    )}

                    <div style={{ textAlign: 'center' }}>
                        <Link to="/login" style={{ color: '#64748b', fontSize: '0.95rem', fontWeight: '600', textDecoration: 'none' }}>
                            ← 로그인 화면으로 돌아가기
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default FindAccount;

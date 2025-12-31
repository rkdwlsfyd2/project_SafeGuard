import React from 'react';

function Login() {
    return (
        <div className="login-page" style={{ padding: '80px 0', minHeight: 'calc(100vh - 200px)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <div className="login-card" style={{ width: '450px', backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
                <div style={{ backgroundColor: 'var(--primary-color)', color: 'white', padding: '20px', textAlign: 'center', fontSize: '1.2rem', fontWeight: 'bold' }}>
                    로그인
                </div>
                <div style={{ padding: '40px' }}>
                    <div style={{ marginBottom: '20px' }}>
                        <input type="text" placeholder="아이디" style={{ width: '100%', padding: '12px', border: '1px solid #E0E0E0', borderRadius: '4px' }} />
                    </div>
                    <div style={{ marginBottom: '30px' }}>
                        <input type="password" placeholder="비밀번호" style={{ width: '100%', padding: '12px', border: '1px solid #E0E0E0', borderRadius: '4px' }} />
                    </div>
                    <button style={{ width: '100%', padding: '15px', backgroundColor: 'var(--primary-color)', color: 'white', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer', marginBottom: '20px' }}>
                        로그인
                    </button>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', fontSize: '0.85rem', color: 'var(--text-sub)' }}>
                        <span style={{ cursor: 'pointer' }}>회원가입</span>
                        <span>|</span>
                        <span style={{ cursor: 'pointer' }}>아이디/비밀번호 찾기</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Login;

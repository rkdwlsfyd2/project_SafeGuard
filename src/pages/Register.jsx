import React from 'react';

function Register() {
    const rowStyle = { display: 'flex', alignItems: 'center', marginBottom: '15px' };
    const labelStyle = { width: '120px', fontSize: '0.9rem', color: '#555', fontWeight: '500' };
    const inputStyle = { flex: 1, padding: '10px', border: '1px solid #E0E0E0', borderRadius: '4px' };

    return (
        <div className="register-page" style={{ padding: '60px 0', minHeight: 'calc(100vh - 200px)', display: 'flex', justifyContent: 'center' }}>
            <div className="register-card" style={{ width: '600px', backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
                <div style={{ backgroundColor: 'var(--primary-color)', color: 'white', padding: '20px', textAlign: 'center', fontSize: '1.2rem', fontWeight: 'bold' }}>
                    회원가입
                </div>
                <div style={{ padding: '40px' }}>
                    <div style={rowStyle}>
                        <div style={labelStyle}>신청인 구분</div>
                        <div style={{ display: 'flex', gap: '20px' }}>
                            <label><input type="radio" name="type" /> 개인</label>
                            <label><input type="radio" name="type" /> 기관</label>
                            <label><input type="radio" name="type" /> 지자체</label>
                        </div>
                    </div>

                    <div style={rowStyle}>
                        <div style={labelStyle}>아이디</div>
                        <input type="text" style={inputStyle} />
                        <button style={{ marginLeft: '10px', padding: '10px 15px', border: '1px solid #CCC', backgroundColor: '#F9F9F9', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}>중복확인</button>
                    </div>

                    <div style={rowStyle}>
                        <div style={labelStyle}>비밀번호</div>
                        <input type="password" style={inputStyle} />
                    </div>

                    <div style={rowStyle}>
                        <div style={labelStyle}>비밀번호 확인</div>
                        <input type="password" style={inputStyle} />
                    </div>

                    <div style={rowStyle}>
                        <div style={labelStyle}>성명</div>
                        <input type="text" style={inputStyle} />
                    </div>

                    <div style={rowStyle}>
                        <div style={labelStyle}>생년월일</div>
                        <input type="text" style={inputStyle} />
                    </div>

                    <div style={rowStyle}>
                        <div style={labelStyle}>주소</div>
                        <input type="text" style={inputStyle} />
                    </div>

                    <div style={rowStyle}>
                        <div style={labelStyle}>휴대전화</div>
                        <input type="text" style={inputStyle} />
                    </div>

                    <div style={{ display: 'flex', gap: '10px', marginTop: '30px' }}>
                        <button style={{ flex: 1, padding: '15px', backgroundColor: 'var(--primary-color)', color: 'white', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' }}>회원가입</button>
                        <button style={{ flex: 1, padding: '15px', backgroundColor: 'white', color: '#555', border: '1px solid #CCC', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' }}>취소</button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Register;

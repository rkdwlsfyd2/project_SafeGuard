import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { authAPI } from '../utils/api';
import Modal from '../components/common/Modal';

function ResetPassword() {
    const navigate = useNavigate();
    const location = useLocation();

    // Get userId and phone and birthDate from location state (passed from FindAccount)
    const { userId, phone, birthDate } = location.state || {}; // birthDate 추가

    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);

    // 모달 상태
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

    // Redirect if direct access without state
    if (!userId || !phone || !birthDate) { // birthDate 체크 추가
        return (
            <div style={{ padding: '40px', textAlign: 'center' }}>
                <p>잘못된 접근입니다.</p>
                <Link to="/find-account">계정 찾기로 돌아가기</Link>
            </div>
        );
    }

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (newPassword !== confirmPassword) {
            showAlert('오류', '비밀번호가 일치하지 않습니다.');
            return;
        }

        if (newPassword.length < 8) {
            showAlert('오류', '비밀번호는 8자 이상이어야 합니다.');
            return;
        }

        if (newPassword.includes(' ')) {
            showAlert('오류', '비밀번호에 공백을 포함할 수 없습니다.');
            return;
        }

        const specialCharRegex = /[!@#$%^&*(),.?":{}|<>]/;
        if (!specialCharRegex.test(newPassword)) {
            showAlert('오류', '비밀번호는 특수문자를 최소 1개 이상 포함해야 합니다.');
            return;
        }

        setLoading(true);

        try {
            await authAPI.updatePassword({ userId, phone, newPassword, birthDate });
            showAlert('변경 완료', '비밀번호가 성공적으로 변경되었습니다. 다시 로그인해 주세요.', () => navigate('/login'));
        } catch (err) {
            showAlert('오류', err.message);
        } finally {
            setLoading(false);
        }
    };

    const inputStyle: React.CSSProperties = {
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
                overflow: 'hidden'
            }}>
                <div style={{
                    padding: '40px 40px 20px',
                    textAlign: 'center',
                    background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)'
                }}>
                    <h1 style={{ fontSize: '1.8rem', fontWeight: '800', color: '#1e293b', margin: 0 }}>
                        비밀번호 재설정
                    </h1>
                    <p style={{ color: '#64748b', marginTop: '10px' }}>
                        아이디: <strong>{userId}</strong>
                    </p>
                </div>

                <div style={{ padding: '30px 40px 40px' }}>


                    <form onSubmit={handleSubmit}>
                        <div style={{ marginBottom: '20px' }}>
                            <label style={labelStyle}>새 비밀번호</label>
                            <input
                                type="password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                required
                                placeholder="새 비밀번호를 입력하세요"
                                style={inputStyle}
                            />
                        </div>
                        <div style={{ marginBottom: '24px' }}>
                            <label style={labelStyle}>비밀번호 확인</label>
                            <input
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                                placeholder="비밀번호를 한 번 더 입력하세요"
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
                            }}
                        >
                            {loading ? '변경 중...' : '비밀번호 변경 완료'}
                        </button>
                    </form>
                </div>
            </div>

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

export default ResetPassword;

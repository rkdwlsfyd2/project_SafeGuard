import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { complaintsAPI, usersAPI } from '../utils/api';
import Modal from '../components/common/Modal';

function MyPage() {
    const navigate = useNavigate();
    const [myReports, setMyReports] = useState<any[]>([]);
    const [userInfo, setUserInfo] = useState<any>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [editData, setEditData] = useState({ name: '', addr: '', phone: '' });
    const [isChangingPw, setIsChangingPw] = useState(false);
    const [pwData, setPwData] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
    const [filterStatus, setFilterStatus] = useState('ALL');
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

    // [추가] 공통 알림 모달 상태
    const [alertState, setAlertState] = useState({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: undefined as (() => void) | undefined
    });

    // [추가] 페이지네이션 상태
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 4;

    const showAlert = (title: string, message: string, onConfirm?: () => void) => {
        setAlertState({ isOpen: true, title, message, onConfirm });
    };

    const getStatusText = (status: string) => {
        switch (status) {
            case 'UNPROCESSED': return '미처리';
            case 'IN_PROGRESS': return '처리중';
            case 'COMPLETED': return '처리완료';
            case 'REJECTED': return '반려';
            case 'CANCELLED': return '취소';
            default: return status;
        }
    };

    // Daum 우편번호 스크립트 로드
    useEffect(() => {
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

    useEffect(() => {
        // 민원 목록 가져오기
        complaintsAPI.getMyComplaints()
            .then(data => setMyReports(data))
            .catch(err => console.error(err));

        // 사용자 정보 가져오기
        usersAPI.getMe()
            .then(data => {
                setUserInfo(data);
                setEditData({ name: data.name, addr: data.addr || '', phone: data.phone || '' });
            })
            .catch(err => console.error(err));
    }, []);

    const handleSearchAddress = () => {
        if (!(window as any).daum || !(window as any).daum.Postcode) {
            showAlert('안내', '주소 검색 서비스를 불러오는 중입니다. 잠시 후 다시 시도해주세요.');
            return;
        }

        new (window as any).daum.Postcode({
            oncomplete: function (data: any) {
                const addr = data.roadAddress || data.jibunAddress;
                setEditData(prev => ({
                    ...prev,
                    addr: addr
                }));
            }
        }).open();
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

        setEditData(prev => ({ ...prev, phone: formatted }));
    };

    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault();

        // 유효성 검사
        if (!editData.name.trim()) {
            showAlert('오류', '이름을 입력해주세요.');
            return;
        }
        if (!editData.addr.trim()) {
            showAlert('오류', '주소를 입력해주세요.');
            return;
        }
        if (!editData.phone.trim()) {
            showAlert('오류', '연락처를 입력해주세요.');
            return;
        }

        // 휴대전화 유효성 검사
        const phoneRegex = /^01(?:0|1|[6-9])-(?:\d{3}|\d{4})-\d{4}$/;
        if (!phoneRegex.test(editData.phone)) {
            showAlert('오류', '올바른 휴대전화 번호 형식이 아닙니다.\n(예: 010-1234-5678)');
            return;
        }

        try {
            await usersAPI.updateProfile(editData);
            showAlert('정보 수정', '정보가 성공적으로 수정되었습니다.');
            setIsEditing(false);
            // 정보 갱신
            const updated = await usersAPI.getMe();
            setUserInfo(updated);
        } catch (err: any) {
            showAlert('오류', err.message);
        }
    };

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (pwData.newPassword !== pwData.confirmPassword) {
            showAlert('비밀번호 불일치', '새 비밀번호가 일치하지 않습니다.');
            return;
        }
        try {
            await usersAPI.updatePassword({
                currentPassword: pwData.currentPassword,
                newPassword: pwData.newPassword
            });
            showAlert('비밀번호 변경', '비밀번호가 성공적으로 변경되었습니다.');
            setIsChangingPw(false);
            setPwData({ currentPassword: '', newPassword: '', confirmPassword: '' });
        } catch (err: any) {
            showAlert('오류', err.message);
        }
    };

    const handleDeleteAccount = () => {
        setIsDeleteModalOpen(true);
    };

    const confirmDeleteAccount = async () => {
        try {
            await usersAPI.deleteAccount();
            showAlert('탈퇴 완료', '탈퇴 처리가 완료되었습니다.', () => {
                localStorage.clear();
                window.location.href = '/';
            });
        } catch (err: any) {
            showAlert('오류', err.message);
        } finally {
            setIsDeleteModalOpen(false);
        }
    };

    const statsCards = [
        { label: '전체', count: myReports.length, color: '#F1F5F9', textColor: '#334155', status: 'ALL' },
        { label: '미처리', count: myReports.filter(r => r.status === 'UNPROCESSED').length, color: '#EFF6FF', textColor: '#2563EB', status: 'UNPROCESSED' },
        { label: '처리중', count: myReports.filter(r => r.status === 'IN_PROGRESS').length, color: '#FEF2F2', textColor: '#EF4444', status: 'IN_PROGRESS' },
        { label: '처리완료', count: myReports.filter(r => r.status === 'COMPLETED').length, color: '#F0FDF4', textColor: '#16A34A', status: 'COMPLETED' }
    ];

    const filteredReports = filterStatus === 'ALL'
        ? myReports
        : myReports.filter(r => r.status === filterStatus);

    // [추가] 페이지네이션된 목록 계산
    const paginatedReports = filteredReports.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    );

    const totalPages = Math.ceil(filteredReports.length / ITEMS_PER_PAGE);

    // 필터 변경 시 페이지 초기화
    useEffect(() => {
        setCurrentPage(1);
    }, [filterStatus]);

    return (
        <div className="mypage" style={{ padding: '60px 0', backgroundColor: '#F0F2F5', minHeight: '100vh' }}>
            <div className="container" style={{ maxWidth: '1200px' }}>
                {/* Header Section */}
                <div style={{ marginBottom: '40px', textAlign: 'left' }}>
                    <h2 style={{ color: '#1E293B', fontSize: '2.5rem', fontWeight: '800', marginBottom: '10px' }}>
                        {localStorage.getItem('role') === 'AGENCY' ? '관리자페이지' : '마이페이지'}
                    </h2>
                    <p style={{ color: '#64748B', fontSize: '1.1rem' }}>
                        {localStorage.getItem('role') === 'AGENCY'
                            ? `담당 민원 현황을 관리할 수 있습니다. (목록 당 ${ITEMS_PER_PAGE}개 표시)`
                            : `내 활동 현황과 회원 정보를 관리할 수 있습니다. (목록 당 ${ITEMS_PER_PAGE}개 표시)`
                        }
                    </p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '30px', alignItems: 'stretch' }}>
                    {/* Left: Profile Card */}
                    <aside style={{ backgroundColor: 'white', padding: '30px', borderRadius: '24px', boxShadow: '0 10px 25px rgba(0,0,0,0.05)', border: '1px solid #E2E8F0', height: '100%', display: 'flex', flexDirection: 'column' }}>
                        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
                            <div style={{
                                width: '100px', height: '100px', borderRadius: '50%', backgroundColor: 'var(--primary-color)',
                                color: 'white', display: 'flex', justifyContent: 'center', alignItems: 'center',
                                fontSize: '2.5rem', fontWeight: 'bold', margin: '0 auto 15px',
                                boxShadow: '0 8px 16px rgba(63, 81, 181, 0.2)'
                            }}>
                                {userInfo?.name?.charAt(0) || 'U'}
                            </div>
                            <h3 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#1E293B', marginBottom: '5px' }}>{userInfo?.name}</h3>
                            <span style={{ fontSize: '0.9rem', color: '#94A3B8', backgroundColor: '#F1F5F9', padding: '4px 12px', borderRadius: '20px' }}>@{userInfo?.userId}</span>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '30px', marginBottom: '40px', flex: 1, marginTop: '60px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                <div style={iconBoxStyle}><LocationIcon /></div>
                                <div style={{ flex: 1 }}>
                                    <div style={labelStyle}>주소</div>
                                    <div style={valueStyle}>{userInfo?.addr || '미등록'}</div>
                                </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                <div style={iconBoxStyle}><PhoneIcon /></div>
                                <div style={{ flex: 1 }}>
                                    <div style={labelStyle}>연락처</div>
                                    <div style={valueStyle}>{userInfo?.phone || '미등록'}</div>
                                </div>
                            </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            <button onClick={() => setIsEditing(true)} style={actionButtonStyle}>정보 수정</button>
                            <button onClick={() => setIsChangingPw(true)} style={actionButtonStyle}>비밀번호 변경</button>
                            <button onClick={handleDeleteAccount} style={{ ...actionButtonStyle, color: '#EF4444', border: '1px solid #FEE2E2' }}>회원 탈퇴</button>
                        </div>
                    </aside>

                    {/* Right: Stats and List */}
                    <main style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
                        {/* Stats Cards */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px' }}>
                            {statsCards.map((stat, idx) => (
                                <div
                                    key={idx}
                                    onClick={() => setFilterStatus(stat.status)}
                                    style={{
                                        backgroundColor: stat.color,
                                        padding: '30px',
                                        borderRadius: '20px',
                                        textAlign: 'center',
                                        border: filterStatus === stat.status ? '2px solid var(--primary-color)' : '1px solid #E2E8F0',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                        transform: filterStatus === stat.status ? 'translateY(-5px)' : 'none',
                                        boxShadow: filterStatus === stat.status ? '0 10px 20px rgba(0,0,0,0.1)' : 'none'
                                    }}
                                >
                                    <div style={{ fontSize: '1.2rem', marginBottom: '10px', fontWeight: '600', color: '#64748B' }}>{stat.label}</div>
                                    <div style={{ fontSize: '2.5rem', fontWeight: '800', color: stat.textColor }}>{stat.count}</div>
                                </div>
                            ))}
                        </div>

                        {/* Reports List */}
                        <section style={{
                            backgroundColor: 'white',
                            padding: '40px',
                            borderRadius: '12px',
                            boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
                            minHeight: '550px', // Header + 4 rows + Pagination space
                            display: 'flex',
                            flexDirection: 'column'
                        }}>
                            <h3 style={{ marginBottom: '20px', color: 'var(--primary-color)' }}>
                                {localStorage.getItem('role') === 'AGENCY' ? '담당 민원 목록' : '나의 민원 목록'}
                            </h3>
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead>
                                        <tr style={{ backgroundColor: 'var(--primary-color)', color: 'white' }}>
                                            <th style={{ padding: '15px', whiteSpace: 'nowrap' }}>접수번호</th>
                                            <th style={{ padding: '15px', whiteSpace: 'nowrap' }}>제목</th>
                                            <th style={{ padding: '15px', whiteSpace: 'nowrap' }}>지역</th>
                                            <th style={{ padding: '15px', whiteSpace: 'nowrap' }}>신고일</th>
                                            <th style={{ padding: '15px', whiteSpace: 'nowrap' }}>상태</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {paginatedReports && paginatedReports.length > 0 ? paginatedReports.map((report) => (
                                            <tr
                                                key={report.complaintNo}
                                                style={{
                                                    textAlign: 'center',
                                                    borderBottom: '1px solid #EEE',
                                                    cursor: 'pointer',
                                                    transition: 'background-color 0.2s'
                                                }}
                                                onClick={() => navigate(`/reports/${report.complaintNo}`)}
                                                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F8FAFC')}
                                                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                                            >
                                                <td style={{ padding: '18px', whiteSpace: 'nowrap' }}>{report.complaintNo}</td>
                                                <td style={{
                                                    padding: '18px',
                                                    textAlign: 'left',
                                                    fontWeight: '600',
                                                    maxWidth: '250px',
                                                    whiteSpace: 'nowrap',
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis'
                                                }} title={report.title}>
                                                    {report.title}
                                                </td>
                                                <td style={{
                                                    padding: '18px',
                                                    maxWidth: '200px',
                                                    whiteSpace: 'nowrap',
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis'
                                                }} title={report.address}>
                                                    {report.address}
                                                </td>
                                                <td style={{ padding: '18px', whiteSpace: 'nowrap' }}>{new Date(report.createdDate).toLocaleDateString()}</td>
                                                <td style={{
                                                    padding: '18px',
                                                    color: report.status === 'IN_PROGRESS' ? '#EF4444' : (report.status === 'COMPLETED' ? '#16A34A' : '#2563EB'),
                                                    fontWeight: 'bold',
                                                    whiteSpace: 'nowrap'
                                                }}>
                                                    {getStatusText(report.status)}
                                                </td>
                                            </tr>
                                        )) : (
                                            <tr>
                                                <td colSpan={5} style={{ padding: '40px', textAlign: 'center', color: '#AAA' }}>내역이 없습니다.</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* [추가] 민원이 적을 때 빈 공간 유지 */}
                            <div style={{ flex: 1 }}></div>

                            {/* [추가] 페이지네이션 UI */}
                            {totalPages > 1 && (
                                <div style={{
                                    display: 'flex',
                                    justifyContent: 'center',
                                    gap: '8px',
                                    marginTop: '30px'
                                }}>
                                    <button
                                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                        disabled={currentPage === 1}
                                        style={pageButtonStyle(currentPage === 1)}
                                    >
                                        이전
                                    </button>
                                    {[...Array(totalPages)].map((_, i) => (
                                        <button
                                            key={i + 1}
                                            onClick={() => setCurrentPage(i + 1)}
                                            style={pageNumberButtonStyle(currentPage === i + 1)}
                                        >
                                            {i + 1}
                                        </button>
                                    ))}
                                    <button
                                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                        disabled={currentPage === totalPages}
                                        style={pageButtonStyle(currentPage === totalPages)}
                                    >
                                        다음
                                    </button>
                                </div>
                            )}
                        </section>
                    </main>
                </div>
            </div>

            {/* Modals remain similarly structured but with updated Styles below */}
            {isEditing && (
                <div style={modalOverlayStyle}>
                    <div style={modalContentStyle}>
                        <h3 style={{ marginBottom: '25px', fontWeight: '800', fontSize: '1.5rem' }}>회원 정보 수정</h3>
                        <form onSubmit={handleUpdateProfile} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            <div style={inputGroupStyle}>
                                <label style={inputLabelStyle}>이름</label>
                                <input type="text" value={editData.name} onChange={e => setEditData({ ...editData, name: e.target.value })} required style={inputStyle} />
                            </div>
                            <div style={inputGroupStyle}>
                                <label style={inputLabelStyle}>주소</label>
                                <div style={{ display: 'flex', gap: '10px' }}>
                                    <input
                                        type="text"
                                        value={editData.addr}
                                        readOnly
                                        placeholder="주소 검색 버튼을 눌러주세요"
                                        onClick={handleSearchAddress}
                                        style={{
                                            ...inputStyle,
                                            flex: 1,
                                            cursor: 'pointer',
                                            backgroundColor: '#f8fafc'
                                        }}
                                    />
                                    <button
                                        type="button"
                                        onClick={handleSearchAddress}
                                        style={{
                                            padding: '0 15px',
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
                            <div style={inputGroupStyle}>
                                <label style={inputLabelStyle}>연락처</label>
                                <input
                                    type="tel"
                                    value={editData.phone}
                                    onChange={handlePhoneChange}
                                    placeholder="예: 010-1234-5678"
                                    style={inputStyle}
                                    maxLength={13}
                                />
                            </div>
                            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                                <button type="submit" style={primaryButtonStyle}>저장하기</button>
                                <button type="button" onClick={() => setIsEditing(false)} style={secondaryButtonStyle}>취소</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {isChangingPw && (
                <div style={modalOverlayStyle}>
                    <div style={modalContentStyle}>
                        <h3 style={{ marginBottom: '25px', fontWeight: '800', fontSize: '1.5rem' }}>비밀번호 변경</h3>
                        <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            <div style={inputGroupStyle}>
                                <label style={inputLabelStyle}>현재 비밀번호</label>
                                <input type="password" value={pwData.currentPassword} onChange={e => setPwData({ ...pwData, currentPassword: e.target.value })} required style={inputStyle} />
                            </div>
                            <div style={inputGroupStyle}>
                                <label style={inputLabelStyle}>새 비밀번호</label>
                                <input type="password" value={pwData.newPassword} onChange={e => setPwData({ ...pwData, newPassword: e.target.value })} required style={inputStyle} />
                            </div>
                            <div style={inputGroupStyle}>
                                <label style={inputLabelStyle}>비밀번호 확인</label>
                                <input type="password" value={pwData.confirmPassword} onChange={e => setPwData({ ...pwData, confirmPassword: e.target.value })} required style={inputStyle} />
                            </div>
                            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                                <button type="submit" style={primaryButtonStyle}>변경하기</button>
                                <button type="button" onClick={() => setIsChangingPw(false)} style={secondaryButtonStyle}>취소</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <Modal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={confirmDeleteAccount}
                title="회원 탈퇴 확인"
                confirmText="탈퇴하기"
            >
                <div style={{ textAlign: 'center' }}>
                    <p style={{ color: '#EF4444', fontWeight: 'bold', fontSize: '1.1rem', marginBottom: '10px' }}>
                        정말로 탈퇴하시겠습니까?
                    </p>
                    <p style={{ color: '#64748B' }}>
                        작성하신 모든 데이터가 삭제되며, <br />
                        삭제된 데이터는 복구할 수 없습니다.
                    </p>
                </div>
            </Modal>

            {/* 공통 알림 모달 */}
            <Modal
                isOpen={alertState.isOpen}
                onClose={() => setAlertState(prev => ({ ...prev, isOpen: false }))}
                onConfirm={alertState.onConfirm}
                title={alertState.title}
                confirmText="확인"
            >
                <div style={{ textAlign: 'center', color: '#475569' }}>
                    {alertState.message}
                </div>
            </Modal>
        </div>
    );
}

// Styled Icons and Helpers
const LocationIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
        <circle cx="12" cy="10" r="3"></circle>
    </svg>
);

const PhoneIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
    </svg>
);

// Style Constants
const iconBoxStyle = {
    width: '40px', height: '40px', borderRadius: '12px', backgroundColor: '#F1F5F9',
    display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'var(--primary-color)'
};
const labelStyle = { fontSize: '0.8rem', color: '#94A3B8', fontWeight: '600' };
const valueStyle = { fontSize: '1rem', color: '#1E293B', fontWeight: '500' };
const actionButtonStyle = {
    padding: '12px', borderRadius: '12px', border: '1px solid #E2E8F0', backgroundColor: 'transparent',
    color: '#475569', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s'
};
const modalOverlayStyle: React.CSSProperties = {
    position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
    backgroundColor: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)',
    display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000
};
const modalContentStyle: React.CSSProperties = {
    backgroundColor: 'white', padding: '40px', borderRadius: '24px', width: '450px',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
};
const inputGroupStyle = { display: 'flex', flexDirection: 'column' as const, gap: '8px' };
const inputLabelStyle = { fontSize: '0.9rem', fontWeight: '600', color: '#475569' };
const inputStyle = {
    padding: '12px 16px', borderRadius: '12px', border: '1px solid #E2E8F0', fontSize: '1rem',
    outline: 'none', transition: 'border-color 0.2s', backgroundColor: '#F8FAFC'
};
const primaryButtonStyle = {
    padding: '14px', borderRadius: '12px', backgroundColor: 'var(--primary-color)', color: 'white',
    border: 'none', fontWeight: '700', cursor: 'pointer', flex: 1
};
const secondaryButtonStyle = {
    padding: '14px', borderRadius: '12px', backgroundColor: '#F1F5F9', color: '#475569',
    border: 'none', fontWeight: '700', cursor: 'pointer', flex: 1
};

const pageButtonStyle = (disabled: boolean): React.CSSProperties => ({
    padding: '8px 16px',
    borderRadius: '8px',
    border: '1px solid #E2E8F0',
    backgroundColor: disabled ? '#F8FAFC' : 'white',
    color: disabled ? '#94A3B8' : '#475569',
    fontWeight: '600',
    cursor: disabled ? 'not-allowed' : 'pointer',
    transition: 'all 0.2s'
});

const pageNumberButtonStyle = (active: boolean): React.CSSProperties => ({
    width: '40px',
    height: '40px',
    borderRadius: '8px',
    border: 'none',
    backgroundColor: active ? '#7c3aed' : 'transparent',
    color: active ? 'white' : '#475569',
    fontWeight: '700',
    cursor: 'pointer',
    transition: 'all 0.2s'
});

export default MyPage;

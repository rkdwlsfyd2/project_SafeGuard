import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { complaintsAPI } from '../utils/api';
import StatusBadge from '../components/StatusBadge';
import Modal from '../components/common/Modal';

function List() {
    const [searchParams, setSearchParams] = useSearchParams();
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        if (location.state?.fromSubmission) {
            window.scrollTo(0, 0);
        }
    }, [location]);

    // URL 파라미터에서 초기값 읽기
    const page = parseInt(searchParams.get('page') || '1');
    const search = searchParams.get('search') || '';
    const category = searchParams.get('category') || '전체';
    const sort = searchParams.get('sort') || 'created_date'; // Default to created_date for 'recent'
    const order = searchParams.get('order') || 'DESC'; // Default to DESC
    const statusParams = searchParams.get('status') || '전체';
    const regionParams = searchParams.get('region') || '전체';
    const myAgencyOnly = searchParams.get('myAgencyOnly') === 'true';

    const [complaints, setComplaints] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [totalPages, setTotalPages] = useState(1);

    // 검색 입력값 관리를 위한 로컬 상태
    const [searchInput, setSearchInput] = useState(search);

    // 모달 상태
    const [modalConfig, setModalConfig] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        callback?: () => void;
        onConfirm?: () => void;
        confirmText?: string;
        cancelText?: string;
    }>({
        isOpen: false,
        title: '',
        message: '',
    });

    const showAlert = (title: string, message: string, callback?: () => void) => {
        setModalConfig({
            isOpen: true,
            title,
            message,
            callback,
            onConfirm: undefined,
            cancelText: undefined,
            confirmText: '확인'
        });
    };

    const showConfirm = (title: string, message: string, onConfirm: () => void) => {
        setModalConfig({
            isOpen: true,
            title,
            message,
            onConfirm,
            confirmText: '확인',
            cancelText: '취소'
        });
    };

    const closeModal = () => {
        setModalConfig(prev => ({ ...prev, isOpen: false }));
        if (modalConfig.callback) {
            modalConfig.callback();
        }
    };

    useEffect(() => {
        fetchComplaints();
    }, [page, search, category, statusParams, regionParams, sort, order, myAgencyOnly]);

    const fetchComplaints = async () => {
        setLoading(true);
        try {
            // Detect admin mode from URL
            const isAdminPath = window.location.pathname.startsWith('/admin');
            const role = localStorage.getItem('role');
            const agencyNo = localStorage.getItem('agencyNo');

            const params: any = {
                page,
                limit: 10,
                search,
                category,
                status: statusParams,
                sort,
                order,
                adminMode: isAdminPath, // Send adminMode flag to backend
                myAgencyOnly // Add implicit check
            };

            if (regionParams && regionParams !== '전체') {
                params.region = regionParams;
            }

            // If we are in admin view and user is AGENCY, provide agencyNo for security validation (though backend will enforce)
            if (isAdminPath && role === 'AGENCY' && agencyNo) {
                params.agencyNo = agencyNo;
            }

            const data = await complaintsAPI.getList(params);
            setComplaints(data.complaints);
            setTotalPages(data.pagination.totalPages);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // Fix handleSearch
    const handleSearch = () => {
        setSearchParams({ page: '1', search: searchInput, category, status: statusParams, region: regionParams, sort, order, myAgencyOnly: String(myAgencyOnly) });
    };

    const handleCategoryChange = (e: any) => {
        setSearchParams({ page: '1', search, category: e.target.value, status: statusParams, region: regionParams, sort, order, myAgencyOnly: String(myAgencyOnly) });
    };

    const handleStatusChange = (e: any) => {
        setSearchParams({ page: '1', search, category, status: e.target.value, region: regionParams, sort, order, myAgencyOnly: String(myAgencyOnly) });
    };

    const handleRegionChange = (e: any) => {
        setSearchParams({ page: '1', search, category, status: statusParams, region: e.target.value, sort, order, myAgencyOnly: String(myAgencyOnly) });
    };

    const handleSortChange = (e: any) => {
        const val = e.target.value;
        let newSort = 'created_date';
        let newOrder = 'DESC';

        if (val === 'old') {
            newOrder = 'ASC';
        } else if (val === 'likes') {
            newSort = 'likeCount';
        }

        setSearchParams({ page: '1', search, category, status: statusParams, region: regionParams, sort: newSort, order: newOrder, myAgencyOnly: String(myAgencyOnly) });
    };

    const setPage = (newPage: number) => {
        setSearchParams({ page: String(newPage), search, category, status: statusParams, region: regionParams, sort, order, myAgencyOnly: String(myAgencyOnly) });
    };

    const downloadExcel = async () => {
        try {
            // Detect admin mode from URL
            const isAdminPath = window.location.pathname.startsWith('/admin');
            const role = localStorage.getItem('role');
            const agencyNo = localStorage.getItem('agencyNo');

            // 엑셀 다운로드용 파라미터 (현재 필터 조건 유지, limit은 전체 조회용으로 크게 설정)
            const params: any = {
                page: 1,
                limit: 1000000,
                search,
                category,
                status: statusParams,
                sort,
                order,
                adminMode: isAdminPath,
                myAgencyOnly
            };

            if (regionParams && regionParams !== '전체') {
                params.region = regionParams;
            }

            if (isAdminPath && role === 'AGENCY' && agencyNo) {
                params.agencyNo = agencyNo;
            }

            const data = await complaintsAPI.getList(params);
            const allComplaints = data.complaints;

            if (!allComplaints || allComplaints.length === 0) {
                alert('데이터가 없습니다.');
                return;
            }

            // CSV Header
            const headers = ['민원번호', '제목', '카테고리', '지역', '상태', '작성일', '좋아요'];
            const rows = allComplaints.map((c: any) => [
                c.complaintNo,
                `"${c.title.replace(/"/g, '""')}"`, // Escape quotes
                c.category,
                c.regionName || '-',
                c.status,
                formatDate(c.createdDate),
                c.likeCount
            ]);

            const csvContent = [
                headers.join(','),
                ...rows.map((row: any[]) => row.join(','))
            ].join('\n');

            // Add BOM for Excel UTF-8 compatibility
            const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `complaints_export_${new Date().toISOString().slice(0, 10)}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (err: any) {
            alert('엑셀 다운로드 중 오류가 발생했습니다: ' + err.message);
        }
    };

    const handleDelete = async (e: React.MouseEvent, complaintNo: number) => {
        e.stopPropagation(); // Prevent row click navigation

        showConfirm('삭제 확인', '정말 이 민원을 삭제하시겠습니까?\n삭제된 민원은 복구할 수 없습니다.', async () => {
            try {
                await complaintsAPI.delete(complaintNo);
                showAlert('알림', '삭제가 완료되었습니다.', fetchComplaints);
            } catch (err: any) {
                showAlert('오류', err.message || '삭제 중 오류가 발생했습니다.');
            }
        });
    };



    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('ko-KR', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        });
    };

    return (
        <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', padding: '40px 20px' }}>
            <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
                {/* 페이지 헤더 */}
                <div style={{
                    backgroundColor: 'white',
                    borderRadius: '20px',
                    padding: '30px 40px',
                    marginBottom: '24px',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.08)'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <h1 style={{ fontSize: '2rem', fontWeight: '800', color: '#1e293b', margin: 0 }}>
                                📋 민원 목록
                            </h1>
                            <p style={{ color: '#64748b', marginTop: '8px' }}>등록된 민원 현황을 확인하세요</p>
                        </div>
                        {localStorage.getItem('role') !== 'AGENCY' && (
                            <button
                                onClick={() => navigate('/')}
                                style={{
                                    padding: '14px 28px',
                                    background: 'linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '12px',
                                    fontSize: '1rem',
                                    fontWeight: '600',
                                    cursor: 'pointer',
                                    boxShadow: '0 4px 14px rgba(124, 58, 237, 0.4)'
                                }}
                            >
                                ➕ 새 민원 등록
                            </button>
                        )}
                        {localStorage.getItem('role') === 'AGENCY' && (
                            <button
                                onClick={downloadExcel}
                                style={{
                                    marginLeft: '10px',
                                    padding: '14px 28px',
                                    backgroundColor: '#10b981',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '12px',
                                    fontSize: '1rem',
                                    fontWeight: '600',
                                    cursor: 'pointer',
                                    boxShadow: '0 4px 14px rgba(16, 185, 129, 0.4)'
                                }}
                            >
                                📊 엑셀 다운로드
                            </button>
                        )}
                    </div>

                    <div style={{
                        display: 'flex',
                        gap: '12px',
                        marginTop: '24px',
                        padding: '20px',
                        backgroundColor: '#f8fafc',
                        borderRadius: '12px',
                        alignItems: 'center'
                    }}>
                        <select
                            value={regionParams}
                            onChange={handleRegionChange}
                            style={{
                                padding: '12px 16px',
                                border: '2px solid #e2e8f0',
                                borderRadius: '10px',
                                fontSize: '0.95rem',
                                backgroundColor: 'white',
                                cursor: 'pointer'
                            }}
                        >
                            {[
                                { label: '지역', value: '전체' },
                                { label: '서울', value: '11' },
                                { label: '부산', value: '26' },
                                { label: '대구', value: '27' },
                                { label: '인천', value: '28' },
                                { label: '광주', value: '29' },
                                { label: '대전', value: '30' },
                                { label: '울산', value: '31' },
                                { label: '세종', value: '50' },
                                { label: '경기', value: '41' },
                                { label: '강원', value: '42' },
                                { label: '충북', value: '43' },
                                { label: '충남', value: '44' },
                                { label: '전북', value: '45' },
                                { label: '전남', value: '46' },
                                { label: '경북', value: '47' },
                                { label: '경남', value: '48' },
                                { label: '제주', value: '49' }
                            ].map(r => (
                                <option key={r.value} value={r.value}>
                                    {r.label}
                                </option>
                            ))}
                        </select>
                        <select
                            value={category}
                            onChange={handleCategoryChange}
                            style={{
                                padding: '12px 16px',
                                border: '2px solid #e2e8f0',
                                borderRadius: '10px',
                                fontSize: '0.95rem',
                                backgroundColor: 'white',
                                cursor: 'pointer'
                            }}

                        >
                            {['전체', '교통', '행정·안전', '도로', '산업·통상', '주택·건축', '교육', '경찰·검찰', '환경', '보건', '관광', '기타'].map(cat => (
                                <option key={cat} value={cat}>{cat === '전체' ? '민원유형' : cat}</option>
                            ))}
                        </select>
                        <select
                            value={statusParams}
                            onChange={handleStatusChange}
                            style={{
                                padding: '12px 16px',
                                border: '2px solid #e2e8f0',
                                borderRadius: '10px',
                                fontSize: '0.95rem',
                                backgroundColor: 'white',
                                cursor: 'pointer'
                            }}
                        >
                            {['전체', '미처리', '처리중', '처리완료'].map(s => (
                                <option key={s} value={s === '전체' ? '전체' : (s === '미처리' ? 'UNPROCESSED' : (s === '처리중' ? 'IN_PROGRESS' : 'COMPLETED'))}>
                                    {s === '전체' ? '접수상태' : s}
                                </option>
                            ))}
                        </select>

                        {localStorage.getItem('role') === 'AGENCY' && (
                            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.9rem', fontWeight: '600', color: '#475569', cursor: 'pointer', padding: '0 8px' }}>
                                <input
                                    type="checkbox"
                                    checked={searchParams.get('myAgencyOnly') === 'true'}
                                    onChange={(e) => {
                                        const isChecked = e.target.checked;
                                        setSearchParams({
                                            page: '1',
                                            search,
                                            category,
                                            status: statusParams,
                                            region: regionParams,
                                            sort,
                                            order,
                                            myAgencyOnly: isChecked ? 'true' : 'false'
                                        });
                                    }}
                                    style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                                />
                                내 담당민원
                            </label>
                        )}
                        <input
                            type="text"
                            value={searchInput}
                            onChange={(e) => setSearchInput(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                            placeholder="🔍 제목 또는 내용으로 검색"
                            style={{
                                flex: 1,
                                padding: '12px 18px',
                                border: '2px solid #e2e8f0',
                                borderRadius: '10px',
                                fontSize: '0.95rem',
                                outline: 'none'
                            }}
                        />
                        <button
                            onClick={handleSearch}
                            style={{
                                padding: '12px 24px',
                                backgroundColor: '#1e293b',
                                color: 'white',
                                border: 'none',
                                borderRadius: '10px',
                                fontWeight: '600',
                                cursor: 'pointer'
                            }}
                        >
                            검색
                        </button>

                        <div style={{ width: '2px', height: '30px', backgroundColor: '#e2e8f0', margin: '0 8px' }}></div>

                        <select
                            value={sort === 'likeCount' ? 'likes' : (sort === 'complaint_no' ? (order === 'ASC' ? 'id_asc' : 'id_desc') : (order === 'ASC' ? 'old' : 'recent'))}
                            onChange={handleSortChange}
                            style={{
                                padding: '12px 16px',
                                border: '2px solid #e2e8f0',
                                borderRadius: '10px',
                                fontSize: '0.95rem',
                                backgroundColor: 'white',
                                cursor: 'pointer'
                            }}
                        >
                            <option value="recent">최신순</option>
                            <option value="old">과거순</option>
                            <option value="likes">좋아요순</option>
                        </select>
                    </div>
                </div>

                {/* 민원 목록 */}
                <div style={{
                    backgroundColor: 'white',
                    borderRadius: '20px',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                    overflow: 'hidden'
                }}>
                    {loading ? (
                        <div style={{ textAlign: 'center', padding: '80px 20px' }}>
                            <div style={{
                                width: '50px',
                                height: '50px',
                                border: '4px solid #e2e8f0',
                                borderTop: '4px solid #7c3aed',
                                borderRadius: '50%',
                                margin: '0 auto 20px',
                                animation: 'spin 1s linear infinite'
                            }}></div>
                            <p style={{ color: '#64748b' }}>불러오는 중...</p>
                            <style>{`@keyframes spin { to { transform: rotate(360deg); }}`}</style>
                        </div>
                    ) : error ? (
                        <div style={{ textAlign: 'center', padding: '80px 20px', color: '#dc2626' }}>{error}</div>
                    ) : complaints.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '80px 20px' }}>
                            <div style={{ fontSize: '4rem', marginBottom: '16px' }}>📭</div>
                            <p style={{ color: '#64748b', fontWeight: '500' }}>등록된 민원이 없습니다</p>
                            <button
                                onClick={() => navigate('/apply-image')}
                                style={{
                                    marginTop: '20px',
                                    padding: '12px 24px',
                                    background: 'linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '10px',
                                    fontWeight: '600',
                                    cursor: 'pointer'
                                }}
                            >
                                첫 민원 등록하기
                            </button>
                        </div>
                    ) : (
                        <>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ backgroundColor: '#f8fafc' }}>
                                        {['번호', '분류', '제목', '지역', '상태', '등록일', '좋아요'].map(h => (
                                            <th key={h} style={{
                                                padding: '16px 20px',
                                                textAlign: 'left',
                                                fontSize: '0.85rem',
                                                fontWeight: '700',
                                                color: '#64748b',
                                                borderBottom: '2px solid #e2e8f0'
                                            }}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {complaints.map((c) => (
                                        <tr
                                            key={c.complaintNo}
                                            onClick={() => navigate(`/reports/${c.complaintNo}`, { state: { searchParams: searchParams.toString() } })}
                                            style={{
                                                cursor: 'pointer',
                                                transition: 'background-color 0.2s'
                                            }}
                                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                        >
                                            <td style={{ padding: '18px 20px', color: '#94a3b8', borderBottom: '1px solid #f1f5f9' }}>{c.seqNo || c.complaintNo}</td>
                                            <td style={{ padding: '18px 20px', borderBottom: '1px solid #f1f5f9' }}>
                                                <span style={{
                                                    padding: '4px 10px',
                                                    backgroundColor: '#f1f5f9',
                                                    borderRadius: '6px',
                                                    fontSize: '0.85rem',
                                                    color: '#64748b'
                                                }}>{c.category}</span>
                                            </td>
                                            <td style={{ padding: '18px 20px', fontWeight: '600', color: '#1e293b', borderBottom: '1px solid #f1f5f9' }}>
                                                {c.title}
                                                {!c.isPublic && <span style={{ marginLeft: '8px', fontSize: '0.8rem' }}>🔒</span>}
                                            </td>
                                            <td style={{ padding: '18px 20px', borderBottom: '1px solid #f1f5f9' }}>
                                                <span
                                                    onClick={() => {
                                                        if (c.regionCode) {
                                                            navigate(`/list?region=${c.regionCode}`);
                                                        }
                                                    }}
                                                    style={{
                                                        padding: '4px 10px',
                                                        backgroundColor: c.regionName ? '#e0f2fe' : 'transparent',
                                                        borderRadius: '6px',
                                                        fontSize: '0.8rem',
                                                        color: c.regionName ? '#0369a1' : '#94a3b8',
                                                        cursor: c.regionCode ? 'pointer' : 'default'
                                                    }}>{c.regionName || ''}</span>
                                            </td>
                                            <td style={{ padding: '18px 20px', borderBottom: '1px solid #f1f5f9' }}>
                                                <StatusBadge status={c.status} size="small" />
                                            </td>
                                            <td style={{ padding: '18px 20px', color: '#94a3b8', fontSize: '0.9rem', borderBottom: '1px solid #f1f5f9' }}>{formatDate(c.createdDate)}</td>
                                            <td style={{ padding: '18px 20px', borderBottom: '1px solid #f1f5f9' }}>
                                                <span style={{ color: '#ef4444', fontWeight: '600' }}>❤️ {c.likeCount}</span>
                                                {localStorage.getItem('role') === 'AGENCY' && String(c.agencyNo) === String(localStorage.getItem('agencyNo')) && (
                                                    <button
                                                        onClick={(e) => handleDelete(e, c.complaintNo)}
                                                        style={{
                                                            marginLeft: '10px',
                                                            padding: '4px 8px',
                                                            backgroundColor: '#fee2e2',
                                                            color: '#dc2626',
                                                            border: 'none',
                                                            borderRadius: '6px',
                                                            fontSize: '0.8rem',
                                                            cursor: 'pointer'
                                                        }}
                                                    >
                                                        삭제
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>

                            {/* 페이지네이션 */}
                            {totalPages > 1 && (
                                <div style={{
                                    display: 'flex',
                                    justifyContent: 'center',
                                    gap: '8px',
                                    padding: '24px'
                                }}>
                                    <button
                                        onClick={() => setPage(1)}
                                        disabled={page === 1}
                                        style={{
                                            padding: '10px 14px',
                                            borderRadius: '8px',
                                            border: 'none',
                                            backgroundColor: '#f1f5f9',
                                            color: '#64748b',
                                            cursor: page === 1 ? 'not-allowed' : 'pointer',
                                            opacity: page === 1 ? 0.5 : 1
                                        }}
                                    >⏪</button>
                                    {/* 현재 페이지 그룹 계산 (5개씩 표시) */}
                                    {(() => {
                                        const groupSize = 5;
                                        const currentGroup = Math.ceil(page / groupSize);
                                        const startPage = (currentGroup - 1) * groupSize + 1;
                                        const endPage = Math.min(startPage + groupSize - 1, totalPages);

                                        return [...Array(endPage - startPage + 1)].map((_, i) => {
                                            const pageNum = startPage + i;
                                            return (
                                                <button
                                                    key={pageNum}
                                                    onClick={() => setPage(pageNum)}
                                                    style={{
                                                        width: '40px',
                                                        height: '40px',
                                                        borderRadius: '10px',
                                                        border: 'none',
                                                        backgroundColor: page === pageNum ? '#7c3aed' : '#f1f5f9',
                                                        color: page === pageNum ? 'white' : '#64748b',
                                                        fontWeight: '600',
                                                        cursor: 'pointer'
                                                    }}
                                                >{pageNum}</button>
                                            );
                                        });
                                    })()}
                                    <button
                                        onClick={() => setPage(Math.min(totalPages, page + 1))}
                                        disabled={page === totalPages}
                                        style={{
                                            padding: '10px 14px',
                                            borderRadius: '8px',
                                            border: 'none',
                                            backgroundColor: '#f1f5f9',
                                            color: '#64748b',
                                            cursor: page === totalPages ? 'not-allowed' : 'pointer',
                                            opacity: page === totalPages ? 0.5 : 1
                                        }}
                                    >⏩</button>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
            {/* 공통 모달 적용 */}
            <Modal
                isOpen={modalConfig.isOpen}
                onClose={closeModal}
                title={modalConfig.title}
                onConfirm={modalConfig.onConfirm}
                confirmText={modalConfig.confirmText}
                cancelText={modalConfig.cancelText}
            >
                {modalConfig.message}
            </Modal>
        </div >
    );
}

export default List;

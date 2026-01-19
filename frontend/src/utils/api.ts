/**
 * 프론트엔드에서 백엔드 API와 통신하기 위한 유틸리티 함수들입니다.
 * (한글 기능 설명: 인증, 민원 관리, 통계, AI 분석 및 STT 연동 포함)
 */
const API_BASE = '/api';

/**
 * 로컬 스토리지에 저장된 인증 토큰을 관리하는 함수들
 */
export const getToken = (): string | null => localStorage.getItem('token');
export const setToken = (token: string): void => localStorage.setItem('token', token);
export const removeToken = (): void => localStorage.removeItem('token');

/**
 * 공통 API 요청 헬퍼 (fetch API 기반)
 */
const apiRequest = async (endpoint: string, options: RequestInit = {}): Promise<any> => {
    const token = getToken();
    const isFormData = options.body instanceof FormData;

    const headers: HeadersInit = {
        ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
        ...(options.headers as any),
    };

    if (token) {
        (headers as any)['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers,
    });

    const text = await response.text();
    let data: any;

    try {
        data = text ? JSON.parse(text) : {};
    } catch (e) {
        console.error('JSON 파싱 오류:', e);
        if (!response.ok) {
            throw new Error(text || '네트워크 응답이 정상적이지 않습니다.');
        }
        return { message: text };
    }

    if (!response.ok) {
        throw new Error(
            data.error ||
            data.message ||
            data.detail ||
            '요청 처리 중 오류가 발생했습니다.'
        );
    }

    return data;
};

/**
 * 인증(로그인, 회원가입 등) 관련 API
 */
export const authAPI = {
    register: (userData: any) => apiRequest('/auth/signup', {
        method: 'POST',
        body: JSON.stringify(userData),
    }),

    checkIdDuplicate: (userId: string) => apiRequest(`/auth/check-id?userId=${userId}`),

    login: async (credentials: any) => {
        const data = await apiRequest('/auth/login', {
            method: 'POST',
            body: JSON.stringify(credentials),
        });

        if (data.token) {
            setToken(data.token);
            if (data.user) {
                localStorage.setItem('role', data.user.role);
                localStorage.setItem('userId', data.user.userId);
                if (data.user.agencyNo) {
                    localStorage.setItem('agencyNo', data.user.agencyNo);
                } else {
                    localStorage.removeItem('agencyNo');
                }
                if (data.user.agencyName) {
                    localStorage.setItem('agencyName', data.user.agencyName);
                } else {
                    localStorage.removeItem('agencyName');
                }
            }
        }

        return data;
    },

    findId: (data: any) => apiRequest('/auth/find-id', {
        method: 'POST',
        body: JSON.stringify(data),
    }),

    verifyReset: (data: any) => apiRequest('/auth/verify-reset', {
        method: 'POST',
        body: JSON.stringify(data),
    }),

    updatePassword: (data: any) => apiRequest('/auth/update-password', {
        method: 'POST',
        body: JSON.stringify(data),
    }),

    logout: () => {
        removeToken();
        localStorage.removeItem('role');
        localStorage.removeItem('userId');
        localStorage.removeItem('agencyNo');
    },

    getMe: () => apiRequest('/auth/me'),
};

/**
 * 민원(Complaints) 처리 관련 API
 */
export const complaintsAPI = {
    // 민원 목록 조회 (검색 및 필터링 가능)
    getList: (params: any = {}) => {
        const query = new URLSearchParams(params).toString();
        return apiRequest(`/complaints${query ? `?${query}` : ''}`);
    },

    // 특정 민원 상세 조회
    getDetail: (id: string | number) => apiRequest(`/complaints/${id}`),

    // 새 민원 게시글 작성
    create: (complaintData: any) => {
        const isFormData = complaintData instanceof FormData;
        return apiRequest('/complaints', {
            method: 'POST',
            body: isFormData ? complaintData : JSON.stringify(complaintData),
        });
    },

    // 민원 정보 수정
    update: (id: string | number, complaintData: any) => apiRequest(`/complaints/${id}`, {
        method: 'PUT',
        body: JSON.stringify(complaintData),
    }),

    // 민원 삭제
    delete: (id: string | number) => apiRequest(`/complaints/${id}`, {
        method: 'DELETE',
    }),

    /**
     * 좋아요/싫어요 반응 토글 (권장)
     * - 백엔드: POST /api/complaints/{id}/reaction
     * - body: { type: "LIKE" | "DISLIKE" }
     */
    toggleReaction: (id: string | number, type: 'LIKE' | 'DISLIKE') =>
        apiRequest(`/complaints/${id}/reaction`, {
            method: 'POST',
            body: JSON.stringify({ type }),
        }),

    /**
     * (호환용) 예전 좋아요 토글
     * - 백엔드에 /{id}/like 를 남겨둔 경우에만 사용
     * - 컨트롤러에서 toggleReaction(type=LIKE)로 위임하도록 구성 권장
     */
    toggleLike: (id: string | number) =>
        apiRequest(`/complaints/${id}/like`, {
            method: 'POST',
            body: JSON.stringify({ type: 'LIKE' }),
        }),

    /**
     * 대시보드 통계 데이터 가져오기
     * - 주의: 백엔드에서 /complaints/stats 가 2개였던 경우,
     *   현재 컨트롤러 기준으로
     *   1) 요약: /complaints/stats
     *   2) 고도화(Map): /complaints/stats/dashboard
     *   로 분리된 상태를 가정합니다.
     */
    getStats: (category?: string) => {
        const query = category ? `?category=${encodeURIComponent(category)}` : '';
        return apiRequest(`/complaints/stats${query}`);
    },

    /**
     * (고도화 통계) 대시보드 Map 형태 통계
     * - 백엔드: GET /api/complaints/stats/dashboard?category=...
     */
    getDashboardStats: (params: any = {}) => {
        const query = new URLSearchParams(params).toString();
        return apiRequest(`/complaints/stats/dashboard${query ? `?${query}` : ''}`);
    },

    // 내가 쓴 민원 목록 가져오기
    getMyComplaints: () => apiRequest('/complaints/mypage'),

    /**
     * GIS 지도 관련 데이터 (마커 및 핫스팟 등)
     */
    getMapItems: (params: any) => {
        const filtered: Record<string, any> = {};
        Object.keys(params).forEach(key => {
            if (params[key] !== null && params[key] !== undefined) {
                filtered[key] = params[key];
            }
        });
        const query = new URLSearchParams(filtered).toString();
        return apiRequest(`/gis/map-items${query ? `?${query}` : ''}`);
    },

    getComplaints: (params: any) => {
        const filtered: Record<string, any> = {};
        Object.keys(params).forEach(key => {
            if (params[key] !== null && params[key] !== undefined) {
                filtered[key] = params[key];
            }
        });
        const query = new URLSearchParams(filtered).toString();
        return apiRequest(`/gis/complaints${query ? `?${query}` : ''}`);
    },

    getHotspots: (params: any) => {
        const filtered: Record<string, any> = {};
        Object.keys(params).forEach(key => {
            if (params[key] !== null && params[key] !== undefined) {
                filtered[key] = params[key];
            }
        });
        const query = new URLSearchParams(filtered).toString();
        return apiRequest(`/gis/hotspots${query ? `?${query}` : ''}`);
    },

    getDistrictCounts: (params: any) => {
        const filtered: Record<string, any> = {};
        Object.keys(params).forEach(key => {
            if (params[key] !== null && params[key] !== undefined) {
                filtered[key] = params[key];
            }
        });
        const query = new URLSearchParams(filtered).toString();
        return apiRequest(`/gis/districts${query ? `?${query}` : ''}`);
    },

    // 관리자: 민원 처리 상태 변경
    updateStatus: (id: string | number, status: string) => apiRequest(`/complaints/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
    }),

    // 관리자: 답변 텍스트 업데이트
    updateAnswer: (id: string | number, answer: string) => apiRequest(`/complaints/${id}/answer`, {
        method: 'PATCH',
        body: JSON.stringify({ answer }),
    }),

    // 이미지 단독 업로드 (경로 반환)
    uploadImage: async (file: File) => {
        const formData = new FormData();
        formData.append('image', file);

        const token = getToken();
        const headers: HeadersInit = {};
        if (token) (headers as any)['Authorization'] = `Bearer ${token}`;

        const response = await fetch(`${API_BASE}/complaints/images`, {
            method: 'POST',
            body: formData,
            headers
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.message || '이미지 업로드 오류');
        return data;
    },
};

/**
 * 회원(User) 프로필 및 정보 관리 API
 */
export const usersAPI = {
    getMe: () => apiRequest('/users/me'),
    updateProfile: (data: any) => apiRequest('/users/me/profile', {
        method: 'PATCH',
        body: JSON.stringify(data),
    }),
    updatePassword: (data: any) => apiRequest('/users/me/password', {
        method: 'PATCH',
        body: JSON.stringify(data),
    }),
    deleteAccount: () => apiRequest('/users/me', {
        method: 'DELETE',
    }),
};

/**
 * 관계 기관(Agencies) 관련 API
 */
export const agenciesAPI = {
    getList: (type?: string) => apiRequest(`/agencies${type ? `?type=${type}` : ''}`),
    getDetail: (id: string | number) => apiRequest(`/agencies/${id}`),
    getComplaints: (id: string | number, params: any = {}) => {
        const query = new URLSearchParams(params).toString();
        return apiRequest(`/agencies/${id}/complaints${query ? `?${query}` : ''}`);
    },
};

/**
 * AI 텍스트 분석 및 자동 분류 (RAG 연동) API
 */
export const analyzeText = async (text: string) => {
    return apiRequest('/rag/analyze', {
        method: 'POST',
        body: JSON.stringify({ text }),
    });
};



// Image Analysis API (Back-end Proxy)
/**
 * AI 이미지 분석 및 객체 인식 API
 */
export const analyzeImage = async (file: File) => {
    const formData = new FormData();
    formData.append('image', file);

    const response = await fetch(`${API_BASE}/yolo/analyze`, {
        method: 'POST',
        body: formData,
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.message || 'AI 분석 중 오류가 발생했습니다.');
    }

    return data;
};

/**
 * 음성 인식(STT) 관련 API
 */
export const sttAPI = {
    transcribe: async (audioBlob: Blob, text?: string) => {
        const formData = new FormData();
        formData.append('file', audioBlob, 'record.wav');
        if (text) formData.append('text', text);

        const token = getToken();
        const headers: HeadersInit = {};
        if (token) (headers as any)['Authorization'] = `Bearer ${token}`;

        const response = await fetch(`${API_BASE}/stt/upload_voice`, {
            method: 'POST',
            body: formData,
            headers
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.message || '음성 인식 실패');
        return data;
    }
};

export default {
    auth: authAPI,
    complaints: complaintsAPI,
    agencies: agenciesAPI,
    users: usersAPI,
    analyzeImage,
    analyzeText,

    stt: sttAPI
};

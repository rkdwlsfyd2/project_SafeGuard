// 프론트엔드에서 사용할 API 유틸리티
const API_BASE = '/api';

// 토큰 저장/조회
export const getToken = (): string | null => localStorage.getItem('token');
export const setToken = (token: string): void => localStorage.setItem('token', token);
export const removeToken = (): void => localStorage.removeItem('token');

// API 요청 헬퍼
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
    let data;
    try {
        data = text ? JSON.parse(text) : {};
    } catch (e) {
        console.error('JSON Parse Error:', e);
        // JSON 파싱 실패 시, 텍스트가 있다면 에러 메시지로 사용
        if (!response.ok) {
            throw new Error(text || 'Network response was not ok');
        }
        return { message: text }; // 성공인데 JSON이 아닌 경우 (거의 없음)
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

// Auth API
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

// Complaints API
export const complaintsAPI = {
    getList: (params: any = {}) => {
        const query = new URLSearchParams(params).toString();
        return apiRequest(`/complaints${query ? `?${query}` : ''}`);
    },

    getDetail: (id: string | number) => apiRequest(`/complaints/${id}`),

    create: (complaintData: any) => {
        const isFormData = complaintData instanceof FormData;
        return apiRequest('/complaints', {
            method: 'POST',
            body: isFormData ? complaintData : JSON.stringify(complaintData),
        });
    },

    update: (id: string | number, complaintData: any) => apiRequest(`/complaints/${id}`, {
        method: 'PUT',
        body: JSON.stringify(complaintData),
    }),

    delete: (id: string | number) => apiRequest(`/complaints/${id}`, {
        method: 'DELETE',
    }),

    toggleLike: (id: string | number) => apiRequest(`/complaints/${id}/like`, {
        method: 'POST',
    }),

    /** ✅ Dashboard에서 호출하는데 없어서 터지던 함수 */
    getStats: () => apiRequest('/complaints/stats'),

    getMyComplaints: () => apiRequest('/complaints/mypage'),

    // GIS
    getMapItems: (params: any) => {
        const query = new URLSearchParams(params).toString();
        return apiRequest(`/gis/map-items${query ? `?${query}` : ''}`);
    },

    getComplaints: (params: any) => {
        const query = new URLSearchParams(params).toString();
        return apiRequest(`/gis/complaints${query ? `?${query}` : ''}`);
    },

    updateStatus: (id: string | number, status: string) => apiRequest(`/complaints/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
    }),

    updateAnswer: (id: string | number, answer: string) => apiRequest(`/complaints/${id}/answer`, {
        method: 'PATCH',
        body: JSON.stringify({ answer }),
    }),

    uploadImage: async (file: File) => {
        const formData = new FormData();
        formData.append('image', file);

        const token = getToken();
        const headers: HeadersInit = {};
        if (token) {
            (headers as any)['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(`${API_BASE}/complaints/images`, {
            method: 'POST',
            body: formData,
            headers
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message || '이미지 업로드 중 오류가 발생했습니다.');
        }
        return data; // { imagePath: '...' } 형태 기대
    },
};

/**
 * 회원 정보 관리 관련 API
 */
export const usersAPI = {
    // 내 프로필 정보 조회
    getMe: () => apiRequest('/users/me'),

    // 프로필 정보 수정
    updateProfile: (data: any) => apiRequest('/users/me/profile', {
        method: 'PATCH',
        body: JSON.stringify(data),
    }),

    // 비밀번호 수정
    updatePassword: (data: any) => apiRequest('/users/me/password', {
        method: 'PATCH',
        body: JSON.stringify(data),
    }),

    // 회원 탈퇴
    deleteAccount: () => apiRequest('/users/me', {
        method: 'DELETE',
    }),
};

// Agencies API
export const agenciesAPI = {
    getList: (type?: string) => apiRequest(`/agencies${type ? `?type=${type}` : ''}`),
    getDetail: (id: string | number) => apiRequest(`/agencies/${id}`),
    getComplaints: (id: string | number, params: any = {}) => {
        const query = new URLSearchParams(params).toString();
        return apiRequest(`/agencies/${id}/complaints${query ? `?${query}` : ''}`);
    },
};

// Text Analysis API
export const analyzeText = async (text: string) => {
    return apiRequest('/rag/analyze', {
        method: 'POST',
        body: JSON.stringify({ text }),
    });
};

// Title Generation API
export const generateTitle = async (text: string, address: string, type: string) => {
    const response = await fetch('http://localhost:8001/generate-title', { // Direct call to RAG server for now, or via proxy if setup
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text, address, type }),
    });

    if (!response.ok) {
        throw new Error('Title generation failed');
    }

    return await response.json();
};

// Image Analysis API
export const analyzeImage = async (file: File) => {
    const formData = new FormData();
    formData.append('image', file);

    const response = await fetch(`${API_BASE}/analyze-image`, {
        method: 'POST',
        body: formData,
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.error || 'AI 분석 중 오류가 발생했습니다.');
    }

    return data;
};

// STT API
export const sttAPI = {
    transcribe: async (audioBlob: Blob, text?: string) => {
        const formData = new FormData();
        formData.append('file', audioBlob, 'record.wav');
        if (text) {
            formData.append('text', text);
        }

        const token = getToken();
        const headers: HeadersInit = {};
        if (token) {
            (headers as any)['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(`${API_BASE}/stt/upload_voice`, {
            method: 'POST',
            body: formData,
            headers
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message || '음성 인식 중 오류가 발생했습니다.');
        }
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
    generateTitle,
    stt: sttAPI
};

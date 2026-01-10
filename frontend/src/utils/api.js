// 프론트엔드에서 사용할 API 유틸리티
const API_BASE = '/api';

// 토큰 저장/조회
export const getToken = () => localStorage.getItem('token');
export const setToken = (token) => localStorage.setItem('token', token);
export const removeToken = () => localStorage.removeItem('token');

// API 요청 헬퍼
const apiRequest = async (endpoint, options = {}) => {
    const token = getToken();
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers,
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers,
    });

    const data = await response.json();

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
    register: (userData) => apiRequest('/auth/signup', {
        method: 'POST',
        body: JSON.stringify(userData),
    }),

    login: async (credentials) => {
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

    findId: (data) => apiRequest('/auth/find-id', {
        method: 'POST',
        body: JSON.stringify(data),
    }),

    resetPassword: (data) => apiRequest('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify(data),
    }),

    verifyReset: (data) => apiRequest('/auth/verify-reset', {
        method: 'POST',
        body: JSON.stringify(data),
    }),

    updatePassword: (data) => apiRequest('/auth/update-password', {
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
    getList: (params = {}) => {
        const query = new URLSearchParams(params).toString();
        return apiRequest(`/complaints${query ? `?${query}` : ''}`);
    },

    getDetail: (id) => apiRequest(`/complaints/${id}`),

    create: (complaintData) => apiRequest('/complaints', {
        method: 'POST',
        body: JSON.stringify(complaintData),
    }),

    update: (id, complaintData) => apiRequest(`/complaints/${id}`, {
        method: 'PUT',
        body: JSON.stringify(complaintData),
    }),

    delete: (id) => apiRequest(`/complaints/${id}`, {
        method: 'DELETE',
    }),

    toggleLike: (id) => apiRequest(`/complaints/${id}/like`, {
        method: 'POST',
    }),

    /** ✅ Dashboard에서 호출하는데 없어서 터지던 함수 */
    getStats: () => apiRequest('/complaints/stats'),

    // GIS
    getMapItems: (params) => {
        const query = new URLSearchParams(params).toString();
        return apiRequest(`/gis/map-items${query ? `?${query}` : ''}`);
    },

    getComplaints: (params) => {
        const query = new URLSearchParams(params).toString();
        return apiRequest(`/gis/complaints${query ? `?${query}` : ''}`);
    },
};

// Agencies API
export const agenciesAPI = {
    getList: (type) => apiRequest(`/agencies${type ? `?type=${type}` : ''}`),
    getDetail: (id) => apiRequest(`/agencies/${id}`),
    getComplaints: (id, params = {}) => {
        const query = new URLSearchParams(params).toString();
        return apiRequest(`/agencies/${id}/complaints${query ? `?${query}` : ''}`);
    },
};

// Text Analysis API
export const analyzeText = async (text) => {
    return apiRequest('/rag/analyze', {
        method: 'POST',
        body: JSON.stringify({ text }),
    });
};

// Image Analysis API
export const analyzeImage = async (file) => {
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
    transcribe: async (audioBlob, text) => {
        const formData = new FormData();
        formData.append('file', audioBlob, 'record.wav');
        if (text) {
            formData.append('text', text);
        }

        const response = await fetch(`${API_BASE}/stt/upload_voice`, {
            method: 'POST',
            body: formData,
            headers: {
                'Authorization': getToken() ? `Bearer ${getToken()}` : '',
            }
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
    analyzeImage,
    analyzeText,
    stt: sttAPI
};

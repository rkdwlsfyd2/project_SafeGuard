export interface StatusStyle {
    label: string;
    bg: string;
    color: string;
    border: string;
    icon?: string;
}

export const STATUS_STYLES: Record<string, StatusStyle> = {
    'UNPROCESSED': {
        label: '미처리',
        bg: '#fee2e2',
        color: '#dc2626',
        border: '#fecaca',
        icon: '📥'
    },
    'IN_PROGRESS': {
        label: '처리중',
        bg: '#fef3c7',
        color: '#d97706',
        border: '#fde68a',
        icon: '🛠️'
    },
    'COMPLETED': {
        label: '처리완료',
        bg: '#dcfce7',
        color: '#16a34a',
        border: '#bbf7d0',
        icon: '✅'
    },
    'REJECTED': {
        label: '반려',
        bg: '#f1f5f9',
        color: '#64748b',
        border: '#e2e8f0',
        icon: '🚫'
    },
    'CANCELLED': {
        label: '취소',
        bg: '#f1f5f9',
        color: '#64748b',
        border: '#e2e8f0',
        icon: '↩️'
    }
};

export const getStatusStyle = (status: string): StatusStyle => {
    return STATUS_STYLES[status] || {
        label: status || '미정',
        bg: '#f1f5f9',
        color: '#64748b',
        border: '#e2e8f0',
        icon: ''
    };
};

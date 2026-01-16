import React from 'react';
import { getStatusStyle } from '../utils/statusStyles';

interface StatusBadgeProps {
    status: string;
    size?: 'small' | 'medium' | 'large';
    showIcon?: boolean;
    style?: React.CSSProperties;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'medium', showIcon = true, style }) => {
    const s = getStatusStyle(status);

    let padding = '6px 12px';
    let fontSize = '0.85rem';
    let borderRadius = '20px';

    if (size === 'small') {
        padding = '4px 8px';
        fontSize = '0.75rem';
    } else if (size === 'large') {
        padding = '8px 16px';
        fontSize = '1rem';
    }

    return (
        <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding,
            borderRadius,
            fontSize,
            fontWeight: '600',
            backgroundColor: s.bg,
            color: s.color,
            border: `1px solid ${s.border}`,
            whiteSpace: 'nowrap',
            ...style
        }}>
            {showIcon && s.icon && <span>{s.icon}</span>}
            {s.label}
        </span>
    );
};

export default StatusBadge;

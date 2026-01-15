import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';

interface ProtectedRouteProps {
    allowedRoles?: string[]; // 'USER', 'AGENCY' or empty for any logged-in user
}

const ProtectedRoute = ({ allowedRoles }: ProtectedRouteProps) => {
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('role');

    if (!token) {
        // 비로그인 사용자 -> 로그인 페이지로
        return <Navigate to="/login" replace />;
    }

    if (allowedRoles && role && !allowedRoles.includes(role)) {
        // 권한 없음 -> 홈으로 (또는 403 페이지)
        alert('접근 권한이 없습니다.');
        return <Navigate to="/" replace />;
    }

    return <Outlet />;
};

export default ProtectedRoute;

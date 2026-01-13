import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import ApplyText from './pages/ApplyText';
import ApplyVoice from './pages/ApplyVoice';
import ApplyImage from './pages/ApplyImage';
import About from './pages/About';
import List from './pages/List';
import Detail from './pages/Detail';
import MapView from './pages/MapView';
import MyPage from './pages/MyPage';
import FindAccount from './pages/FindAccount';
import ResetPassword from './pages/ResetPassword';
import Dashboard from './pages/Dashboard';
import './index.css';

function App() {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [role, setRole] = useState(localStorage.getItem('role') || 'USER');
  const [isAdminView, setIsAdminView] = useState(localStorage.getItem('role') === 'AGENCY');

  // localStorage 변경을 다른 탭/창에서도 반영 (선택사항이지만 유용)
  useEffect(() => {
    const onStorage = () => {
      setToken(localStorage.getItem('token'));
      setRole(localStorage.getItem('role') || 'USER');
      // If role changes, reset admin view state
      setIsAdminView(localStorage.getItem('role') === 'AGENCY');
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  if (import.meta.env.DEV) {
    console.log('ENV TEST:', import.meta.env.VITE_KAKAO_MAP_KEY);
  }

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('userId');

    setToken(null);
    setRole('USER');
    setIsAdminView(false);

    window.location.href = '/login';
  };

  const toggleAdminView = () => {
    setIsAdminView(!isAdminView);
  };

  return (
    <Router>
      <div className={`app ${isAdminView ? 'admin-theme' : ''}`}>
        {/* Top Bar */}
        <div className="top-bar">
          <div className="container" style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <div className="top-bar__links">
              {token ? (
                <>
                  {role === 'AGENCY' && (
                    <>
                      <button
                        onClick={toggleAdminView}
                        style={{ background: 'none', border: 'none', color: '#7c3aed', cursor: 'pointer', padding: '0 10px', font: 'inherit', fontWeight: 'bold' }}
                      >
                        {isAdminView ? '👤 일반유저 모드' : '🛠️ 관리자 모드'}
                      </button>
                      <span>|</span>
                    </>
                  )}
                  <Link to="/mypage">마이페이지</Link>
                  <span>|</span>
                  <button
                    onClick={logout}
                    style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', padding: 0, font: 'inherit' }}
                  >
                    로그아웃
                  </button>
                </>
              ) : (
                <>
                  <Link to="/register">회원가입</Link>
                  <span>|</span>
                  <Link to="/login">로그인</Link>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Header */}
        <header className="header">
          <div className="container header__inner">
            <div className="logo">
              <Link to={isAdminView ? "/admin/dashboard" : "/"}>
                <h1 style={{ color: 'var(--primary-color)', fontSize: '1.8rem', fontWeight: '800' }}>모두의 민원</h1>
              </Link>
            </div>
            <nav className="nav">
              <ul className="nav__list">
                {isAdminView ? (
                  <>
                    <li className="nav__item"><Link to="/admin/list">민원 목록(관리자)</Link></li>
                    <li className="nav__item"><Link to="/admin/map">신고현황 지도(관리자)</Link></li>
                    <li className="nav__item"><Link to="/admin/dashboard">대시보드(관리자)</Link></li>
                  </>
                ) : (
                  <>
                    <li className="nav__item"><Link to="/apply-text">신고 하기</Link></li>
                    <li className="nav__item"><Link to="/about">서비스 소개</Link></li>
                    <li className="nav__item"><Link to="/list">민원 목록</Link></li>
                    <li className="nav__item"><Link to="/map">신고현황 지도</Link></li>
                  </>
                )}
              </ul>
            </nav>
          </div>
        </header>

        {/* Page Routes */}
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/apply-text" element={<ApplyText />} />
          <Route path="/apply-voice" element={<ApplyVoice />} />
          <Route path="/apply-image" element={<ApplyImage />} />
          <Route path="/about" element={<About />} />
          <Route path="/list" element={<List />} />
          <Route path="/admin/list" element={<List />} />
          <Route path="/reports/:id" element={<Detail />} />
          <Route path="/map" element={<MapView />} />
          <Route path="/admin/map" element={<MapView />} />
          <Route path="/admin/dashboard" element={<Dashboard />} />
          <Route path="/mypage" element={<MyPage />} />
          <Route path="/find-account" element={<FindAccount />} />
          <Route path="/reset-password" element={<ResetPassword />} />
        </Routes>

        {/* Footer */}
        <footer className="footer">
          <div className="container">
            &copy; {new Date().getFullYear()} 모두의 민원. All rights reserved.
          </div>
        </footer>
      </div>
    </Router>
  );
}

export default App;

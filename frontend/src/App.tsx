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
import ProtectedRoute from './components/common/ProtectedRoute';
import Modal from './components/common/Modal'; // Modal Import
import { agenciesAPI } from './utils/api';
import './index.css';

function App() {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [role, setRole] = useState(localStorage.getItem('role') || 'USER');
  const [agencyName, setAgencyName] = useState('');
  const [title, setTitle] = useState('모두의 민원');

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

  // localStorage 변경을 다른 탭/창에서도 반영 (선택사항이지만 유용)
  useEffect(() => {
    const onStorage = () => {
      setToken(localStorage.getItem('token'));
      setRole(localStorage.getItem('role') || 'USER');
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  // Fetch agency name if user is AGENCY
  useEffect(() => {
    const storedAgencyName = localStorage.getItem('agencyName');

    if (role === 'AGENCY' && storedAgencyName) {
      setTitle(`(${storedAgencyName}) 관리자 모드`);
    } else if (role === 'AGENCY') {
      setTitle('관리자 모드');
    } else {
      setTitle('모두의 민원');
    }
  }, [role, token]);

  if (import.meta.env.DEV) {
    console.log('ENV TEST:', import.meta.env.VITE_KAKAO_MAP_KEY);
  }

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('userId');
    localStorage.removeItem('agencyNo');

    setToken(null);
    setRole('USER');
    setAgencyName('');
    setTitle('모두의 민원');

    window.location.href = '/login';
  };

  // Determine view mode based on role
  const isAdminUser = role === 'AGENCY';

  return (
    <Router>
      <div className={`app ${isAdminUser ? 'admin-theme' : ''}`}>
        {/* Top Bar */}
        <div className="top-bar">
          <div className="container" style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <div className="top-bar__links">
              {token ? (
                <>
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
              <Link to={isAdminUser ? "/admin/dashboard" : "/"}>
                <h1 style={{ color: 'var(--primary-color)', fontSize: '1.8rem', fontWeight: '800' }}>
                  {title}
                </h1>
              </Link>
            </div>
            <nav className="nav">
              <ul className="nav__list">
                {isAdminUser ? (
                  <>
                    <li className="nav__item"><Link to="/admin/dashboard">대시보드(관리자)</Link></li>
                    <li className="nav__item"><Link to="/admin/list">민원 목록(관리자)</Link></li>
                    <li className="nav__item"><Link to="/admin/map">신고현황 지도(관리자)</Link></li>
                  </>
                ) : (
                  <>
                    <li className="nav__item nav-dropdown">
                      <span onClick={() => { if (!token) { showAlert('알림', '로그인이 필요한 서비스입니다.', () => window.location.href = '/login'); } }} style={{ cursor: 'pointer' }}>
                        민원접수 ▾
                      </span>
                      {token && (
                        <div className="nav-dropdown-content">
                          <Link to="/apply-text">텍스트 민원</Link>
                          <Link to="/apply-voice">음성 민원</Link>
                          <Link to="/apply-image">이미지 민원</Link>
                        </div>
                      )}
                    </li>
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
          <Route path="/" element={<Home showAlert={showAlert} />} />
          <Route path="/about" element={<About />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          {/* Admin Routes (Protected) */}
          <Route element={<ProtectedRoute allowedRoles={['AGENCY']} />}>
            <Route path="/admin/list" element={<List />} />
            <Route path="/admin/map" element={<MapView />} />
            <Route path="/admin/dashboard" element={<Dashboard />} />
          </Route>

          {/* Application Routes (Login Required) */}
          <Route element={<ProtectedRoute />}>
            <Route path="/apply-text" element={<ApplyText />} />
            <Route path="/apply-voice" element={<ApplyVoice />} />
            <Route path="/apply-image" element={<ApplyImage />} />
          </Route>

          <Route path="/list" element={<List />} />
          <Route path="/reports/:id" element={<Detail />} />
          <Route path="/map" element={<MapView />} />

          {/* User Account Routes */}
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


        {/* 공통 모달 적용 */}
        <Modal
          isOpen={modalConfig.isOpen}
          onClose={closeModal}
          title={modalConfig.title}
        >
          {modalConfig.message}
        </Modal>
      </div >
    </Router >
  );
}

export default App;

import React from 'react';
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
import './index.css';

function App() {
  return (
    <Router>
      <div className="app">
        {/* Top Bar */}
        <div className="top-bar">
          <div className="container" style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <div className="top-bar__links">
              <Link to="/mypage">마이페이지</Link>
              <span>|</span>
              <Link to="/register">회원가입</Link>
              <span>|</span>
              <Link to="/login">로그인</Link>
            </div>
          </div>
        </div>

        {/* Header */}
        <header className="header">
          <div className="container header__inner">
            <div className="logo">
              <Link to="/">
                <h1 style={{ color: 'var(--primary-color)', fontSize: '1.8rem', fontWeight: '800' }}>모두의 민원</h1>
              </Link>
            </div>
            <nav className="nav">
              <ul className="nav__list">
                <li className="nav__item"><Link to="/apply-text">신고 하기</Link></li>
                <li className="nav__item"><Link to="/about">서비스 소개</Link></li>
                <li className="nav__item"><Link to="/list">민원 목록</Link></li>
                <li className="nav__item"><Link to="/map">신고현황 지도</Link></li>
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
          <Route path="/reports/:id" element={<Detail />} />
          <Route path="/map" element={<MapView />} />
          <Route path="/mypage" element={<MyPage />} />
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

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { complaintsAPI } from '../utils/api';

function MapView() {
  console.log("MapView render");

  const navigate = useNavigate();

  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);            // kakao map instance
  const clustererRef = useRef(null);      // kakao clusterer
  const markersRef = useRef([]);          // current markers
  const idleListenerRef = useRef(null);   // listener cleanup
  const scriptRef = useRef(null);         // script element
  const fetchSeqRef = useRef(0);          // latest request guard

  const [loading, setLoading] = useState(true);
  const [locations, setLocations] = useState([]);
  const [selectedComplaint, setSelectedComplaint] = useState(null);

  // ====== UI Helpers ======
  const getCategoryStyle = (category) => {
    const styles = {
      '교통': { bg: '#dbeafe', color: '#2563eb', icon: '🚗' },
      '환경': { bg: '#dcfce7', color: '#16a34a', icon: '🌿' },
      '안전': { bg: '#fee2e2', color: '#dc2626', icon: '⚠️' },
      '시설': { bg: '#fef3c7', color: '#d97706', icon: '🏗️' }
//       교통
//       행정·안전
//       도로
//       산업·통상
//       주택·건축
//       교육
//       경찰·검찰
//       환경
//       보건
//       관광
//       기타
    };
    return styles[category] || { bg: '#f1f5f9', color: '#64748b', icon: '📋' };
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      'RECEIVED': { text: '접수', bg: '#dbeafe', color: '#2563eb' },
      'IN_PROGRESS': { text: '처리중', bg: '#fef3c7', color: '#d97706' },
      'COMPLETED': { text: '완료', bg: '#dcfce7', color: '#16a34a' }
    };
    return statusMap[status] || { text: status, bg: '#f1f5f9', color: '#64748b' };
  };

  // ====== 지도 bounds -> API params ======
  const buildMapParams = (map) => {
    const bounds = map.getBounds();
    const sw = bounds.getSouthWest();
    const ne = bounds.getNorthEast();
    return {
      swLat: sw.getLat(),
      swLng: sw.getLng(),
      neLat: ne.getLat(),
      neLng: ne.getLng(),
      zoom: map.getLevel(),
      // TODO: 필터 붙일 거면 여기에 추가
      // category, status, adminCode, from, to ...
    };
  };

  // ====== 마커/클러스터 정리 ======
  const clearMarkers = () => {
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];
    if (clustererRef.current) {
      clustererRef.current.clear();
    }
  };

  // ====== 데이터 로드 (bounds 기반) ======
  const fetchLocations = async () => {
    const map = mapRef.current;
    if (!map) return;

    const mySeq = ++fetchSeqRef.current;
    setLoading(true);

    try {
      const params = buildMapParams(map);
      const data = await complaintsAPI.getMapItems(params);

      // 최신 요청만 반영 (idle 연속 호출로 레이스 방지)
      if (mySeq !== fetchSeqRef.current) return;

      setLocations(Array.isArray(data) ? data : []);
      // 선택된 민원이 화면에서 사라졌으면 선택 해제
      setSelectedComplaint((prev) => {
        if (!prev) return prev;
        const stillExists = (Array.isArray(data) ? data : []).some(
          (x) => x.complaintNo === prev.complaintNo
        );
        return stillExists ? prev : null;
      });
    } catch (err) {
      console.error('위치 데이터 로드 실패:', err);
    } finally {
      // 최신 요청만 로딩 해제
      if (mySeq === fetchSeqRef.current) setLoading(false);
    }
  };

  // ====== 마커 렌더링 ======
  const renderMarkers = () => {
    const map = mapRef.current;
    console.log("[renderMarkers] called", { locationsLen: locations?.length });
    console.log("[renderMarkers] mapRef", !!map, "kakao", !!window.kakao?.maps);
    if (!map || !window.kakao?.maps) return;

    // 기존 마커 제거
    clearMarkers();

    // 클러스터러 내부 마커까지 제거 (핵심)
    if (clustererRef.current) {
      clustererRef.current.clear();
      clustererRef.current.setMap(null);
    }

    if (!locations || locations.length === 0) return;

    // 클러스터러 생성/재연결
    if (!clustererRef.current) {
      clustererRef.current = new window.kakao.maps.MarkerClusterer({
        map,
        averageCenter: true,
        minLevel: 5,
      });
    } else {
      clustererRef.current.setMap(map);
    }

    // 좌표 숫자 변환 + invalid 방어
    const markers = locations
      .map((loc) => {
        const lat = Number(loc.lat);
        const lng = Number(loc.lng);

        if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
          console.warn("invalid coord", loc);
          return null;
        }

        const marker = new window.kakao.maps.Marker({
          position: new window.kakao.maps.LatLng(lat, lng),
        });

        window.kakao.maps.event.addListener(marker, "click", () => {
          setSelectedComplaint(loc);
        });

        return marker;
      })
      .filter(Boolean);

    // add 전에 clear 한번 더 (갱신 안정화)
    clustererRef.current.clear();
    clustererRef.current.addMarkers(markers);

    markersRef.current = markers;
  };


  // ====== Kakao SDK 로드 & 지도 생성 ======
  useEffect(() => {
    renderMarkers();
    const kakaoKey = import.meta.env.VITE_KAKAO_MAP_KEY;
    console.log("KAKAO KEY =", kakaoKey);
    if (!kakaoKey) {
      setLoading(false);
      return;
    }

    const initMap = () => {
      window.kakao.maps.load(() => {
        const container = mapContainerRef.current;
        const options = {
          center: new window.kakao.maps.LatLng(37.5665, 126.9780),
          level: 7
        };
        const map = new window.kakao.maps.Map(container, options);
        mapRef.current = map;

        // idle 이벤트: 이동/줌 끝날 때마다 bounds 재조회
        // (너희 GIS 요구사항에 맞는 정석 패턴)
        idleListenerRef.current = window.kakao.maps.event.addListener(map, 'idle', () => {
          fetchLocations();
        });

        // 최초 1회 로드
        fetchLocations();
      });
    };

    // SDK가 이미 로드된 경우
    if (window.kakao && window.kakao.maps) {
      initMap();
      return () => {};
    }

    // SDK 로드
    const script = document.createElement('script');
    scriptRef.current = script;
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${kakaoKey}&autoload=false&libraries=services,clusterer`;
    script.async = true;
    script.onload = initMap;
    document.head.appendChild(script);

    return () => {
      // 이벤트/마커 정리
      try {
        clearMarkers();
        if (idleListenerRef.current && mapRef.current) {
          window.kakao.maps.event.removeListener(mapRef.current, 'idle', idleListenerRef.current);
        }
      } catch (_) {}

      // script 제거
      if (scriptRef.current) {
        document.head.removeChild(scriptRef.current);
        scriptRef.current = null;
      }

      // ref 정리
      mapRef.current = null;
      clustererRef.current = null;
      idleListenerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc' }}>
      {/* 페이지 헤더 */}
      <div style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        padding: '40px 20px',
        textAlign: 'center'
      }}>
        <h1 style={{
          fontSize: '2.5rem',
          fontWeight: '800',
          color: 'white',
          margin: 0,
          textShadow: '0 2px 10px rgba(0,0,0,0.2)'
        }}>
          🗺️ 민원 지도
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.9)', marginTop: '8px', fontSize: '1.1rem' }}>
          지역별 민원 현황을 한눈에 확인하세요
        </p>
      </div>

      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 20px' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 380px',
          gap: '24px',
          marginTop: '-40px',
          position: 'relative',
          zIndex: 10
        }}>
          {/* 지도 영역 */}
          <div style={{
            backgroundColor: 'white',
            borderRadius: '24px',
            overflow: 'hidden',
            boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
            height: '650px',
            position: 'relative'
          }}>
            <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }}>
              {!import.meta.env.VITE_KAKAO_MAP_KEY && (
                <div style={{
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: '#f8fafc',
                  flexDirection: 'column',
                  gap: '16px'
                }}>
                  <div style={{ fontSize: '5rem' }}>🗺️</div>
                  <h3 style={{ color: '#64748b', fontWeight: '600', margin: 0 }}>
                    카카오 맵 API 키가 필요합니다
                  </h3>
                  <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>
                    .env 파일에 VITE_KAKAO_MAP_KEY를 설정해주세요
                  </p>
                </div>
              )}
            </div>

            {loading && (
              <div style={{
                position: 'absolute',
                inset: 0,
                backgroundColor: 'rgba(255,255,255,0.9)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'column',
                gap: '16px'
              }}>
                <div style={{
                  width: '50px',
                  height: '50px',
                  border: '4px solid #e2e8f0',
                  borderTop: '4px solid #7c3aed',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite'
                }}></div>
                <p style={{ color: '#64748b', fontWeight: '500' }}>민원 위치 로딩 중...</p>
                <style>{`@keyframes spin { to { transform: rotate(360deg); }}`}</style>
              </div>
            )}

            {/* 지도 컨트롤 */}
            <div style={{
              position: 'absolute',
              bottom: '20px',
              left: '20px',
              display: 'flex',
              gap: '8px'
            }}>
              <div style={{
                backgroundColor: 'white',
                padding: '12px 16px',
                borderRadius: '12px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <span style={{ fontSize: '1.2rem' }}>📍</span>
                <span style={{ fontWeight: '600', color: '#1e293b' }}>{locations.length}건</span>
              </div>

              {/* 수동 새로고침 버튼(디버깅/실무 편의) */}
              <button
                onClick={() => fetchLocations()}
                style={{
                  backgroundColor: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '12px 14px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                  cursor: 'pointer',
                  fontWeight: 700,
                  color: '#1e293b'
                }}
                title="새로고침"
              >
                🔄
              </button>
            </div>
          </div>

          {/* 사이드바 */}
          <div style={{
            backgroundColor: 'white',
            borderRadius: '24px',
            boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            height: '650px'
          }}>
            <div style={{
              padding: '24px',
              borderBottom: '1px solid #f1f5f9'
            }}>
              <h3 style={{
                fontSize: '1.2rem',
                fontWeight: '700',
                color: '#1e293b',
                margin: 0,
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                📋 민원 현황
              </h3>
            </div>

            {/* 선택된 민원 */}
            <div style={{ padding: '20px', borderBottom: '1px solid #f1f5f9' }}>
              {selectedComplaint ? (
                <div style={{
                  backgroundColor: '#faf5ff',
                  borderRadius: '16px',
                  padding: '20px',
                  border: '2px solid #7c3aed'
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '12px'
                  }}>
                    <span style={{
                      padding: '4px 10px',
                      borderRadius: '8px',
                      fontSize: '0.8rem',
                      fontWeight: '600',
                      backgroundColor: getCategoryStyle(selectedComplaint.category).bg,
                      color: getCategoryStyle(selectedComplaint.category).color
                    }}>
                      {getCategoryStyle(selectedComplaint.category).icon} {selectedComplaint.category}
                    </span>
                    <span style={{
                      padding: '4px 10px',
                      borderRadius: '8px',
                      fontSize: '0.8rem',
                      fontWeight: '600',
                      backgroundColor: getStatusBadge(selectedComplaint.status).bg,
                      color: getStatusBadge(selectedComplaint.status).color
                    }}>
                      {getStatusBadge(selectedComplaint.status).text}
                    </span>
                  </div>
                  <h4 style={{
                    fontSize: '1.1rem',
                    fontWeight: '700',
                    color: '#1e293b',
                    margin: '0 0 8px 0'
                  }}>
                    {selectedComplaint.title}
                  </h4>
                  <p style={{
                    fontSize: '0.9rem',
                    color: '#64748b',
                    margin: '0 0 16px 0',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}>
                    📍 {selectedComplaint.address}
                  </p>
                  <button
                    onClick={() => navigate(`/reports/${selectedComplaint.complaintNo}`)}
                    style={{
                      width: '100%',
                      padding: '12px',
                      background: 'linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '10px',
                      fontSize: '0.95rem',
                      fontWeight: '600',
                      cursor: 'pointer',
                      boxShadow: '0 4px 12px rgba(124, 58, 237, 0.3)'
                    }}
                  >
                    상세 보기 →
                  </button>
                </div>
              ) : (
                <div style={{
                  textAlign: 'center',
                  padding: '30px 20px',
                  color: '#94a3b8'
                }}>
                  <div style={{ fontSize: '3rem', marginBottom: '12px' }}>👆</div>
                  <p style={{ fontWeight: '500' }}>지도에서 마커를 클릭하세요</p>
                </div>
              )}
            </div>

            {/* 최근 민원 목록 */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px 20px' }}>
              <h4 style={{
                fontSize: '0.9rem',
                fontWeight: '600',
                color: '#64748b',
                margin: '16px 0 12px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                🕐 최근 민원
              </h4>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {locations.length === 0 && !loading && (
                  <div style={{
                    textAlign: 'center',
                    padding: '40px 20px',
                    color: '#94a3b8'
                  }}>
                    <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>📭</div>
                    <p>등록된 민원이 없습니다</p>
                  </div>
                )}

                {locations.slice(0, 8).map((loc) => (
                  <div
                    key={loc.complaintNo}
                    onClick={() => setSelectedComplaint(loc)}
                    style={{
                      padding: '16px',
                      backgroundColor: selectedComplaint?.complaintNo === loc.complaintNo ? '#faf5ff' : '#f8fafc',
                      borderRadius: '12px',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      border: selectedComplaint?.complaintNo === loc.complaintNo ? '2px solid #7c3aed' : '2px solid transparent'
                    }}
                  >
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      marginBottom: '6px'
                    }}>
                      <span style={{ fontSize: '1rem' }}>
                        {getCategoryStyle(loc.category).icon}
                      </span>
                      <span style={{
                        fontSize: '0.75rem',
                        padding: '2px 8px',
                        borderRadius: '6px',
                        backgroundColor: getCategoryStyle(loc.category).bg,
                        color: getCategoryStyle(loc.category).color,
                        fontWeight: '600'
                      }}>
                        {loc.category}
                      </span>
                    </div>

                    <p style={{
                      fontSize: '0.95rem',
                      fontWeight: '600',
                      color: '#1e293b',
                      margin: 0,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      {loc.title}
                    </p>
                    <p style={{
                      fontSize: '0.8rem',
                      color: '#94a3b8',
                      margin: '4px 0 0',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      📍 {loc.address}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div style={{ height: '40px' }}></div>
      </div>
    </div>
  );
}

export default MapView;

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

  const [loading, setLoading] = useState(true);
  const [locations, setLocations] = useState([]);
  const [selectedComplaint, setSelectedComplaint] = useState(null);

  // [추가] map이 실제로 생성되었는지 (초기 렌더/StrictMode에서 renderMarkers가 먼저 호출되는 문제 방지)
  const [mapReady, setMapReady] = useState(false);

  // [속성 추가] 뷰 모드 및 핫스팟 데이터
  const [viewMode, setViewMode] = useState('marker'); // 'marker' | 'hotspot'
  const [hotspots, setHotspots] = useState([]);
  const polygonsRef = useRef([]);

  // [수정] fetchLocations를 Ref로 관리하여 지도 리스너가 항상 최신 상태를 참조하게 함
  const fetchSeqRef = useRef(0);
  const fetchLocationsRef = useRef(null);

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
      'UNPROCESSED': { text: '미처리', bg: '#fee2e2', color: '#dc2626' },
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

    polygonsRef.current.forEach((p) => p.setMap(null));
    polygonsRef.current = [];
  };

  // ====== 데이터 로드 (bounds 기반) ======
  const fetchLocations = async () => {
    const map = mapRef.current;
    if (!map) return;

    const mySeq = ++fetchSeqRef.current;
    setLoading(true);

    try {
      const params = buildMapParams(map);

      // 항상 민원 목록을 위해 데이터를 가져옴 (사이드바 리스트 동기화)
      const markerData = await complaintsAPI.getMapItems(params);
      if (mySeq !== fetchSeqRef.current) return;
      setLocations(Array.isArray(markerData) ? markerData : []);

      // 핫스팟 모드일 경우 추가로 핫스팟 데이터 가져옴
      if (viewMode === 'hotspot') {
        const hotspotData = await complaintsAPI.getHotspots(params);
        if (mySeq !== fetchSeqRef.current) return;
        console.log('Hotspot Data Received:', hotspotData?.length);
        setHotspots(Array.isArray(hotspotData) ? hotspotData : []);
      }

      // 선택된 민원이 화면에서 사라졌으면 선택 해제 (마커 모드일 때만 적용하기엔 모호하므로 일단 유지)
    } catch (err) {
      console.error('위치 데이터 로드 실패:', err);
    } finally {
      // 최신 요청만 로딩 해제
      if (mySeq === fetchSeqRef.current) setLoading(false);
    }
  };

  // Ref 업데이트
  useEffect(() => {
    fetchLocationsRef.current = fetchLocations;
  }, [fetchLocations]);

  // [추가] 뷰 모드가 바뀌면 즉시 데이터를 다시 불러옴
  useEffect(() => {
    if (mapReady) {
      fetchLocations();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMode]);

  // ====== 마커 렌더링 ======
  const renderMarkers = () => {
    const map = mapRef.current;
    console.log("[renderMarkers] called", { locationsLen: locations?.length });
    console.log("[renderMarkers] mapRef", !!map, "kakao", !!window.kakao?.maps);
    //     if (!map || !window.kakao?.maps) return;

    // [수정] mapReady + kakao + map 다 준비된 후에만 진행
    if (!mapReady || !map || !window.kakao?.maps) return;

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

    // 처리 완료된 민원은 지도에서 제외 + 상태별 마커 색상 변경
    const markers = locations
      .filter((loc) => loc.status !== 'COMPLETED')
      .map((loc) => {
        const lat = Number(loc.lat);
        const lng = Number(loc.lng);

        if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
          console.warn("invalid coord", loc);
          return null;
        }

        // 상태별 마커 이미지 설정 (SVG 데이터 URI 활용)
        const markerColor = loc.status === 'IN_PROGRESS' ? '#d97706' : '#dc2626'; // 처리중: 주황/노랑, 미처리: 빨강
        const markerImageSrc = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
          <svg width="36" height="36" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
            <path d="M16 0C10.5 0 6 4.5 6 10c0 7.5 10 22 10 22s10-14.5 10-22c0-5.5-4.5-10-10-10z" fill="${markerColor}" stroke="white" stroke-width="1.5"/>
            <circle cx="16" cy="10" r="4" fill="white"/>
          </svg>
        `)}`;

        const markerImage = new window.kakao.maps.MarkerImage(
          markerImageSrc,
          new window.kakao.maps.Size(36, 36),
          { offset: new window.kakao.maps.Point(18, 36) }
        );

        const marker = new window.kakao.maps.Marker({
          position: new window.kakao.maps.LatLng(lat, lng),
          image: markerImage
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

  // [추가] locations가 바뀌면 마커를 다시 그림
  // 단, mapReady가 false면 renderMarkers 내부에서 return 됨
  useEffect(() => {
    if (viewMode === 'marker') {
      renderMarkers();
    } else {
      renderHotspots();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapReady, locations, hotspots, viewMode]);

  // ====== 핫스팟 렌더링 ======
  const renderHotspots = () => {
    const map = mapRef.current;
    if (!mapReady || !map || !window.kakao?.maps) return;

    clearMarkers();

    if (!hotspots || hotspots.length === 0) return;

    // 밀도에 따른 스펙트럼 색상 계산 함수 (낮음: 파랑 -> 높음: 빨강)
    const getSpectrumColor = (count) => {
      if (count >= 10) return '#ef4444'; // 진한 빨강 (Danger)
      if (count >= 7) return '#f97316';  // 주황
      if (count >= 5) return '#fbbf24';  // 노랑
      if (count >= 3) return '#84cc16';  // 연두
      if (count >= 2) return '#22c55e';  // 초록
      return '#3b82f6';                // 파랑 (상대적 낮음)
    };

    const polygons = hotspots.map((hs) => {
      if (!hs.points || hs.points.length === 0) return null;

      const path = hs.points.map(p => new window.kakao.maps.LatLng(p.lat, p.lng));
      const color = getSpectrumColor(hs.count);

      // 참고 이미지처럼 테두리 없이 부드럽게 렌더링
      const opacity = Math.min(0.4 + (hs.count * 0.05), 0.85);

      const polygon = new window.kakao.maps.Polygon({
        path: path,
        strokeWeight: 0, // 테두리 제거 (부드러운 연결)
        fillColor: color,
        fillOpacity: opacity,
        zIndex: 10
      });

      polygon.setMap(map);
      return polygon;
    }).filter(p => p !== null);

    polygonsRef.current = polygons;
  };

  // ====== Kakao SDK 로드 & 지도 생성 ======
  useEffect(() => {
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

        // [추가] map 생성 완료 플래그
        setMapReady(true);

        // idle 이벤트: 이동/줌 끝날 때마다 bounds 재조회
        // [수정] 리스너 내에서 직접 fetchLocations를 호출하면 클로저 문제가 생기므로 Ref 사용
        idleListenerRef.current = window.kakao.maps.event.addListener(map, 'idle', () => {
          if (fetchLocationsRef.current) {
            fetchLocationsRef.current();
          }
        });

        // 최초 1회 로드
        fetchLocations();
      });
    };

    // SDK가 이미 로드된 경우
    if (window.kakao && window.kakao.maps) {
      initMap();
      return () => { };
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
      } catch (_) { }

      // script 제거
      if (scriptRef.current) {
        document.head.removeChild(scriptRef.current);
        scriptRef.current = null;
      }

      // ref 정리
      mapRef.current = null;
      clustererRef.current = null;
      idleListenerRef.current = null;

      // [추가] mapReady 리셋
      setMapReady(false);
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

            {/* 뷰 모드 토글 */}
            <div style={{
              position: 'absolute',
              top: '20px',
              left: '50%',
              transform: 'translateX(-50%)',
              backgroundColor: 'white',
              padding: '6px',
              borderRadius: '16px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
              display: 'flex',
              gap: '4px',
              zIndex: 100
            }}>
              <button
                onClick={() => setViewMode('marker')}
                style={{
                  padding: '10px 20px',
                  borderRadius: '12px',
                  border: 'none',
                  backgroundColor: viewMode === 'marker' ? '#7c3aed' : 'transparent',
                  color: viewMode === 'marker' ? 'white' : '#64748b',
                  fontWeight: '700',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  fontSize: '0.9rem'
                }}
              >
                📍 마커 모드
              </button>
              <button
                onClick={() => setViewMode('hotspot')}
                style={{
                  padding: '10px 20px',
                  borderRadius: '12px',
                  border: 'none',
                  backgroundColor: viewMode === 'hotspot' ? '#7c3aed' : 'transparent',
                  color: viewMode === 'hotspot' ? 'white' : '#64748b',
                  fontWeight: '700',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  fontSize: '0.9rem'
                }}
              >
                🔥 핫스팟 모드
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
                      <span style={{
                        marginLeft: 'auto',
                        fontSize: '0.7rem',
                        padding: '2px 8px',
                        borderRadius: '6px',
                        backgroundColor: getStatusBadge(loc.status).bg,
                        color: getStatusBadge(loc.status).color,
                        fontWeight: '600'
                      }}>
                        {getStatusBadge(loc.status).text}
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

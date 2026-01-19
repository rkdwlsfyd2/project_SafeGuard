import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as turf from '@turf/turf';
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
  const [selectedHotspot, setSelectedHotspot] = useState(null); // { name: string, count: number }
  const polygonClickedRef = useRef(false); // [추가] 폴리곤 클릭 시 지도 클릭 이벤트 무시용

  // [추가] map이 실제로 생성되었는지 (초기 렌더/StrictMode에서 renderMarkers가 먼저 호출되는 문제 방지)
  const [mapReady, setMapReady] = useState(false);

  // [속성 추가] 뷰 모드 및 데이터
  const [viewMode, setViewMode] = useState('marker'); // 'marker' | 'hotspot'
  const [districtCounts, setDistrictCounts] = useState([]);
  const [globalDistrictStats, setGlobalDistrictStats] = useState([]); // [추가] 색상 기준을 위한 전국 통계
  const polygonsRef = useRef([]);
  const geojsonCacheRef = useRef(null); // GeoJSON 캐시
  const renderSeqRef = useRef(0);      // 렌더링 시퀀스 ID (레이스 컨디션 방지)

  // [추가] 필터링 상태 (완료 표시, 내 담당만)
  const [showCompleted, setShowCompleted] = useState(false);
  const [myAssignedOnly, setMyAssignedOnly] = useState(false);

  // [추가] 사이드바 전용 필터링 및 페이지네이션 상태
  const [sidebarSearch, setSidebarSearch] = useState('');
  const [sidebarCategory, setSidebarCategory] = useState('전체');
  const [sidebarStatus, setSidebarStatus] = useState('전체');
  const [sidebarPage, setSidebarPage] = useState(1);
  const ITEMS_PER_PAGE = 5;

  // [추가] CustomOverlay 인스턴스 관리
  const customOverlayRef = useRef(null);

  // 세션 정보 (로컬스토리지에서 가져옴)
  const role = localStorage.getItem('role');
  const userAgencyNo = localStorage.getItem('agencyNo');
  const isAdmin = role === 'ADMIN' || role === 'AGENCY';

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

  // [추가] 오버레이 표시 공통 함수
  const showComplaintOverlay = (loc) => {
    const map = mapRef.current;
    if (!map || !window.kakao?.maps) return;

    // 기존 오버레이 닫기
    if (customOverlayRef.current) {
      customOverlayRef.current.setMap(null);
    }

    // CustomOverlay 생성 및 표시
    const content = document.createElement('div');
    content.style.cssText = 'background: white; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.2); padding: 0; min-width: 220px; overflow: hidden; border: 1px solid #e2e8f0; pointer-events: auto;';

    const headerColor = getStatusBadge(loc.status).color;
    content.innerHTML = `
      <div style="background: ${headerColor}; height: 4px;"></div>
      <div style="padding: 16px;">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
          <span style="font-size: 0.75rem; font-weight: 700; color: ${headerColor}; padding: 2px 6px; background: ${getStatusBadge(loc.status).bg}; border-radius: 4px;">
            ${getStatusBadge(loc.status).text}
          </span>
          <span style="font-size: 0.75rem; color: #94a3b8;">${loc.category}</span>
        </div>
        <h4 style="margin: 0 0 8px 0; font-size: 0.95rem; font-weight: 700; color: #1e293b; line-height: 1.4;">
          ${loc.title}
        </h4>
        <p style="margin: 0 0 12px 0; font-size: 0.8rem; color: #64748b; display: flex; align-items: flex-start; gap: 4px;">
          <span>📍</span>
          <span style="flex: 1;">${loc.address}</span>
        </p>
        <button id="overlay-detail-btn" style="width: 100%; padding: 8px; background: #7c3aed; color: white; border: none; border-radius: 6px; font-size: 0.85rem; font-weight: 600; cursor: pointer;">
          상세 보기
        </button>
      </div>
      <div style="position: absolute; bottom: -10px; left: 50%; transform: translateX(-50%); width: 0; height: 0; border-left: 10px solid transparent; border-right: 10px solid transparent; border-top: 10px solid white;"></div>
    `;

    const overlay = new window.kakao.maps.CustomOverlay({
      content: content,
      position: new window.kakao.maps.LatLng(Number(loc.lat), Number(loc.lng)),
      yAnchor: 1.2,
      zIndex: 350 // zIndex를 더 높게 설정
    });

    overlay.setMap(map);
    customOverlayRef.current = overlay;

    // [개선] 오버레이 컨텐츠 영역의 모든 마우스/터치 이벤트가 지도로 전파되지 않도록 차단
    // 카카오맵의 클릭 이벤트가 오버레이 버튼 클릭보다 먼저 발생하여 오버레이를 닫는 문제를 방지합니다.
    ['mousedown', 'mouseup', 'click', 'touchstart', 'touchend', 'dblclick'].forEach(eventType => {
      content.addEventListener(eventType, (e) => {
        e.stopPropagation();
      });
    });

    const btn = content.querySelector('#overlay-detail-btn');
    if (btn) {
      const handleDetailClick = (e: MouseEvent | TouchEvent) => {
        e.preventDefault();
        e.stopPropagation();
        console.log("Navigating to detail:", loc.complaintNo);
        navigate(`/reports/${loc.complaintNo}`);
      };

      (btn as HTMLElement).addEventListener('click', handleDetailClick as any);
      (btn as HTMLElement).addEventListener('touchend', handleDetailClick as any);
    }

    setSelectedComplaint(loc);
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
      agencyNo: (isAdmin && myAssignedOnly) ? userAgencyNo : null,
      showCompleted: showCompleted, // [추가] 완료 민원 표시 여부 전달
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

  // [수정] 통합 데이터 로드 함수 (기존 fetchLocations 명칭 유지하여 호환성 확보)
  const fetchLocations = async () => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    const mySeq = ++fetchSeqRef.current;
    setLoading(true);

    try {
      const params = buildMapParams(map);
      console.log("[MapView] Fetching data", { params, viewMode });

      // 1. 공통: 민원 목록(마커용) 가져오기
      const markerData = await complaintsAPI.getMapItems(params);
      if (mySeq !== fetchSeqRef.current) return;

      const uniqueMarkers = Array.isArray(markerData)
        ? markerData.filter((v, i, a) => a.findIndex(t => t.complaintNo === v.complaintNo) === i)
        : [];

      // 2. 핫스팟 모드일 경우 전국 통계 가져오기
      let globalStats = [];
      if (viewMode === 'hotspot') {
        const globalParams = {
          agencyNo: (isAdmin && myAssignedOnly) ? userAgencyNo : null,
          status: sidebarStatus === '전체' ? null : (sidebarStatus === '미처리' ? 'UNPROCESSED' : sidebarStatus === '처리중' ? 'IN_PROGRESS' : 'COMPLETED'),
          category: sidebarCategory === '전체' ? null : sidebarCategory,
          showCompleted: showCompleted
        };
        console.log("[MapView] Fetching global stats", globalParams);
        globalStats = await complaintsAPI.getDistrictCounts(globalParams);
      }

      if (mySeq !== fetchSeqRef.current) return;

      setLocations(uniqueMarkers);
      setGlobalDistrictStats(Array.isArray(globalStats) ? globalStats : []);

    } catch (err) {
      console.error('데이터 로드 실패:', err);
    } finally {
      if (mySeq === fetchSeqRef.current) setLoading(false);
    }
  };

  // Ref 업데이트 (idle 리스너가 항상 최신 함수를 참조하게 함)
  useEffect(() => {
    fetchLocationsRef.current = fetchLocations;
  }, [fetchLocations]);

  // [수정] 필터 및 뷰 모드 변경 시 통합 데이터 갱신 (mapReady 시점에 최초 실행 포함)
  useEffect(() => {
    if (mapReady) {
      fetchLocations();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMode, myAssignedOnly, sidebarCategory, sidebarStatus, showCompleted, mapReady]);

  // [추가] 필터링된 민원 목록 계산 (메모이제이션)
  const filteredLocations = useMemo(() => {
    return locations.filter(loc => {
      // 0. 삭제된 민원 제외
      if (loc.status === 'DELETED') return false;

      // 1. 기본 맵 필터 (완료 민원 표시 여부)
      if (!showCompleted && loc.status === 'COMPLETED') return false;

      // 2. 사이드바 카테고리 필터
      if (sidebarCategory !== '전체' && loc.category !== sidebarCategory) return false;

      // 3. 사이드바 상태 필터
      if (sidebarStatus !== '전체') {
        const statusMap = { '미처리': 'UNPROCESSED', '처리중': 'IN_PROGRESS', '처리완료': 'COMPLETED' };
        if (loc.status !== statusMap[sidebarStatus]) return false;
      }

      // 4. 사이드바 검색어 필터
      if (sidebarSearch && !loc.title.toLowerCase().includes(sidebarSearch.toLowerCase()) && !loc.address.toLowerCase().includes(sidebarSearch.toLowerCase())) {
        return false;
      }

      return true;
    });
  }, [locations, showCompleted, sidebarCategory, sidebarStatus, sidebarSearch]);

  // [추가] 페이지네이션된 목록 계산
  const paginatedLocations = useMemo(() => {
    const startIndex = (sidebarPage - 1) * ITEMS_PER_PAGE;
    return filteredLocations.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredLocations, sidebarPage]);

  // [추가] 총 페이지 수 계산
  const totalSidebarPages = Math.ceil(filteredLocations.length / ITEMS_PER_PAGE);

  // [추가] 필터 변경 시 페이지 초기화
  useEffect(() => {
    setSidebarPage(1);
  }, [sidebarCategory, sidebarStatus, sidebarSearch]);

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

    // 상태 필터링 및 이미지 설정
    const markers = locations
      .filter((loc) => loc.status !== 'DELETED' && (showCompleted ? true : loc.status !== 'COMPLETED'))
      .map((loc) => {
        const lat = Number(loc.lat);
        const lng = Number(loc.lng);

        if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
          console.warn("invalid coord", loc);
          return null;
        }

        // 상태별 마커 이미지 설정 (SVG 데이터 URI 활용)
        const markerColor =
          loc.status === 'COMPLETED' ? '#22c55e' : // 완료: 초록
            loc.status === 'IN_PROGRESS' ? '#f59e0b' : // 처리중: 주황
              '#ef4444'; // 미처리: 빨강
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
          setSelectedHotspot(null);
          showComplaintOverlay(loc);
        });

        return marker;
      })
      .filter(Boolean);

    // add 전에 clear 한번 더 (갱신 안정화)
    clustererRef.current.clear();
    clustererRef.current.addMarkers(markers);

    markersRef.current = markers;
  };

  // [추가] Turf.js 임포트 (파일 상단에 위치해야 함, 여기서는 함수 내부에서 사용 예시를 위해 적었으나 실제로는 상단으로 이동 필요. 
  // 편집기 도구가 스마트하게 처리하지 못할 수 있으므로 상단 import 구문도 추가해야 합니다.
  // 이 블록은 renderHotspotDistricts 함수 전체를 교체합니다.)

  // ====== 시군구 핫스팟 렌더링 (GeoJSON + Turf Merge) ======
  const renderHotspotDistricts = async () => {
    const map = mapRef.current;
    if (!mapReady || !map || !window.kakao?.maps) return;

    // 1. 즉시 기존 폴리곤 제거 및 시퀀스 증가
    const currentSeq = ++renderSeqRef.current;
    if (polygonsRef.current.length > 0) {
      polygonsRef.current.forEach(p => p.setMap(null));
      polygonsRef.current = [];
    }
    clearMarkers();

    // 2. GeoJSON 로드 (캐시 우선)
    let geojson = geojsonCacheRef.current;
    if (!geojson) {
      try {
        const res = await fetch('/korean_sigungu.geojson');
        if (!res.ok) throw new Error(`GeoJSON load failed`);
        geojson = await res.json();
        geojsonCacheRef.current = geojson;
      } catch (e) {
        console.error(e);
        return;
      }
    }

    // 3. 비동기 작업 후 정합성 체크
    if (currentSeq !== renderSeqRef.current || viewMode !== 'hotspot') {
      return;
    }

    if (!geojson || !geojson.features) return;

    // 4. 전국 통계 데이터 맵 생성
    const countMap = new Map();

    // [추가] 백엔드(경기) -> GeoJSON(경기도) 매핑 테이블
    const sidoMap: Record<string, string> = {
      '경기': '경기도',
      '강원': '강원특별자치도',
      '충북': '충청북도',
      '충남': '충청남도',
      '전북': '전북특별자치도',
      '전남': '전라남도',
      '경북': '경상북도',
      '경남': '경상남도',
      '제주': '제주특별자치도',
      '서울': '서울특별시',
      '부산': '부산광역시',
      '대구': '대구광역시',
      '인천': '인천광역시',
      '광주': '광주광역시',
      '대전': '대전광역시',
      '울산': '울산광역시',
      '세종': '세종특별자치시'
    };

    globalDistrictStats.forEach(d => {
      let name = d.name ? d.name.trim() : '';

      // 정규화 로직: "경기 수원시" -> "경기도 수원시"
      const parts = name.split(' ');
      if (parts.length >= 1) {
        const shortSido = parts[0];
        if (sidoMap[shortSido]) {
          parts[0] = sidoMap[shortSido];
          name = parts.join(' ');
        }
      }

      countMap.set(name, Number(d.count));
    });

    const globalCounts = globalDistrictStats.map(d => Number(d.count)).filter(c => c > 0).sort((a, b) => a - b);
    const globalTotal = globalCounts.length;

    // 색상 스케일
    const getColor = (val) => {
      if (!val || val === 0) return 'rgba(148, 163, 184, 0.1)';
      const rankIndex = globalCounts.findIndex(c => c >= val);
      const r = globalTotal > 0 ? (rankIndex + 1) / globalTotal : 0;

      if (r > 0.8) return 'rgba(239, 68, 68, 0.55)';
      if (r > 0.6) return 'rgba(249, 115, 22, 0.45)';
      if (r > 0.4) return 'rgba(250, 204, 21, 0.4)';
      if (r > 0.2) return 'rgba(132, 204, 22, 0.35)';
      return 'rgba(34, 197, 94, 0.3)';
    };

    // 5. 피처 그룹화 및 병합 (Turf.js)
    // Dynamic import to avoid build issues if not available immediately, though standard import is better.
    // Assuming standard import is done at top. If not, we might need a dynamic import or ensure package is present.
    // For this implementation, I will assume it is imported as `turf`. 
    // Since I cannot modify top of file easily with this tool without context, I will try to use dynamic import or assume `turf` is available globally if I setup vite config, but better to use `import * as turf` in the file.
    // However, `replace_file_content` targets a block. I will add the import in a separate tool call if needed or assume the user accepts a two-step edit. 
    // Wait, I can do a MultiReplace. But for now let's focus on the logic. 
    // I will use `window.turf` if I loaded it via CDN, but I installed via npm. 
    // I'll assume I can add the import line in a separate call or this call handles the function body.

    // Grouping Logic
    const groupedFeatures = new Map(); // distName -> Feature[]

    geojson.features.forEach((feature) => {
      const props = feature.properties;
      const sidonm = props.sidonm || '';
      const sggnm = props.sggnm || '';

      let distName = '';
      let isMergedCity = false;

      if (sidonm.includes('광역시') || sidonm === '세종특별자치시') {
        distName = sidonm;
      } else {
        // "청주시상당구" -> "청주시" 추출
        // 정규식: (임의의 문자 + 시) + (선택적 공백) + (임의의 문자 + 구)
        // 예: "수원시 장안구", "청주시상당구"
        const match = sggnm.match(/^(.+시)\s*(.*구)$/); // .*구 to match leniently
        if (match) {
          // 구 단위가 있는 시 -> 시 단위로 병합
          // 수원시 경우: sidonm="경기도", match[1]="수원시" -> "경기도 수원시"
          distName = `${sidonm} ${match[1]}`;
          isMergedCity = true;
        } else {
          // 군 단위 또는 일반 시 (구가 없는 시) -> "화성시", "양평군"
          // 혹시 "OO시 OO동" 같은 경우가 있다면? 
          // 읍면동은 보통 sggnm에 안들어감. sggnm은 시군구명.
          // space split[0] 은 안전.
          const sggPart = sggnm.split(' ')[0];
          distName = `${sidonm} ${sggPart}`;
        }
      }

      if (!groupedFeatures.has(distName)) {
        groupedFeatures.set(distName, []);
      }
      groupedFeatures.get(distName).push(feature);
    });

    // 6. 병합 및 렌더링
    const polygons = [];
    // const turf = await import('@turf/turf'); // Dynamic import removed

    for (const [distName, features] of groupedFeatures) {
      const count = countMap.get(distName) || 0;
      let geometry = null;

      try {
        if (features.length === 1) {
          geometry = features[0].geometry;
        } else {
          // [수정] 폴리곤 병합 시 미세한 틈으로 인한 내부 경계선 제거를 위해 버퍼 적용
          // 10m 버퍼 적용 (단위: km)
          const bufferedFeatures = features.map(f => turf.buffer(f, 0.01, { units: 'kilometers' }));

          let unionResult = bufferedFeatures[0];
          for (let i = 1; i < bufferedFeatures.length; i++) {
            unionResult = turf.union(unionResult, bufferedFeatures[i]);
          }
          geometry = unionResult.geometry;
        }
      } catch (err) {
        console.warn('Polygon merge failed for', distName, err);
        // Fallback: render individual features
        geometry = { type: 'MultiPolygon', coordinates: features.map(f => f.geometry.coordinates).flat() };
        // Note: The flat() above is a rough fallback, might not be valid GeoJSON MultiPolygon structure if simply flattened.
        // Better fallback: just use the first feature or skip. Proceeding with safe merging assumption.
      }

      if (!geometry) continue;

      const processCoords = (rings) => {
        // GeoJSON [lng, lat] -> Kakao [lat, lng]
        return rings.map(ring =>
          ring.map(coord => new window.kakao.maps.LatLng(coord[1], coord[0]))
        );
      };

      let paths = [];
      if (geometry.type === 'Polygon') {
        paths = processCoords(geometry.coordinates);
      } else if (geometry.type === 'MultiPolygon') {
        geometry.coordinates.forEach(poly => {
          // MultiPolygon coordinates are array of Polygons (which are array of rings)
          // processCoords expects array of rings.
          paths.push(...processCoords(poly)); // Flattening for Kakao Polygon? 
          // Kakao Polygon `path` property accepts `LatLng[]` or `LatLng[][]`.
          // If we pass `LatLng[][]`, it treats it as a single polygon with holes or multiple parts.
          // However, if we have disparate islands, we might need multiple polygon objects or a single one with multiple paths.
          // Kakao docs: path can be `LatLng[]` (simple) or `LatLng[][]` (with holes/islands).
          // Let's pass array of array of latlngs.
        });

        // geometry.coordinates for MultiPolygon is [ [ [pt, pt], [hole] ], [ [pt, pt] ] ]
        // processCoords takes [ [pt, pt], [hole] ] -> [ path1, path2 ]
        // We want a flat list of paths for the Polygon constructor if we want one logical object.
        paths = geometry.coordinates.map(poly => processCoords(poly)).flat();
      }

      const color = getColor(count);
      const polygon = new window.kakao.maps.Polygon({
        path: paths,
        strokeWeight: 1,
        strokeColor: '#cbd5e1',
        strokeOpacity: 0.2,
        fillColor: color,
        fillOpacity: 1,
        zIndex: 20 + count
      });

      polygon.setMap(map);
      polygons.push(polygon);

      // 이벤트 리스너
      window.kakao.maps.event.addListener(polygon, 'mouseover', () => {
        polygon.setOptions({ strokeColor: '#64748b', strokeWeight: 2, strokeOpacity: 0.5, fillOpacity: 0.8 });
      });
      window.kakao.maps.event.addListener(polygon, 'mouseout', () => {
        polygon.setOptions({ strokeColor: '#cbd5e1', strokeWeight: 1, strokeOpacity: 0.2, fillOpacity: 1 });
      });
      window.kakao.maps.event.addListener(polygon, 'click', (mouseEvent) => {
        polygonClickedRef.current = true;
        if (customOverlayRef.current) customOverlayRef.current.setMap(null);
        setSelectedHotspot({ name: distName, count: count });

        const content = document.createElement('div');
        content.style.cssText = 'pointer-events: none;';
        content.innerHTML = `
          <div style="background:rgba(255,255,255,0.95); backdrop-filter:blur(10px); padding:12px 18px; border-radius:14px; border:1px solid #e2e8f0; font-size:13px; box-shadow: 0 10px 30px rgba(0,0,0,0.1); min-width:140px;">
            <div style="font-weight:700; color:#1e293b; margin-bottom:8px; font-size:14px; border-bottom:1px solid #f1f5f9; padding-bottom:6px;">${distName}</div>
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <span style="color:#64748b; font-size:12px;">민원 건수</span>
              <span style="color:#3b82f6; font-weight:800; font-size:15px;">${count}</span>
            </div>
          </div>`;

        const overlay = new window.kakao.maps.CustomOverlay({
          content: content,
          position: mouseEvent.latLng,
          yAnchor: 1.5,
          zIndex: 1000
        });
        overlay.setMap(map);
        customOverlayRef.current = overlay;
        setTimeout(() => { polygonClickedRef.current = false; }, 200);
      });
    }

    polygonsRef.current = polygons;
  };

  // [추가] locations가 바뀌면 마커를 다시 그림
  useEffect(() => {
    // 뷰 모드 변경 시 모든 폴리곤을 먼저 지움 (persistence 방지)
    if (polygonsRef.current.length > 0) {
      polygonsRef.current.forEach(p => p.setMap(null));
      polygonsRef.current = [];
    }

    if (viewMode === 'marker') {
      renderMarkers();
    } else if (viewMode === 'hotspot') {
      renderHotspotDistricts();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapReady, locations, globalDistrictStats, viewMode]); // districtCounts 의존성 제거

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

        // [수정] 이전 상태 복구 (sessionStorage)
        const savedPos = sessionStorage.getItem('safeguard_map_state');
        let center = new window.kakao.maps.LatLng(37.5665, 126.9780);
        let level = 7;

        if (savedPos) {
          try {
            const parsed = JSON.parse(savedPos);
            center = new window.kakao.maps.LatLng(parsed.lat, parsed.lng);
            level = parsed.level;
          } catch (e) { console.error(e); }
        }

        const options = { center, level };
        const map = new window.kakao.maps.Map(container, options);
        mapRef.current = map;

        // [추가] map 생성 완료 플래그
        setMapReady(true);

        // idle 이벤트: 이동/줌 끝날 때마다 bounds 재조회
        // [수정] 리스너 내에서 직접 fetchLocations를 호출하면 클로저 문제가 생기므로 Ref 사용
        idleListenerRef.current = window.kakao.maps.event.addListener(map, 'idle', () => {
          // [추가] 상태 저장
          const center = map.getCenter();
          sessionStorage.setItem('safeguard_map_state', JSON.stringify({
            lat: center.getLat(),
            lng: center.getLng(),
            level: map.getLevel()
          }));

          if (fetchLocationsRef.current) {
            fetchLocationsRef.current();
          }
        });

        // mapReady가 true가 되면 useEffect에서 자동으로 최초 fetchLocations를 수행하므로
        // 여기서 명시적으로 호출할 필요 없음 (중복 호출 방지)
        // fetchLocations();

        // [추가] 지도 클릭 시 오버레이 닫기
        window.kakao.maps.event.addListener(map, 'click', () => {
          // 폴리곤 클릭에 의한 이벤트인 경우 무시
          if (polygonClickedRef.current) {
            console.log("[Map] Click ignored due to polygon click");
            return;
          }

          setSelectedHotspot(null);
          if (customOverlayRef.current) {
            customOverlayRef.current.setMap(null);
            customOverlayRef.current = null;
          }
        });
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
          marginTop: '40px',
          position: 'relative',
          zIndex: 10
        }}>
          {/* 지도 영역 */}
          <div style={{
            backgroundColor: 'white',
            borderRadius: '24px',
            overflow: 'hidden',
            boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
            height: '1000px',
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
                <span style={{ fontWeight: '600', color: '#1e293b' }}>
                  {loading ? '갱신 중...' : `${locations.length}건`}
                </span>
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

            {/* 지도 컨트롤 패널 (우측 상단) */}
            <div style={{
              position: 'absolute',
              top: '20px',
              right: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              zIndex: 100
            }}>
              {/* 뷰 모드 토글 */}
              <div style={{
                backgroundColor: 'rgba(255, 255, 255, 0.8)',
                backdropFilter: 'blur(12px)',
                padding: '4px',
                borderRadius: '14px',
                boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
                display: 'flex',
                gap: '4px',
                border: '1px solid rgba(255, 255, 255, 0.5)'
              }}>
                <button
                  onClick={() => setViewMode('marker')}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '10px',
                    border: 'none',
                    backgroundColor: viewMode === 'marker' ? '#7c3aed' : 'transparent',
                    color: viewMode === 'marker' ? 'white' : '#64748b',
                    fontWeight: '700',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    fontSize: '0.85rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <span style={{ fontSize: '1rem' }}>📍</span> 마커
                </button>
                <button
                  onClick={() => setViewMode('hotspot')}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '10px',
                    border: 'none',
                    backgroundColor: viewMode === 'hotspot' ? '#7c3aed' : 'transparent',
                    color: viewMode === 'hotspot' ? 'white' : '#64748b',
                    fontWeight: '700',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    fontSize: '0.85rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <span style={{ fontSize: '1rem' }}>🔥</span> 핫스팟
                </button>
              </div>

              {/* 필터 컨트롤 */}
              <div style={{
                backgroundColor: 'rgba(255, 255, 255, 0.8)',
                backdropFilter: 'blur(12px)',
                padding: '10px',
                borderRadius: '14px',
                boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                border: '1px solid rgba(255, 255, 255, 0.5)'
              }}>
                <div style={{
                  fontSize: '0.75rem',
                  fontWeight: '700',
                  color: '#94a3b8',
                  paddingLeft: '4px',
                  marginBottom: '2px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  <span style={{ fontSize: '0.9rem' }}>🔍</span> 상세 필터
                </div>
                <button
                  onClick={() => setShowCompleted(!showCompleted)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '10px',
                    border: 'none',
                    backgroundColor: showCompleted ? '#22c55e' : '#f1f5f9',
                    color: showCompleted ? 'white' : '#64748b',
                    fontWeight: '700',
                    cursor: 'pointer',
                    fontSize: '0.8rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    transition: 'all 0.2s',
                    justifyContent: 'flex-start'
                  }}
                >
                  <div style={{
                    width: '16px',
                    height: '16px',
                    borderRadius: '4px',
                    backgroundColor: showCompleted ? 'rgba(255,255,255,0.3)' : '#e2e8f0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.7rem'
                  }}>
                    {showCompleted && '✓'}
                  </div>
                  완료 민원 표시
                </button>

                {isAdmin && (
                  <button
                    onClick={() => setMyAssignedOnly(!myAssignedOnly)}
                    style={{
                      padding: '8px 12px',
                      borderRadius: '10px',
                      border: 'none',
                      backgroundColor: myAssignedOnly ? '#7c3aed' : '#f1f5f9',
                      color: myAssignedOnly ? 'white' : '#64748b',
                      fontWeight: '700',
                      cursor: 'pointer',
                      fontSize: '0.8rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      transition: 'all 0.2s',
                      justifyContent: 'flex-start'
                    }}
                  >
                    <div style={{
                      width: '16px',
                      height: '16px',
                      borderRadius: '4px',
                      backgroundColor: myAssignedOnly ? 'rgba(255,255,255,0.3)' : '#e2e8f0',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.7rem'
                    }}>
                      {myAssignedOnly && '✓'}
                    </div>
                    내 담당 민원만
                  </button>
                )}
              </div>
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
            height: '1000px'
          }}>
            <div style={{
              padding: '24px',
              borderBottom: '1px solid #f1f5f9',
              backgroundColor: selectedHotspot ? '#f5f3ff' : 'transparent',
              transition: 'background-color 0.3s'
            }}>
              {selectedHotspot ? (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: '0.85rem', color: '#7c3aed', fontWeight: '700', marginBottom: '2px' }}>선택된 구역</div>
                    <h3 style={{ fontSize: '1.4rem', fontWeight: '800', color: '#1e293b', margin: 0 }}>
                      {selectedHotspot.name}
                    </h3>
                    <div style={{ fontSize: '0.9rem', color: '#64748b', marginTop: '2px' }}>
                      총 <span style={{ color: '#7c3aed', fontWeight: '750' }}>{selectedHotspot.count}</span>건의 민원
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedHotspot(null);
                      if (customOverlayRef.current) {
                        customOverlayRef.current.setMap(null);
                        customOverlayRef.current = null;
                      }
                    }}
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      border: 'none',
                      backgroundColor: 'rgba(0,0,0,0.05)',
                      color: '#64748b',
                      fontSize: '1.2rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.2s'
                    }}
                  >
                    ×
                  </button>
                </div>
              ) : (
                <h3 style={{
                  fontSize: '1.2rem',
                  fontWeight: '700',
                  color: '#1e293b',
                  margin: 0,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  📍 현재 영역 민원
                </h3>
              )}
            </div>

            {/* 사이드바 필터 UI (새로 추가) */}
            <div style={{ padding: '20px', borderBottom: '1px solid #f1f5f9', backgroundColor: '#f8fafc' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <select
                    value={sidebarCategory}
                    onChange={(e) => setSidebarCategory(e.target.value)}
                    style={{ flex: 1, padding: '8px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.85rem' }}
                  >
                    {['전체', '교통', '행정·안전', '도로', '산업·통상', '주택·건축', '교육', '경찰·검찰', '환경', '보건', '관광', '기타'].map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                  <select
                    value={sidebarStatus}
                    onChange={(e) => setSidebarStatus(e.target.value)}
                    style={{ flex: 1, padding: '8px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.85rem' }}
                  >
                    {['전체', '미처리', '처리중', '처리완료'].map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <input
                  type="text"
                  placeholder="제목 또는 주소 검색"
                  value={sidebarSearch}
                  onChange={(e) => setSidebarSearch(e.target.value)}
                  style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.85rem' }}
                />
              </div>
            </div>

            {/* 기존 선택된 민원 카드 영역 제거 (Popup으로 대체됨) */}

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
                🕐 지역 민원 목록
              </h4>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {paginatedLocations.length === 0 && !loading && (
                  <div style={{
                    textAlign: 'center',
                    padding: '40px 20px',
                    color: '#94a3b8'
                  }}>
                    <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>📭</div>
                    <p>조건에 맞는 민원이 없습니다</p>
                  </div>
                )}

                {paginatedLocations.map((loc) => (
                  <div
                    key={loc.complaintNo}
                    onClick={() => {
                      if (viewMode !== 'marker') setViewMode('marker');
                      showComplaintOverlay(loc);
                      if (mapRef.current) {
                        mapRef.current.setCenter(new window.kakao.maps.LatLng(loc.lat, loc.lng));
                      }
                    }}
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

              {/* 페이지네이션 컨트롤 */}
              {totalSidebarPages > 1 && (
                <div style={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '16px 0',
                  marginTop: '10px',
                  borderTop: '1px solid #f1f5f9'
                }}>
                  <button
                    onClick={() => setSidebarPage(p => Math.max(1, p - 1))}
                    disabled={sidebarPage === 1}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '8px',
                      border: '1px solid #e2e8f0',
                      backgroundColor: 'white',
                      cursor: sidebarPage === 1 ? 'not-allowed' : 'pointer',
                      opacity: sidebarPage === 1 ? 0.5 : 1,
                      fontSize: '0.8rem',
                      fontWeight: '600',
                      color: '#64748b'
                    }}
                  >
                    이전
                  </button>
                  <span style={{ fontSize: '0.85rem', fontWeight: '700', color: '#1e293b' }}>
                    {sidebarPage} / {totalSidebarPages}
                  </span>
                  <button
                    onClick={() => setSidebarPage(p => Math.min(totalSidebarPages, p + 1))}
                    disabled={sidebarPage === totalSidebarPages}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '8px',
                      border: '1px solid #e2e8f0',
                      backgroundColor: 'white',
                      cursor: sidebarPage === totalSidebarPages ? 'not-allowed' : 'pointer',
                      opacity: sidebarPage === totalSidebarPages ? 0.5 : 1,
                      fontSize: '0.8rem',
                      fontWeight: '600',
                      color: '#64748b'
                    }}
                  >
                    다음
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div style={{ height: '40px' }}></div>
      </div>
    </div>
  );
}

export default MapView;

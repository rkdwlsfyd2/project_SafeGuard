import React, { useEffect, useRef } from 'react';

function MapView() {
    const mapContainer = useRef(null);

    useEffect(() => {
        if (!window.kakao || !window.kakao.maps) {
            console.error('Kakao Maps API not loaded');
            return;
        }

        const options = {
            center: new window.kakao.maps.LatLng(37.5665, 126.9780), // Seoul
            level: 7
        };

        const map = new window.kakao.maps.Map(mapContainer.current, options);

        // Marker Clusterer
        const clusterer = new window.kakao.maps.MarkerClusterer({
            map: map,
            gridSize: 35,
            averageCenter: true,
            minLevel: 6,
            disableClickZoom: true,
            styles: [{
                width: '53px', height: '52px',
                background: 'rgba(255, 80, 80, .8)',
                borderRadius: '50%',
                color: '#fff',
                textAlign: 'center',
                fontWeight: 'bold',
                lineHeight: '54px'
            }]
        });

        // Mock markers
        const positions = [
            { lat: 37.5665, lng: 126.9780 },
            { lat: 37.5675, lng: 126.9790 },
            { lat: 37.5655, lng: 126.9770 },
            { lat: 37.5700, lng: 126.9800 },
            { lat: 37.5600, lng: 126.9700 }
        ];

        const markers = positions.map(pos => {
            return new window.kakao.maps.Marker({
                position: new window.kakao.maps.LatLng(pos.lat, pos.lng)
            });
        });

        clusterer.addMarkers(markers);

        // Initial cluster visualization (simulation)
        window.kakao.maps.event.addListener(clusterer, 'clusterclick', function (cluster) {
            const level = map.getLevel() - 1;
            map.setLevel(level, { anchor: cluster.getCenter() });
        });

    }, []);

    return (
        <div className="map-page" style={{ padding: '40px 0' }}>
            <div className="container">
                <h2 style={{ color: 'var(--primary-dark)', marginBottom: '30px', fontSize: '2rem' }}>신고현황 지도</h2>

                {/* Filter Bar */}
                <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', alignItems: 'center', backgroundColor: 'white', padding: '15px', borderRadius: '8px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
                    <select style={{ padding: '8px', borderRadius: '4px', border: '1px solid #DDD' }}>
                        <option>유형을 선택해 주세요.</option>
                    </select>
                    <input type="date" style={{ padding: '8px', borderRadius: '4px', border: '1px solid #DDD' }} defaultValue="2025-12-24" />
                    <span>~</span>
                    <input type="date" style={{ padding: '8px', borderRadius: '4px', border: '1px solid #DDD' }} defaultValue="2025-12-31" />
                    <button style={{ marginLeft: 'auto', padding: '8px 20px', backgroundColor: 'var(--primary-color)', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>위치 찾기</button>
                    <input type="text" style={{ padding: '8px', border: '1px solid #DDD', borderRadius: '4px' }} />
                    <button style={{ padding: '8px 20px', backgroundColor: '#555', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>검색</button>
                </div>

                {/* Map Container */}
                <div
                    ref={mapContainer}
                    style={{ width: '100%', height: '600px', backgroundColor: '#EEE', borderRadius: '12px', overflow: 'hidden', position: 'relative' }}
                >
                    {/* Zoom Controls (Kakao UI) */}
                </div>

                {/* Legend */}
                <div style={{ marginTop: '20px', display: 'flex', flexWrap: 'wrap', gap: '15px', fontSize: '0.85rem', color: '#666' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><span style={{ width: '12px', height: '12px', backgroundColor: '#FF5050', borderRadius: '50%' }}></span> 도로/시설물 파손 및 고장</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><span style={{ width: '12px', height: '12px', backgroundColor: '#4CAF50', borderRadius: '50%' }}></span> 환경오염/청결 파손 및 고장</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><span style={{ width: '12px', height: '12px', backgroundColor: '#2196F3', borderRadius: '50%' }}></span> 대중교통/교통 시설 불편</div>
                </div>
            </div>
        </div>
    );
}

export default MapView;

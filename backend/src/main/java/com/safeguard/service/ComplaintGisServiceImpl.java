package com.safeguard.service;

import com.safeguard.dto.*;
import jakarta.persistence.EntityManager;
import jakarta.persistence.Query;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.sql.Timestamp;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ComplaintGisServiceImpl implements ComplaintGisService {

    private final EntityManager em;

    @Override
    public List<MapItemDto> getMapItems(MapSearchRequest req) {
        validateBounds(req);

        if (useCluster(req)) {
            return queryClusters(req);
        }
        return queryMarkers(req);
    }

    @Override
    public PageResponse<ComplaintListItemDto> listComplaints(MapSearchRequest req, int page, int size) {
        validateBounds(req);

        int safeSize = Math.max(1, Math.min(size, 100));
        int safePage = Math.max(0, page);
        int offset = safePage * safeSize;

        // content 조회
        StringBuilder sql = new StringBuilder("""
            SELECT
              c.complaint_no,
              c.category,
              c.title,
              c.status::text,
              c.created_date,
              sf.addr_text,
              sf.admin_code,
              ST_Y(sf.geom) AS lat,
              ST_X(sf.geom) AS lng
            FROM complaint c
            JOIN spatial_feature sf ON sf.complaint_no = c.complaint_no
        """);

        appendCommonWhere(sql, req);
        sql.append(" ORDER BY c.created_date DESC LIMIT :limit OFFSET :offset");

        Query q = em.createNativeQuery(sql.toString());
        bindCommonParams(q, req);
        q.setParameter("limit", safeSize);
        q.setParameter("offset", offset);

        @SuppressWarnings("unchecked")
        List<Object[]> rows = q.getResultList();

        List<ComplaintListItemDto> content = new ArrayList<>(rows.size());
        for (Object[] r : rows) {
            content.add(new ComplaintListItemDto(
                    toLong(r[0]),
                    (String) r[1],
                    (String) r[2],
                    (String) r[3],
                    toOffsetDateTime(r[4]),
                    (String) r[5],
                    (String) r[6],
                    toDouble(r[7]),
                    toDouble(r[8])
            ));
        }

        // total count
        StringBuilder cntSql = new StringBuilder("""
            SELECT COUNT(*)
            FROM complaint c
            JOIN spatial_feature sf ON sf.complaint_no = c.complaint_no
        """);
        appendCommonWhere(cntSql, req);

        Query cq = em.createNativeQuery(cntSql.toString());
        bindCommonParams(cq, req);

        long total = ((Number) cq.getSingleResult()).longValue();

        return new PageResponse<>(content, safePage, safeSize, total);
    }

    /* -------------------------
       내부 분기 기준 (줌 -> 클러스터/마커)
     ------------------------- */
    private boolean useCluster(MapSearchRequest req) {
        // 카카오맵은 보통 level이 클수록 줌아웃 → 클러스터로 전환
        // 프로젝트에 맞게 숫자만 조절하면 됨.
        Integer z = req.getZoom();
        return z != null && z >= 6;
    }

    /* -------------------------
       마커 조회
     ------------------------- */
    private List<MapItemDto> queryMarkers(MapSearchRequest req) {
        int limit = normalizeLimit(req.getLimit(), 2000, 10000);

        StringBuilder sql = new StringBuilder("""
            SELECT
              c.complaint_no,
              c.category,
              c.title,
              c.status::text,
              ST_Y(sf.geom) AS lat,
              ST_X(sf.geom) AS lng,
              sf.addr_text
            FROM complaint c
            JOIN spatial_feature sf ON sf.complaint_no = c.complaint_no
        """);

        appendCommonWhere(sql, req);
        sql.append(" ORDER BY c.created_date DESC LIMIT :limit");

        Query q = em.createNativeQuery(sql.toString());
        bindCommonParams(q, req);
        q.setParameter("limit", limit);

        @SuppressWarnings("unchecked")
        List<Object[]> rows = q.getResultList();

        List<MapItemDto> out = new ArrayList<>(rows.size());
        for (Object[] r : rows) {
            out.add(new MapItemDto(
                    MapItemType.MARKER,
                    toDouble(r[4]),
                    toDouble(r[5]),
                    toLong(r[0]),
                    (String) r[1],
                    (String) r[2],
                    (String) r[3],
                    (String) r[6],
                    null,
                    null
            ));
        }
        return out;
    }

    /* -------------------------
       클러스터 조회 (grid 집계)
     ------------------------- */
    private List<MapItemDto> queryClusters(MapSearchRequest req) {
        // 클러스터는 마커보다 더 많이 내려줘도 가볍지만, 그래도 상한은 두는 게 안전
        int limit = normalizeLimit(req.getLimit(), 20000, 50000);
        double gridDeg = zoomToGridDeg(req.getZoom());

        StringBuilder sql = new StringBuilder("""
            WITH filtered AS (
              SELECT sf.geom
              FROM complaint c
              JOIN spatial_feature sf ON sf.complaint_no = c.complaint_no
        """);

        appendCommonWhere(sql, req);
        sql.append(" LIMIT :limit ) ");

        sql.append("""
            SELECT
              ST_Y(ST_Centroid(ST_Collect(geom))) AS lat,
              ST_X(ST_Centroid(ST_Collect(geom))) AS lng,
              COUNT(*) AS cnt,
              ST_AsText(ST_Envelope(ST_Collect(geom))) AS cluster_key
            FROM filtered
            GROUP BY ST_SnapToGrid(geom, :gridDeg)
        """);

        Query q = em.createNativeQuery(sql.toString());
        bindCommonParams(q, req);
        q.setParameter("limit", limit);
        q.setParameter("gridDeg", gridDeg);

        @SuppressWarnings("unchecked")
        List<Object[]> rows = q.getResultList();

        List<MapItemDto> out = new ArrayList<>(rows.size());
        for (Object[] r : rows) {
            out.add(new MapItemDto(
                    MapItemType.CLUSTER,
                    toDouble(r[0]),
                    toDouble(r[1]),
                    null, null, null, null, null,
                    ((Number) r[2]).intValue(),
                    (String) r[3]
            ));
        }
        return out;
    }

    /* -------------------------
       공통 WHERE + 파라미터 바인딩
     ------------------------- */
    private void appendCommonWhere(StringBuilder sql, MapSearchRequest req) {
        sql.append("""
            WHERE sf.feature_type = 'POINT'
              AND sf.geom && ST_MakeEnvelope(:swLng, :swLat, :neLng, :neLat, 4326)
        """);

        if (StringUtils.hasText(req.getCategory())) {
            sql.append(" AND c.category = :category");
        }
        if (StringUtils.hasText(req.getStatus())) {
            // complaint.status가 enum 타입(complaint_status)이라 캐스팅
            sql.append(" AND c.status = CAST(:status AS complaint_status)");
        }
        if (StringUtils.hasText(req.getAdminCode())) {
            sql.append(" AND sf.admin_code = :adminCode");
        }
        if (req.getFrom() != null) {
            sql.append(" AND c.created_date >= :from");
        }
        if (req.getTo() != null) {
            sql.append(" AND c.created_date < :to");
        }
    }

    private void bindCommonParams(Query q, MapSearchRequest req) {
        q.setParameter("swLng", req.getSwLng());
        q.setParameter("swLat", req.getSwLat());
        q.setParameter("neLng", req.getNeLng());
        q.setParameter("neLat", req.getNeLat());

        if (StringUtils.hasText(req.getCategory())) q.setParameter("category", req.getCategory());
        if (StringUtils.hasText(req.getStatus())) q.setParameter("status", req.getStatus());
        if (StringUtils.hasText(req.getAdminCode())) q.setParameter("adminCode", req.getAdminCode());

        if (req.getFrom() != null) q.setParameter("from", Timestamp.from(req.getFrom().toInstant()));
        if (req.getTo() != null) q.setParameter("to", Timestamp.from(req.getTo().toInstant()));
    }

    /* -------------------------
       유틸: validate / normalize / zoom grid
     ------------------------- */
    private void validateBounds(MapSearchRequest req) {
        if (req.getSwLat() == null || req.getSwLng() == null || req.getNeLat() == null || req.getNeLng() == null) {
            throw new IllegalArgumentException("Bounds(swLat, swLng, neLat, neLng)는 필수입니다.");
        }
    }

    private int normalizeLimit(Integer limit, int defaultVal, int maxVal) {
        if (limit == null || limit <= 0) return defaultVal;
        return Math.min(limit, maxVal);
    }

    private double zoomToGridDeg(Integer zoom) {
        // 감 잡는 기본치(나중에 실제 화면에서 조절)
        if (zoom == null) return 0.02;
        return switch (zoom) {
            case 1, 2, 3 -> 0.005;
            case 4, 5    -> 0.01;
            case 6, 7    -> 0.02;
            default      -> 0.04;
        };
    }

    /* -------------------------
       타입 변환
     ------------------------- */
    private static Long toLong(Object o) {
        if (o == null) return null;
        if (o instanceof Number n) return n.longValue();
        return Long.parseLong(o.toString());
    }

    private static Double toDouble(Object o) {
        if (o == null) return null;
        if (o instanceof Number n) return n.doubleValue();
        return Double.parseDouble(o.toString());
    }

    private static OffsetDateTime toOffsetDateTime(Object o) {
        if (o == null) return null;
        if (o instanceof OffsetDateTime odt) return odt;
        if (o instanceof Timestamp ts) return ts.toInstant().atOffset(ZoneOffset.UTC);
        return null;
    }
}

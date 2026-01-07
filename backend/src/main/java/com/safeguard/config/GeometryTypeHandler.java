package com.safeguard.config;

import org.apache.ibatis.type.BaseTypeHandler;
import org.apache.ibatis.type.JdbcType;
import org.apache.ibatis.type.MappedTypes;
import org.locationtech.jts.geom.Geometry;
import org.locationtech.jts.io.ParseException;
import org.locationtech.jts.io.WKTReader;
import org.locationtech.jts.io.WKTWriter;

import java.sql.CallableStatement;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;

@MappedTypes(Geometry.class)
public class GeometryTypeHandler extends BaseTypeHandler<Geometry> {

    @Override
    public void setNonNullParameter(PreparedStatement ps, int i, Geometry parameter, JdbcType jdbcType)
            throws SQLException {
        ps.setString(i, new WKTWriter().write(parameter));
    }

    @Override
    public Geometry getNullableResult(ResultSet rs, String columnName) throws SQLException {
        return parseGeometry(rs.getString(columnName));
    }

    @Override
    public Geometry getNullableResult(ResultSet rs, int columnIndex) throws SQLException {
        return parseGeometry(rs.getString(columnIndex));
    }

    @Override
    public Geometry getNullableResult(CallableStatement cs, int columnIndex) throws SQLException {
        return parseGeometry(cs.getString(columnIndex));
    }

    private Geometry parseGeometry(String wkt) {
        if (wkt == null) {
            return null;
        }
        try {
            return new WKTReader().read(wkt);
        } catch (ParseException e) {
            return null;
        }
    }
}

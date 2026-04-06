package pt.trevo.trevo_api.persistence.entity;

import java.io.Serializable;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Types;

import org.hibernate.engine.spi.SharedSessionContractImplementor;
import org.hibernate.usertype.UserType;

/**
 * Custom Hibernate user type for PostgreSQL native ENUM types.
 * Compatible with Hibernate 6+ (Spring Boot 4.0+).
 * 
 * Handles conversion between Java Enums and PostgreSQL enum values.
 * 
 * Usage in entity:
 * &#64;Enumerated(EnumType.STRING)
 * &#64;Type(PostgreSQLEnumType.class)
 * private YourEnum field;
 */
@SuppressWarnings({"unchecked", "rawtypes"})
public class PostgreSQLEnumType implements UserType<Enum<?>> {

    @Override
    public int getSqlType() {
        return Types.OTHER;
    }

    @Override
    public Class<Enum<?>> returnedClass() {
        return (Class<Enum<?>>) (Class) Enum.class;
    }

    @Override
    public boolean equals(Enum<?> x, Enum<?> y) {
        return x == y;
    }

    @Override
    public int hashCode(Enum<?> x) {
        return x == null ? 0 : x.hashCode();
    }

    @Override
    public Enum<?> nullSafeGet(ResultSet rs, int position, SharedSessionContractImplementor session, Object owner)
            throws SQLException {
        String value = rs.getString(position);
        if (rs.wasNull()) {
            return null;
        }
        Class<?> clazz = returnedClass();
        return Enum.valueOf((Class) clazz, value);
    }

    @Override
    public void nullSafeSet(PreparedStatement st, Enum<?> value, int index, SharedSessionContractImplementor session)
            throws SQLException {
        if (value == null) {
            st.setNull(index, Types.OTHER);
        } else {
            st.setObject(index, value.name(), Types.OTHER);
        }
    }

    @Override
    public Enum<?> deepCopy(Enum<?> value) {
        return value;
    }

    @Override
    public boolean isMutable() {
        return false;
    }

    @Override
    public Serializable disassemble(Enum<?> value) {
        return value == null ? null : value.name();
    }

    @Override
    public Enum<?> assemble(Serializable cached, Object owner) {
        if (cached == null) {
            return null;
        }
        Class<?> clazz = returnedClass();
        return Enum.valueOf((Class) clazz, (String) cached);
    }
}


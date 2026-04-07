package pt.trevo.trevo_api.persistence.entity;

import java.io.Serializable;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Types;
import java.util.Properties;

import org.hibernate.engine.spi.SharedSessionContractImplementor;
import org.hibernate.usertype.DynamicParameterizedType;
import org.hibernate.usertype.UserType;

/**
 * Custom Hibernate user type for PostgreSQL native ENUM types.
 * Compatible with Hibernate 6+ (Spring Boot 4.0+).
 * Implements DynamicParameterizedType to capture the concrete enum class at runtime.
 * 
 * Note: DynamicParameterizedType is deprecated in Hibernate 7.0 but works reliably in Hibernate 6.
 * This implementation will need migration to a newer pattern in future major versions.
 * 
 * Handles conversion between Java Enums and PostgreSQL enum values.
 * 
 * Usage in entity:
 * &#64;Enumerated(EnumType.STRING)
 * &#64;Type(PostgreSQLEnumType.class)
 * private YourEnum field;
 */
@SuppressWarnings("unchecked")
public class PostgreSQLEnumType implements UserType<Enum<?>>, DynamicParameterizedType {

    private Class<? extends Enum<?>> enumClass;

    @Override
    public void setParameterValues(Properties parameters) {
        String className = parameters.getProperty("enumClass");
        if (className != null) {
            try {
                this.enumClass = (Class<? extends Enum<?>>) Class.forName(className);
            } catch (ClassNotFoundException e) {
                throw new IllegalArgumentException("Enum class not found: " + className, e);
            }
        } else {
            // Fallback: use the returnedClass parameter from Hibernate
            String returnedClass = parameters.getProperty("returnedClass");
            if (returnedClass != null) {
                try {
                    this.enumClass = (Class<? extends Enum<?>>) Class.forName(returnedClass);
                } catch (ClassNotFoundException e) {
                    throw new IllegalArgumentException("Enum class not found: " + returnedClass, e);
                }
            }
        }
    }

    @Override
    public int getSqlType() {
        // Types.VARCHAR allows Hibernate DDL generation (create-drop) to map this column.
        // Actual JDBC binding uses Types.OTHER in nullSafeSet, which works for both
        // PostgreSQL native ENUM columns (production/Flyway) and VARCHAR (create-drop tests).
        return Types.VARCHAR;
    }

    @Override
    public Class<Enum<?>> returnedClass() {
        return (Class<Enum<?>>) (Class<?>) enumClass;
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
        if (enumClass == null) {
            throw new IllegalStateException("Enum class not initialized. Check @Type annotation configuration.");
        }
        return valueOf(enumClass, value);
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
        if (enumClass == null) {
            throw new IllegalStateException("Enum class not initialized. Check @Type annotation configuration.");
        }
        return valueOf(enumClass, (String) cached);
    }

    /**
     * Helper method to handle generic type casting for Enum.valueOf
     */
    private static <E extends Enum<E>> E valueOf(Class<? extends Enum<?>> enumClass, String name) {
        return Enum.valueOf((Class<E>) enumClass, name);
    }
}



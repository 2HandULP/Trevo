package pt.trevo.trevo_api;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;

@SpringBootTest(properties = {
	"spring.autoconfigure.exclude=" +
		"org.springframework.boot.jdbc.autoconfigure.DataSourceAutoConfiguration," +
		"org.springframework.boot.hibernate.autoconfigure.HibernateJpaAutoConfiguration," +
		"org.springframework.boot.flyway.autoconfigure.FlywayAutoConfiguration"
})
class TrevoApiApplicationTests {

	@Test
	void contextLoads() {
	}

}

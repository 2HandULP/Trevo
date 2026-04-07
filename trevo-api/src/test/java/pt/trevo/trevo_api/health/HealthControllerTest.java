package pt.trevo.trevo_api.health;

import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.web.client.RestClient;
import pt.trevo.trevo_api.BaseIntegrationTest;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class HealthControllerTest extends BaseIntegrationTest {

	@LocalServerPort
	private int port;

	@Test
	void shouldReturnApplicationHealth() throws Exception {
		String responseBody = RestClient.create()
			.get()
			.uri("http://localhost:" + port + "/api/health")
			.retrieve()
			.body(String.class);

		assertTrue(responseBody != null && responseBody.contains("\"status\":\"UP\""));
	}
}

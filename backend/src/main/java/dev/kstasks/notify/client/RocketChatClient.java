package dev.kstasks.notify.client;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.util.List;
import java.util.Map;
import java.util.Optional;

@Component
public class RocketChatClient {

    private static final int CONNECT_TIMEOUT_MS = 10_000;
    private static final int READ_TIMEOUT_MS = 15_000;

    private final RestClient restClient;

    public RocketChatClient(@Value("${app.notify.rocketchat.base-url}") String baseUrl,
                             @Value("${app.notify.rocketchat.token}") String token,
                             @Value("${app.notify.rocketchat.user-id}") String userId) {
        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(CONNECT_TIMEOUT_MS);
        requestFactory.setReadTimeout(READ_TIMEOUT_MS);
        this.restClient = RestClient.builder()
                .baseUrl(baseUrl)
                .requestFactory(requestFactory)
                .defaultHeader("X-Auth-Token", token)
                .defaultHeader("X-User-Id", userId)
                .build();
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Room(String _id, String name, String fname) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    private record RoomsGetResponse(List<Room> update) {
    }

    public Optional<Room> findRoomByName(String name) {
        RoomsGetResponse response = restClient.get()
                .uri("/api/v1/rooms.get")
                .retrieve()
                .body(RoomsGetResponse.class);
        if (response == null || response.update() == null) {
            return Optional.empty();
        }
        return response.update().stream()
                .filter(r -> name.equalsIgnoreCase(r.name()) || name.equalsIgnoreCase(r.fname()))
                .findFirst();
    }

    public void sendMessage(String roomId, String message) {
        restClient.post()
                .uri("/api/v1/chat.sendMessage")
                .contentType(MediaType.APPLICATION_JSON)
                .body(Map.of("message", Map.of("rid", roomId, "msg", message)))
                .retrieve()
                .toBodilessEntity();
    }
}

package dev.kstasks;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class KsTasksApplication {
    public static void main(String[] args) {
        SpringApplication.run(KsTasksApplication.class, args);
    }
}

FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /app
COPY pom.xml .
RUN mvn -B -q dependency:go-offline
COPY src ./src
RUN mvn -B -q package -DskipTests

FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
RUN addgroup -S app && adduser -S app -G app
COPY --from=build /app/target/ks-tasks-backend.jar app.jar
RUN mkdir -p /app/data/documents && chown -R app:app /app/data
USER app
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "/app/app.jar"]


FROM eclipse-temurin:21-jdk AS build
WORKDIR /app

COPY backend/.mvn .mvn
COPY backend/mvnw backend/pom.xml ./
COPY backend/src src

RUN chmod +x mvnw
RUN ./mvnw clean package -DskipTests

FROM eclipse-temurin:21-jre
WORKDIR /app

COPY --from=build /app/target/*.jar app.jar
COPY data /data

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "app.jar"]

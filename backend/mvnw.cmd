@ECHO OFF
@REM Maven Wrapper startup script for Windows (classic downloader form).
@REM Downloads maven-wrapper.jar on first run (per .mvn/wrapper/maven-wrapper.properties)
@REM then delegates to it. Requires JAVA_HOME to be set, or `java` on PATH.
@REM If you prefer, install Maven yourself and run `mvn` instead of `mvnw.cmd`.

SETLOCAL

SET WRAPPER_JAR="%~dp0.mvn\wrapper\maven-wrapper.jar"
SET WRAPPER_PROPERTIES="%~dp0.mvn\wrapper\maven-wrapper.properties"
SET MAIN_CLASS=org.apache.maven.wrapper.MavenWrapperMain

IF NOT EXIST %WRAPPER_JAR% (
  ECHO Downloading Maven Wrapper...
  powershell -NoProfile -Command ^
    "$props = Get-Content '%WRAPPER_PROPERTIES%' | Where-Object { $_ -match '^wrapperUrl=' };" ^
    "$url = ($props -split '=',2)[1].Trim();" ^
    "Invoke-WebRequest -Uri $url -OutFile '%~dp0.mvn\wrapper\maven-wrapper.jar'"
)

IF "%JAVA_HOME%"=="" (
  SET JAVA_EXE=java
) ELSE (
  SET JAVA_EXE="%JAVA_HOME%\bin\java"
)

%JAVA_EXE% -cp %WRAPPER_JAR% %MAIN_CLASS% %*

ENDLOCAL

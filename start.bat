@echo off
echo Starting HiCaptain Project...
echo.

echo Starting Backend (Spring Boot)...
start cmd /k "cd backend && mvnw.cmd spring-boot:run"

echo Waiting for backend to start...
timeout /t 10 /nobreak >nul

echo Starting Frontend (Next.js)...
start cmd /k "cd frontend && npm install && npm run dev"

echo.
echo Both services are starting...
echo Backend will be available at: http://localhost:8080
echo Frontend will be available at: http://localhost:3000
echo.
echo Press any key to exit this script...
pause >nul
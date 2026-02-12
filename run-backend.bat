@echo off
cd /d "d:\in_project\test e-commerce\new1\New\ecommere\backend"
if "%DB_USERNAME%"=="" set DB_USERNAME=root
mvn spring-boot:run > "d:\in_project\test e-commerce\new1\New\ecommere\backend.log" 2>&1

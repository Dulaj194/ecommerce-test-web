@echo off
cd /d "d:\in_project\test e-commerce\new1\New\ecommere\backend"
set DB_USERNAME=root
set DB_PASSWORD=
mvn spring-boot:run > "d:\in_project\test e-commerce\new1\New\ecommere\backend.log" 2>&1

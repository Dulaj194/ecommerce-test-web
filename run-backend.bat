@echo off
cd /d "d:\in_project\test e-commerce\new1\New\ecommere\backend"
if "%DB_USERNAME%"=="" set DB_USERNAME=root
if "%CACHE_TYPE%"=="" set CACHE_TYPE=simple
if "%SESSION_STORE_TYPE%"=="" set SESSION_STORE_TYPE=none
mvn spring-boot:run > "d:\in_project\test e-commerce\new1\New\ecommere\backend.log" 2>&1

@echo off
start F:\mongodb\bin\mongod.exe
timeout 4
start F:\mongodb\bin\mongo.exe
exit
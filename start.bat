@echo off
chcp 65001 >nul
title TS 项目启动器


echo ===== 检测 Node.js 环境 =====

where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [错误] 未检测到 Node.js，请先安装 Node.js：
    echo 请访问 https://nodejs.org/ 安装 LTS 版本
    pause
    exit /b
)
echo ===== 自动启动 TS 项目 =====

REM 切换到 bat 所在目录
cd /d "%~dp0"

echo ===== 安装依赖（如果已安装会跳过） =====
call npm install

echo ===== 启动项目 =====
call npm run dev

echo ===== 项目已退出 =====
pause

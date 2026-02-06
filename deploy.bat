@echo off
chcp 65001 > nul
echo ==============================================
echo [길마루] GitHub 배포 자동화 스크립트
echo ==============================================
echo.

echo 1. 변경된 파일을 확인합니다...
git status
echo.

echo 2. 모든 변경사항을 스테이징합니다 (git add)...
git add .

set /p commit_msg="3. 커밋 메시지를 입력하세요 (엔터치면 'Update'로 자동 입력): "

if "%commit_msg%"=="" set commit_msg=Update

echo.
echo 4. 커밋을 진행합니다 (git commit)...
git commit -m "%commit_msg%"
echo.

echo 5. GitHub로 업로드합니다 (git push)...
git push

echo.
echo ==============================================
echo 배포가 완료되었습니다! 
echo 잠시 후 https://payolajoker.github.io/gilmaru/ 에서 확인하세요.
echo ==============================================
pause

@echo off
REM ShyftForce: scrub leaked .env from git history, then push to GitHub.
REM Double-click this file. Watch the output. When it says "DONE", close it.

cd /d D:\ShyftForce
echo.
echo === Step 1/3: Scrubbing .env files from every commit in history ===
echo.

set FILTER_BRANCH_SQUELCH_WARNING=1
git filter-branch --force --index-filter "git rm --cached --ignore-unmatch .env .env.bak .env.local .env.production .env.development" --prune-empty -- --all

if errorlevel 1 (
  echo.
  echo *** Filter-branch failed. Look at the error above. ***
  pause
  exit /b 1
)

echo.
echo === Step 2/3: Confirming .env is no longer in history ===
echo.
git log --all --full-history --oneline -- .env .env.bak .env.local .env.production
echo (If nothing was printed above this line, the scrub worked.)

echo.
echo === Step 3/3: Force-pushing the clean history to GitHub ===
echo.
git push -u origin main --force

if errorlevel 1 (
  echo.
  echo *** Push failed. If you see an auth error, you need a GitHub PAT. ***
  echo *** Tell Claude and we'll walk through that. ***
  pause
  exit /b 1
)

echo.
echo ============================================
echo  DONE. Code is now on GitHub. Close window.
echo ============================================
pause

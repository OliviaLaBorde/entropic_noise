@echo off
REM Deploy to GitHub Pages
REM Copies /dist folder contents to /docs for GitHub Pages deployment

echo.
echo ================================
echo   Deploying Entropic Noise
echo ================================
echo.

REM Create docs folder if it doesn't exist
if not exist "docs" (
    echo Creating docs folder...
    mkdir docs
)

REM Clear docs folder contents
echo Clearing docs folder...
if exist "docs\*" (
    del /q /s docs\* >nul 2>&1
    for /d %%p in (docs\*) do rmdir "%%p" /s /q >nul 2>&1
)

REM Copy all dist contents to docs
echo Copying dist contents to docs...
xcopy /E /I /Y dist\* docs\ >nul

REM Remove files not needed for deployment
echo Removing test files...
if exist "docs\_oldStuff" rmdir /s /q "docs\_oldStuff" >nul 2>&1
if exist "docs\tweakpane_test.html" del /q "docs\tweakpane_test.html" >nul 2>&1
if exist "docs\mic-test.html" del /q "docs\mic-test.html" >nul 2>&1

echo.
echo ================================
echo   Deployment Ready!
echo ================================
echo.
echo Next steps:
echo   1. Review changes in /docs folder
echo   2. Commit and push to GitHub:
echo      git add docs/
echo      git commit -m "Deploy to GitHub Pages"
echo      git push
echo.
echo Your site will be live at:
echo https://YOURUSERNAME.github.io/entropic_noise/
echo.
pause

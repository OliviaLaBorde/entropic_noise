Quick ways to serve this project over HTTP (recommended for loading presets)

1) Using Python (cross-platform)

   Open a terminal in the project root and run:

```powershell
python -m http.server 8000
```

Then open: http://localhost:8000/ (or your HTML file under /dist/)

2) Using npx http-server (Node.js)

```powershell
npx http-server -p 8000
```

3) Using the npm script (convenience)

```powershell
npm run start        # runs npx http-server -p 8000
npm run start:python # uses python -m http.server 8000
```

4) Windows helper (PowerShell)

Run the helper script from tools directory:

```powershell
.\tools\serve.ps1
```



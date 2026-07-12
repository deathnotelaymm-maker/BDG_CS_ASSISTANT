# Fix Windows Python backend error

The old v0.2.0 package pinned `pydantic==2.10.3`. On Python 3.14, that installs `pydantic-core==2.27.1`, which tries to compile with PyO3 and fails because that PyO3 version only supports up to Python 3.13.

v0.2.1 fixes this by using newer package ranges and by deleting old broken `.venv` folders automatically.

## Manual fix for old folders

```powershell
cd C:\Users\LENOVO\Downloads\one-domain-help-ai-admin-v0.2.0
Remove-Item -Recurse -Force .\backend\.venv
notepad .\backend\requirements.txt
```

Replace the file with:

```text
fastapi>=0.128.0,<1.0
uvicorn[standard]>=0.32.1,<1.0
sqlalchemy>=2.0.36,<3.0
pydantic>=2.12.0,<3.0
python-multipart>=0.0.19,<1.0
psycopg2-binary>=2.9.10,<3.0
email-validator>=2.2.0,<3.0
```

Then run:

```powershell
.\START-HERE-WINDOWS.bat
```

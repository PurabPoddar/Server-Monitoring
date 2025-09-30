# Server Portal (Flask + SQLAlchemy)

## Setup

1) Python 3.10+
2) Create venv and install deps
```
python -m venv .venv
.\\.venv\\Scripts\\activate
pip install -r requirements.txt
```

3) Configure environment
- Create `server-portal/.env` with:
```
SQLALCHEMY_DATABASE_URI=sqlite:///portal.db
```

## Run the app
```
$env:FLASK_APP = "server-portal.backend.app:app"
$env:FLASK_ENV = "development"
flask run --reload
```
App runs at `http://127.0.0.1:5000`.

Open `server-portal/frontend/index.html` in a browser. For CORS/local file, you can also serve the frontend with a simple server:
```
powershell -Command "cd server-portal/frontend; python -m http.server 8080"
```

## Notes
- Linux operations use SSH key auth (Paramiko). Provide `key_path` from the UI.
- Windows operations use WinRM (basic example). Provide `password` from the UI.
- Do not store plaintext passwords in the database.

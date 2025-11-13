import os
from flask import Flask
from flask_cors import CORS
from dotenv import load_dotenv

from .db import db


def create_app() -> Flask:
    load_dotenv()
    app = Flask(__name__)
    # CORS with explicit header support
    CORS(app, expose_headers=['X-Data-Mode'], allow_headers=['X-Data-Mode', 'Content-Type', 'Authorization'])

    database_url = os.getenv("SQLALCHEMY_DATABASE_URI", "sqlite:///portal.db")
    app.config["SQLALCHEMY_DATABASE_URI"] = database_url
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

    db.init_app(app)

    with app.app_context():
        from .api.server_routes import server_bp  # noqa: WPS433
        from .api.user_routes import user_bp  # noqa: WPS433
        from .api.auth_routes import auth_bp  # noqa: WPS433

        app.register_blueprint(server_bp, url_prefix="/api")
        app.register_blueprint(user_bp, url_prefix="/api")
        app.register_blueprint(auth_bp, url_prefix="/api/auth")

        db.create_all()

    return app


app = create_app()



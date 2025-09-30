from flask import Blueprint, jsonify

user_bp = Blueprint("user_bp", __name__)


@user_bp.route("/ping", methods=["GET"])
def ping():
    return jsonify({"status": "ok"})



from flask import Blueprint, request, jsonify
from datetime import datetime, timedelta
import jwt
import os

auth_bp = Blueprint('auth', __name__)

# Secret key for JWT (in production, use environment variable)
SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'your-secret-key-change-in-production')

# Demo users (in production, use database with hashed passwords)
DEMO_USERS = {
    'admin': {
        'id': 1,
        'username': 'admin',
        'password': 'admin123',  # In production, use hashed passwords
        'email': 'admin@servermonitor.com',
        'role': 'admin'
    },
    'user': {
        'id': 2,
        'username': 'user',
        'password': 'user123',
        'email': 'user@servermonitor.com',
        'role': 'user'
    }
}

@auth_bp.route('/login', methods=['POST'])
def login():
    """Login endpoint"""
    try:
        data = request.get_json()
        username = data.get('username')
        password = data.get('password')

        if not username or not password:
            return jsonify({'message': 'Username and password are required'}), 400

        # Check if user exists and password matches
        user = DEMO_USERS.get(username)
        if not user or user['password'] != password:
            return jsonify({'message': 'Invalid username or password'}), 401

        # Generate JWT token
        token_payload = {
            'user_id': user['id'],
            'username': user['username'],
            'role': user['role'],
            'exp': datetime.utcnow() + timedelta(days=7)  # Token expires in 7 days
        }
        token = jwt.encode(token_payload, SECRET_KEY, algorithm='HS256')

        return jsonify({
            'message': 'Login successful',
            'token': token,
            'user': {
                'id': user['id'],
                'username': user['username'],
                'email': user['email'],
                'role': user['role']
            }
        }), 200

    except Exception as e:
        return jsonify({'message': f'Login failed: {str(e)}'}), 500


@auth_bp.route('/verify', methods=['GET'])
def verify_token():
    """Verify JWT token"""
    try:
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({'message': 'No token provided'}), 401

        token = auth_header.split(' ')[1]
        
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=['HS256'])
            return jsonify({
                'message': 'Token is valid',
                'user': {
                    'id': payload['user_id'],
                    'username': payload['username'],
                    'role': payload['role']
                }
            }), 200
        except jwt.ExpiredSignatureError:
            return jsonify({'message': 'Token has expired'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'message': 'Invalid token'}), 401

    except Exception as e:
        return jsonify({'message': f'Token verification failed: {str(e)}'}), 500


@auth_bp.route('/logout', methods=['POST'])
def logout():
    """Logout endpoint (client-side token removal)"""
    return jsonify({'message': 'Logout successful'}), 200


@auth_bp.route('/register', methods=['POST'])
def register():
    """Register a new user"""
    try:
        data = request.get_json()
        username = data.get('username')
        email = data.get('email')
        password = data.get('password')

        if not username or not email or not password:
            return jsonify({'message': 'Username, email, and password are required'}), 400

        # Check if user already exists (in demo, just check against existing users)
        if username in DEMO_USERS:
            return jsonify({'message': 'Username already exists'}), 409

        # In production, you would:
        # 1. Hash the password using bcrypt or similar
        # 2. Store user in database
        # 3. Generate proper JWT token
        
        # For demo purposes, add user to DEMO_USERS and generate token
        user_id = len(DEMO_USERS) + 1
        DEMO_USERS[username] = {
            'id': user_id,
            'username': username,
            'password': password,  # In production, use hashed passwords
            'email': email,
            'role': 'user'
        }

        # Generate JWT token
        token_payload = {
            'user_id': user_id,
            'username': username,
            'role': 'user',
            'exp': datetime.utcnow() + timedelta(days=7)
        }
        token = jwt.encode(token_payload, SECRET_KEY, algorithm='HS256')

        return jsonify({
            'message': 'Registration successful',
            'token': token,
            'user': {
                'id': user_id,
                'username': username,
                'email': email,
                'role': 'user'
            }
        }), 201

    except Exception as e:
        return jsonify({'message': f'Registration failed: {str(e)}'}), 500


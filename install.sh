#!/bin/bash

# SHADOW-SARA Install Script (v3.1 - 2025)
# Educational tool only - Run with sudo on Ubuntu/Debian 22.04+

set -e  # Exit on error

echo "=== SHADOW-SARA Installation Started (2025 Edition) ==="
echo "Warning: Educational purposes only. Misuse is illegal."

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   echo "This script must be run as root (use sudo)."
   exit 1
fi

# Update system
echo "Updating system packages..."
apt-get update -y
apt-get upgrade -y

# Install core dependencies
echo "Installing core dependencies..."
apt-get install -y aapt wget python3 python3-pip zipalign imagemagick openjdk-17-jdk curl

# Verify Java 17+
JAVA_VERSION=$(java -version 2>&1 | awk -F '"' '/version/ {print $2}' | cut -d'.' -f1)
if [[ $JAVA_VERSION -lt 17 ]]; then
    echo "Error: Java 17+ required. Installed: $JAVA_VERSION"
    exit 1
fi
echo "Java 17+ verified: OK"

# Install latest APKTool (v2.12.1 - 2025)
echo "Installing APKTool v2.12.1..."
wget https://raw.githubusercontent.com/iBotPeaches/Apktool/master/scripts/linux/apktool -O /usr/bin/apktool
wget https://bitbucket.org/iBotPeaches/apktool/downloads/apktool_2.12.1.jar -O /usr/bin/apktool.jar
chmod +x /usr/bin/apktool /usr/bin/apktool.jar

# Verify APKTool
if ! apktool --version; then
    echo "Error: APKTool installation failed."
    exit 1
fi
echo "APKTool v2.12.1 verified: OK"

# Install Python dependencies from requirements.txt
echo "Installing Python dependencies..."
if [[ -f requirements.txt ]]; then
    pip3 install -r requirements.txt --upgrade
else
    pip3 install Flask==3.1.2 Flask-Login==0.6.3 Pillow==11.3.0 requests==2.32.3 Werkzeug==3.0.3
fi

# Optional: Check for Metasploit (user install)
echo "Checking for Metasploit (optional for trojan listener)..."
if ! command -v msfconsole &> /dev/null; then
    echo "Metasploit not found. Install manually: curl https://raw.githubusercontent.com/rapid7/metasploit-omnibus/master/config/templates/metasploit-framework-wrappers/msfupdate.erb > msfinstall && chmod 755 msfinstall && ./msfinstall"
fi

echo "=== Installation Complete! ==="
echo "Run: python3 app.py for web interface"
echo "Or: python3 Vector.py for CLI"
echo "Test: Check java -version, apktool --version, pip list | grep Flask"
echo "Reminder: Educational use only - Stay legal."
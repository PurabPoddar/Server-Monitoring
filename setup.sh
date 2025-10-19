#!/bin/bash

# Server Monitoring Project Setup Script
echo "🚀 Setting up Server Monitoring Project..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "requirements.txt" ]; then
    print_error "Please run this script from the project root directory"
    exit 1
fi

# Backend Setup
print_status "Setting up Python backend..."

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    print_status "Creating Python virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment and install dependencies
print_status "Installing Python dependencies..."
source venv/bin/activate
pip install -r requirements.txt

print_success "Backend dependencies installed!"

# Frontend Setup
print_status "Setting up frontend applications..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    print_warning "Node.js not found. Please install Node.js first:"
    echo "1. Visit https://nodejs.org/"
    echo "2. Download and install the LTS version"
    echo "3. Restart your terminal"
    echo ""
    print_status "Alternatively, you can install using nvm:"
    echo "curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash"
    echo "source ~/.zshrc"
    echo "nvm install --lts"
    echo "nvm use --lts"
    echo ""
    print_warning "Skipping frontend setup until Node.js is installed"
else
    print_success "Node.js found: $(node --version)"
    
    # Setup React Router v7 frontend
    if [ -d "frontend" ]; then
        print_status "Installing dependencies for React Router v7 frontend..."
        cd frontend
        npm install
        cd ..
        print_success "React Router v7 frontend dependencies installed!"
    fi
    
    # Setup Vite React frontend
    if [ -d "web" ]; then
        print_status "Installing dependencies for Vite React frontend..."
        cd web
        npm install
        cd ..
        print_success "Vite React frontend dependencies installed!"
    fi
fi

# Create startup scripts
print_status "Creating startup scripts..."

# Backend startup script
cat > start_backend.sh << 'EOF'
#!/bin/bash
cd /Users/stalin/Workspace/Server-Monitoring
source venv/bin/activate
python run_backend.py
EOF

chmod +x start_backend.sh

# Frontend startup scripts
if command -v node &> /dev/null; then
    # React Router v7 frontend startup script
    if [ -d "frontend" ]; then
        cat > start_frontend_router.sh << 'EOF'
#!/bin/bash
cd /Users/stalin/Workspace/Server-Monitoring/frontend
npm run dev
EOF
        chmod +x start_frontend_router.sh
    fi
    
    # Vite React frontend startup script
    if [ -d "web" ]; then
        cat > start_frontend_vite.sh << 'EOF'
#!/bin/bash
cd /Users/stalin/Workspace/Server-Monitoring/web
npm run dev
EOF
        chmod +x start_frontend_vite.sh
    fi
fi

print_success "Setup complete! 🎉"
echo ""
print_status "To start the applications:"
echo ""
echo "Backend (Flask API):"
echo "  ./start_backend.sh"
echo "  or: source venv/bin/activate && python run_backend.py"
echo "  URL: http://localhost:5000"
echo ""

if command -v node &> /dev/null; then
    if [ -d "frontend" ]; then
        echo "React Router v7 Frontend:"
        echo "  ./start_frontend_router.sh"
        echo "  or: cd frontend && npm run dev"
        echo "  URL: http://localhost:5173"
        echo ""
    fi
    
    if [ -d "web" ]; then
        echo "Vite React Frontend:"
        echo "  ./start_frontend_vite.sh"
        echo "  or: cd web && npm run dev"
        echo "  URL: http://localhost:5173"
        echo ""
    fi
else
    echo "Frontend applications:"
    echo "  Install Node.js first, then run:"
    if [ -d "frontend" ]; then
        echo "  cd frontend && npm install && npm run dev"
    fi
    if [ -d "web" ]; then
        echo "  cd web && npm install && npm run dev"
    fi
fi

echo ""
print_status "Project Structure:"
echo "  Backend: Flask API with SQLAlchemy"
echo "  Frontend 1: React Router v7 with Material-UI"
echo "  Frontend 2: Vite + React"
echo ""
print_status "API Endpoints available at:"
echo "  http://localhost:5000/api/"

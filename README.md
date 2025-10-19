# 🖥️ Server Monitoring Portal

A full-stack server monitoring application with authentication, real-time metrics, and a modern Material-UI interface.

## ✨ Features

- 🔐 **Authentication System** - Login/Registration with JWT tokens
- 📊 **Real-time Monitoring** - Track CPU, memory, disk, and network metrics
- 🎯 **Server Management** - Add, edit, and delete servers
- 📈 **Metrics & Analytics** - Individual server metrics with detailed charts
- 📋 **Reports** - Export server data in CSV/JSON format
- 👥 **User Management** - Admin panel for user control
- 🎨 **Modern UI** - Material-UI with responsive design
- 🌙 **Dark Mode** - Sleek dark theme interface

## 🚀 Quick Start

### Option 1: Docker Deployment (Recommended)

The easiest way to get started:

```bash
# Make sure Docker is installed
docker --version

# Deploy the application
./deploy.sh
```

The application will be available at:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000

**Demo Credentials:**
- Username: `admin`
- Password: `admin123`

### Option 2: Manual Setup

#### Prerequisites

- Python 3.9+
- Node.js 18+
- npm or yarn

#### Backend Setup

```bash
# Create and activate virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Start the backend
./start_backend.sh
# Or manually:
python run_backend.py
```

Backend API will run on: `http://localhost:5000`

#### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Frontend will run on: `http://localhost:5173`

## 🌐 Hosting Options

### 1. **Heroku** (Free/Paid)

**Backend:**
```bash
# Install Heroku CLI
heroku login
heroku create your-server-monitor-api

# Add buildpack
heroku buildpacks:set heroku/python

# Deploy
git push heroku main

# Set environment variables
heroku config:set JWT_SECRET_KEY=your-secret-key
heroku config:set FLASK_ENV=production
```

**Frontend:**
```bash
# Use Heroku's Node.js buildpack
cd frontend
heroku create your-server-monitor-app
heroku buildpacks:set heroku/nodejs
git subtree push --prefix frontend heroku main
```

### 2. **Railway** (Easy & Modern)

1. Go to [railway.app](https://railway.app)
2. Connect your GitHub repository
3. Create two services:
   - Backend: Auto-detects Python
   - Frontend: Auto-detects Node.js
4. Set environment variables in Railway dashboard
5. Deploy with one click!

### 3. **DigitalOcean App Platform**

1. Connect your GitHub repo to [DigitalOcean Apps](https://cloud.digitalocean.com/apps)
2. Configure services:
   - **Backend**: Python app on port 5000
   - **Frontend**: Node.js app on port 3000
3. Set environment variables
4. Deploy automatically on git push

### 4. **AWS (EC2 + Docker)**

```bash
# SSH into your EC2 instance
ssh -i your-key.pem ec2-user@your-ec2-ip

# Install Docker
sudo yum update -y
sudo yum install docker -y
sudo service docker start

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Clone your repo and deploy
git clone https://github.com/yourusername/Server-Monitoring.git
cd Server-Monitoring
./deploy.sh
```

### 5. **Render** (Free Tier Available)

**Backend:**
1. Go to [render.com](https://render.com)
2. New Web Service → Connect GitHub repo
3. Settings:
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `python -m flask run --host=0.0.0.0 --port=5000`
   - **Environment**: Python 3

**Frontend:**
1. New Static Site → Connect GitHub repo
2. Settings:
   - **Build Command**: `cd frontend && npm install && npm run build`
   - **Publish Directory**: `frontend/build`

### 6. **Vercel** (Frontend) + **Railway** (Backend)

**Frontend on Vercel:**
```bash
npm install -g vercel
cd frontend
vercel --prod
```

**Backend on Railway:**
- Connect GitHub repo
- Auto-deploys on push

### 7. **Google Cloud Platform (Cloud Run)**

```bash
# Build and push containers
gcloud builds submit --tag gcr.io/YOUR_PROJECT/backend
gcloud builds submit --tag gcr.io/YOUR_PROJECT/frontend

# Deploy to Cloud Run
gcloud run deploy backend --image gcr.io/YOUR_PROJECT/backend --platform managed
gcloud run deploy frontend --image gcr.io/YOUR_PROJECT/frontend --platform managed
```

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the root directory:

```env
# Backend
FLASK_ENV=production
SQLALCHEMY_DATABASE_URI=sqlite:///instance/portal.db
JWT_SECRET_KEY=change-this-to-a-random-secret-key

# Frontend (optional)
REACT_APP_API_URL=http://localhost:5000
```

### Security Notes

⚠️ **Important for Production:**

1. Change `JWT_SECRET_KEY` to a strong random string
2. Use PostgreSQL instead of SQLite for production
3. Enable HTTPS/SSL
4. Set up proper CORS configuration
5. Use environment variables for sensitive data
6. Hash passwords properly (not plain text)

## 📁 Project Structure

```
Server-Monitoring/
├── backend/                 # Flask backend
│   ├── api/                # API routes
│   │   ├── auth_routes.py  # Authentication endpoints
│   │   ├── server_routes.py
│   │   └── user_routes.py
│   ├── models.py           # Database models
│   ├── app.py              # Flask app factory
│   └── db.py               # Database configuration
├── frontend/               # React frontend
│   ├── app/
│   │   ├── components/     # Reusable components
│   │   │   ├── MainLayout.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   └── ProtectedRoute.tsx
│   │   ├── routes/         # Page components
│   │   │   ├── login.tsx
│   │   │   ├── dashboard.tsx
│   │   │   ├── servers.tsx
│   │   │   ├── metrics.tsx
│   │   │   └── reports.tsx
│   │   └── context/        # React context
│   │       └── AuthContext.tsx
├── instance/               # SQLite database (gitignored)
├── docker-compose.yml      # Docker orchestration
├── Dockerfile.backend      # Backend container
├── Dockerfile.frontend     # Frontend container
├── deploy.sh               # Deployment script
├── requirements.txt        # Python dependencies
└── README.md              # This file
```

## 🎯 API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/verify` - Verify JWT token

### Servers
- `GET /api/servers` - List all servers
- `POST /api/servers` - Add new server
- `GET /api/servers/:id` - Get server details
- `PUT /api/servers/:id` - Update server
- `DELETE /api/servers/:id` - Delete server
- `GET /api/servers/:id/metrics` - Get server metrics

### Users
- `GET /api/users` - List all users
- `POST /api/users` - Create user
- `GET /api/users/:id` - Get user details
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user

## 🧪 Testing

### Add Dummy Data
```bash
python add_dummy_data.py
```

### Test API
```bash
python test_api.py
```

### Mock Metrics
Use `?mock=true` parameter for realistic mock data:
```
GET /api/servers/1/metrics?mock=true
```

## 🐳 Docker Commands

```bash
# Build and start containers
docker-compose up -d --build

# View logs
docker-compose logs -f

# Stop containers
docker-compose down

# Restart a service
docker-compose restart backend
docker-compose restart frontend

# Remove all containers and volumes
docker-compose down -v
```

## 🛠️ Development

### Backend Development
```bash
source venv/bin/activate
python run_backend.py
```

### Frontend Development
```bash
cd frontend
npm run dev
```

### Hot Reload
Both backend (Flask) and frontend (React) support hot reload during development.

## 📊 Monitoring Dashboard Features

1. **Server Status Overview** - Cards showing all servers with status
2. **Performance Metrics** - Real-time CPU, Memory, Disk usage
3. **System Health** - Visual indicators for server health
4. **Detailed Analytics** - Individual server metrics in accordions
5. **Data Export** - Download reports in CSV/JSON format

## 🔐 Authentication Flow

1. User visits `/login`
2. Enter credentials (demo: admin/admin123)
3. Backend validates and returns JWT token
4. Token stored in localStorage
5. Protected routes check for valid token
6. Logout clears token and redirects to login

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is open source and available under the MIT License.

## 🆘 Troubleshooting

### Backend Issues
- **Port 5000 in use**: Change port in `run_backend.py`
- **Database errors**: Delete `instance/portal.db` and restart
- **Import errors**: Ensure virtual environment is activated

### Frontend Issues
- **Build fails**: Delete `node_modules` and run `npm install` again
- **API connection fails**: Check `REACT_APP_API_URL` in `.env`
- **Login not working**: Ensure backend is running on correct port

### Docker Issues
- **Container won't start**: Check logs with `docker-compose logs`
- **Port conflicts**: Change ports in `docker-compose.yml`
- **Build failures**: Clear Docker cache: `docker system prune -a`

## 📞 Support

For issues, questions, or contributions:
- Open an issue on GitHub
- Check existing documentation
- Review API endpoints

## 🎉 Credits

Built with:
- **Backend**: Flask, SQLAlchemy, PyJWT
- **Frontend**: React, Material-UI, React Router v7
- **Database**: SQLite (development), PostgreSQL (production ready)
- **Authentication**: JWT tokens
- **Deployment**: Docker, Docker Compose

---

**Made with ❤️ for server monitoring**

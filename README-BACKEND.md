# Well Testing Backend Setup

This application now uses a permanent backend storage system instead of browser localStorage.

## Setup Instructions

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Start the Backend Server**
   ```bash
   npm start
   ```
   The server will run on `http://localhost:3001`

3. **Start the Frontend Server**
   In a separate terminal, start the HTTP server:
   ```bash
   npx http-server -p 8000
   ```

4. **Access the Application**
   Open `http://localhost:8000` in your browser

## Data Storage

- Jobs are stored in `data/jobs.json`
- Reports are stored in `data/reports.json`
- These files are automatically created when the server starts
- **Important**: Back up the `data/` directory regularly!

## Migrating Existing Data

If you have existing data in localStorage:

1. Make sure both servers are running (backend on port 3001, frontend on port 8000)
2. Open the admin dashboard in your browser
3. Open the browser console (F12)
4. Copy and paste the contents of `migrate-data.js` into the console
5. Press Enter to run the migration

## API Endpoints

### Jobs
- `GET /api/jobs` - Get all jobs
- `GET /api/jobs/:id` - Get a specific job
- `POST /api/jobs` - Create a new job
- `PUT /api/jobs/:id` - Update a job
- `DELETE /api/jobs/:id` - Delete a job

### Reports
- `GET /api/reports` - Get all reports
- `GET /api/reports/:id` - Get a specific report
- `GET /api/reports/job/:jobId` - Get reports for a specific job
- `POST /api/reports` - Create a new report
- `PUT /api/reports/:id` - Update a report
- `DELETE /api/reports/:id` - Delete a report

## Backup

The `data/` directory contains all your data. To backup:
- Simply copy the `data/` folder to a safe location
- Or use the Export Data button in the admin dashboard

## Troubleshooting

- **"Failed to fetch" errors**: Make sure the backend server is running on port 3001
- **Data not persisting**: Check that the `data/` directory exists and is writable
- **CORS errors**: The server includes CORS headers, but if you see errors, check the API_BASE_URL in `api.js`


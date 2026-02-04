// server.js - Happy Street Godhani Backend
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('.')); // Serve static files

// MongoDB Connection - Use MongoDB Atlas for free cloud database
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://happy_street:happystreet123@cluster0.mongodb.net/happystreet?retryWrites=true&w=majority';

mongoose.connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => console.log('✅ MongoDB Connected'))
.catch(err => console.log('❌ MongoDB Error:', err));

// Submission Schema
const submissionSchema = new mongoose.Schema({
    formType: String,
    name: String,
    phone: String,
    email: { type: String, default: '' },
    category: { type: String, default: '' },
    details: String,
    brandName: { type: String, default: '' },
    stallType: { type: String, default: '' },
    companyName: { type: String, default: '' },
    sponsorshipLevel: { type: String, default: '' },
    performanceCategory: { type: String, default: '' },
    helpType: { type: String, default: '' },
    customIdea: { type: String, default: '' },
    status: { type: String, default: 'pending' },
    submittedAt: { type: Date, default: Date.now }
});

const Submission = mongoose.model('Submission', submissionSchema);

// Admin Schema
const adminSchema = new mongoose.Schema({
    username: { type: String, unique: true },
    password: String
});

const Admin = mongoose.model('Admin', adminSchema);

// Initialize Admin (run once)
async function initAdmin() {
    const adminExists = await Admin.findOne({ username: 'admin' });
    if (!adminExists) {
        const hashedPassword = await bcrypt.hash('admin123', 10);
        await Admin.create({
            username: 'admin',
            password: hashedPassword
        });
        console.log('👑 Admin user created (username: admin, password: admin123)');
        console.log('⚠️ Change the password immediately after first login!');
    }
}

// Routes

// Home Page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Admin Panel
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin-panel.html'));
});

// API: Submit form
app.post('/api/submit', async (req, res) => {
    try {
        const submission = new Submission(req.body);
        await submission.save();
        res.json({ 
            success: true, 
            message: 'Application submitted successfully! Our team will contact you soon on WhatsApp. 🎟️🚀' 
        });
    } catch (error) {
        console.error('Submit error:', error);
        res.status(500).json({ success: false, error: 'Error submitting application' });
    }
});

// API: Admin login
app.post('/api/admin/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const admin = await Admin.findOne({ username });
        
        if (!admin) {
            return res.json({ success: false, error: 'Invalid credentials' });
        }
        
        const isValid = await bcrypt.compare(password, admin.password);
        
        if (!isValid) {
            return res.json({ success: false, error: 'Invalid credentials' });
        }
        
        const token = jwt.sign(
            { username: admin.username },
            'happy-street-secret-key-2024',
            { expiresIn: '7d' }
        );
        
        res.json({ success: true, token });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ success: false, error: 'Login failed' });
    }
});

// API: Get all submissions (protected)
app.get('/api/submissions', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        
        if (!token) {
            return res.status(401).json({ error: 'No token provided' });
        }
        
        jwt.verify(token, 'happy-street-secret-key-2024', async (err, decoded) => {
            if (err) {
                return res.status(403).json({ error: 'Invalid token' });
            }
            
            const submissions = await Submission.find().sort({ submittedAt: -1 });
            res.json({ success: true, data: submissions });
        });
    } catch (error) {
        console.error('Get submissions error:', error);
        res.status(500).json({ success: false, error: 'Error fetching data' });
    }
});

// API: Update submission status
app.put('/api/submissions/:id', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        
        if (!token) {
            return res.status(401).json({ error: 'No token provided' });
        }
        
        jwt.verify(token, 'happy-street-secret-key-2024', async (err, decoded) => {
            if (err) {
                return res.status(403).json({ error: 'Invalid token' });
            }
            
            const { status } = req.body;
            await Submission.findByIdAndUpdate(req.params.id, { status });
            res.json({ success: true, message: 'Status updated' });
        });
    } catch (error) {
        console.error('Update error:', error);
        res.status(500).json({ success: false, error: 'Error updating' });
    }
});

// API: Delete submission
app.delete('/api/submissions/:id', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        
        if (!token) {
            return res.status(401).json({ error: 'No token provided' });
        }
        
        jwt.verify(token, 'happy-street-secret-key-2024', async (err, decoded) => {
            if (err) {
                return res.status(403).json({ error: 'Invalid token' });
            }
            
            await Submission.findByIdAndDelete(req.params.id);
            res.json({ success: true, message: 'Deleted successfully' });
        });
    } catch (error) {
        console.error('Delete error:', error);
        res.status(500).json({ success: false, error: 'Error deleting' });
    }
});

// API: Export CSV
app.get('/api/export/csv', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        
        if (!token) {
            return res.status(401).json({ error: 'No token provided' });
        }
        
        jwt.verify(token, 'happy-street-secret-key-2024', async (err, decoded) => {
            if (err) {
                return res.status(403).json({ error: 'Invalid token' });
            }
            
            const submissions = await Submission.find();
            
            // CSV headers
            const headers = ['ID', 'Name', 'Phone', 'Type', 'Details', 'Status', 'Date'];
            const csvRows = submissions.map(sub => [
                sub._id,
                `"${sub.name}"`,
                sub.phone,
                sub.formType,
                `"${sub.details.replace(/"/g, '""')}"`,
                sub.status,
                new Date(sub.submittedAt).toLocaleDateString()
            ]);
            
            const csvContent = [headers, ...csvRows].map(row => row.join(',')).join('\n');
            
            res.header('Content-Type', 'text/csv');
            res.attachment('happy-street-data.csv');
            res.send(csvContent);
        });
    } catch (error) {
        console.error('Export error:', error);
        res.status(500).json({ error: 'Export failed' });
    }
});

// Initialize and start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
    console.log(`🚀 Server running on port ${PORT}`);
    await initAdmin();
    console.log(`🌐 Website: http://localhost:${PORT}`);
    console.log(`🔐 Admin Panel: http://localhost:${PORT}/admin`);
    console.log(`📊 API Endpoint: http://localhost:${PORT}/api/submit`);
});
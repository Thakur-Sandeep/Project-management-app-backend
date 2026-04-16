const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();
const { ClerkExpressRequireAuth } = require('@clerk/clerk-sdk-node');

const Issue = require('./models/Issue');
const Project = require('./models/Projects');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const Invite = require('./models/Invite');


const app = express();
app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGO_URL)
  .then(() => console.log('MongoDB Connected'))
  .catch(err => console.log(err));

// Create a new Project
app.post('/api/projects', ClerkExpressRequireAuth(), async (req, res) => {
  try {
    const newProject = new Project({
      name: req.body.name,
      description: req.body.description || '',
      members: [{ clerkUserId: req.auth.userId, email: req.body.email, role: 'Admin' }] 
    });
    const savedProject = await newProject.save();
    res.status(201).json({ success: true, data: savedProject });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Get all Projects for the logged-in user
app.get('/api/projects', ClerkExpressRequireAuth(), async (req, res) => {
  try {
    const projects = await Project.find({ 'members.clerkUserId': req.auth.userId });
    res.json({ success: true, data: projects });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});


// Create an Issue
app.post('/api/issues', ClerkExpressRequireAuth(), async (req, res) => {
  try {
    const newIssue = new Issue({
      ...req.body,
      reporterId: req.auth.userId
    });
    const savedIssue = await newIssue.save();
    res.status(201).json({ success: true, data: savedIssue });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Get Issues for a Project
app.get('/api/projects/:projectId/issues', ClerkExpressRequireAuth(), async (req, res) => {
  try {
    const filter = { projectId: req.params.projectId };
    if (req.query.search) {
      filter.title = { $regex: req.query.search, $options: 'i' };
    }

    const issues = await Issue.find(filter);
    res.json({ success: true, data: issues });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update Issue
app.patch('/api/issues/:id', ClerkExpressRequireAuth(), async (req, res) => {
  try {
    const updates = { ...req.body };
    delete updates._id;

    const updatedIssue = await Issue.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { returnDocument: 'after' }
    );
    if (!updatedIssue) {
      return res.status(404).json({ success: false, error: 'Issue not found' });
    }

    res.json({ success: true, data: updatedIssue });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

//Delete an Issue
app.delete('/api/issues/:id', ClerkExpressRequireAuth(), async (req, res) => {
  try {
    const deletedIssue = await Issue.findByIdAndDelete(req.params.id);
    if (!deletedIssue) {
      return res.status(404).json({ success: false, error: 'Issue not found' });
    }
    res.json({ success: true, data: {} });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});


app.delete('/api/projects/:id', ClerkExpressRequireAuth(), async (req, res) => {
  try {
    const projectId = req.params.id;
    const deletedProject = await Project.findByIdAndDelete(projectId);
    if (!deletedProject) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }
    await Issue.deleteMany({ projectId: projectId });

    res.json({ success: true, message: 'Project and all issues deleted successfully.' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Generate Token & Send Email
app.post('/api/projects/:id/invite', ClerkExpressRequireAuth(), async (req, res) => {
  try {
    const { email } = req.body;
    const projectId = req.params.id;
    const token = crypto.randomBytes(32).toString('hex');
    const newInvite = new Invite({ projectId, email, token });
    await newInvite.save();
    const inviteLink = `http://localhost:3000/invite/${token}`;
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
      });
      await transporter.sendMail({
        from: '"Project Management App" <no-reply@projectmanagementapp.com>',
        to: email,
        subject: "You've been invited to a project!",
        html: `<p>Click here to join the project: <a href="${inviteLink}">Accept Invite</a></p>`
      });
    

    res.json({ success: true, message: "Invite sent successfully!" });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/invites/:token/accept', ClerkExpressRequireAuth(), async (req, res) => {
  try {
    const invite = await Invite.findOne({ token: req.params.token });
    if (!invite) return res.status(404).json({ success: false, error: 'Invalid or expired invite.' });

    const project = await Project.findById(invite.projectId);
    if (!project) return res.status(404).json({ success: false, error: 'Project no longer exists.' });

    const isAlreadyMember = project.members.some(member => member.clerkUserId === req.auth.userId);
    
    if (!isAlreadyMember) {
      project.members.push({ clerkUserId: req.auth.userId, email: req.body.email, role: 'Member' });
      await project.save();
    }

    await Invite.deleteOne({ _id: invite._id });

    res.json({ success: true, projectId: project._id });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/issues/:id/comments', ClerkExpressRequireAuth(), async (req, res) => {
  try {
    const issue = await Issue.findById(req.params.id);
    if (!issue) return res.status(404).json({ success: false, error: 'Issue not found' });

    issue.comments.push({
      text: req.body.text,
      authorName: req.body.authorName
    });

    const updatedIssue = await issue.save();
    res.json({ success: true, data: updatedIssue });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/projects/:id', ClerkExpressRequireAuth(), async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    
    if (!project) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }

    res.json({ success: true, data: project });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
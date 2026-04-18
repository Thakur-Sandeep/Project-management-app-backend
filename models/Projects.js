const mongoose = require('mongoose');

const ProjectSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String },
  members: [{
    clerkUserId: { type: String, required: true },
    email: { type: String },
    role: { type: String, enum: ['Admin', 'Manager', 'Developer', 'Viewer','Member'], default: 'Member' }
  }],
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Project', ProjectSchema);
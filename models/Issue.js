const mongoose = require('mongoose');

const CommentSchema = new mongoose.Schema({
  text: String,
  authorId: String,
  createdAt: { type: Date, default: Date.now }
});

const IssueSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  status: { type: String, enum: ['To Do', 'In Progress', 'Done'], default: 'To Do' },
  priority: { type: String, enum: ['Low', 'Medium', 'High'], default: 'Medium' },
  projectId: { type: String, ref: 'Project', required: true },
  assignee: { type: String, default: 'Unassigned' },
  reporterId: { type: String, required: true },
  comments: [{
    text: { type: String, required: true },
    authorName: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
  }]
}, { timestamps: true });

module.exports = mongoose.model('Issue', IssueSchema);
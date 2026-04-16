// server/models/Invite.js
const mongoose = require('mongoose');

const InviteSchema = new mongoose.Schema({
  projectId: { type: String, required: true },
  email: { type: String, required: true },
  token: { type: String, required: true, unique: true },
  createdAt: { type: Date, default: Date.now, expires: 86400 } 
});

module.exports = mongoose.model('Invite', InviteSchema);
const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const SubAdminInvitation = require('../models/SubAdminInvitation');
const { protect, superAdmin } = require('../middleware/auth');
const { successResponse, errorResponse, sanitizeInput } = require('../utils/helpers');
const { sendSubAdminInvitation } = require('../utils/emailService');

const router = express.Router();

// Get all sub-admins (super admin only)
router.get('/sub-admins', protect, superAdmin, async (req, res) => {
  try {
    const subAdmins = await User.find({ role: 'sub_admin' })
      .select('name email adminPermissions invitedBy createdAt')
      .populate('invitedBy', 'name email')
      .sort({ createdAt: -1 });

    successResponse(res, { subAdmins }, 'Sub-admins retrieved successfully');
  } catch (error) {
    console.error('Error fetching sub-admins:', error);
    errorResponse(res, 'Failed to fetch sub-admins', 500);
  }
});

// Invite a new sub-admin (super admin only)
router.post('/sub-admins/invite', protect, superAdmin, [
  body('email').isEmail().normalizeEmail().withMessage('Please enter a valid email'),
  body('permissions').isArray({ min: 1 }).withMessage('At least one permission must be selected')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return errorResponse(res, 'Validation failed', 400, errors.array());
    }

    const { email, permissions } = req.body;
    const sanitizedEmail = sanitizeInput(email).toLowerCase();

    // Check if email is already registered as any admin type
    const existingUser = await User.findOne({ email: sanitizedEmail });
    if (existingUser) {
      if (['admin', 'super_admin', 'sub_admin'].includes(existingUser.role)) {
        return errorResponse(res, 'This email is already registered as an admin', 400);
      }
      return errorResponse(res, 'This email is already registered as a regular user', 400);
    }

    // Check if there's already a pending invitation
    const existingInvitation = await SubAdminInvitation.findOne({
      email: sanitizedEmail,
      status: 'pending',
      expiresAt: { $gt: new Date() }
    });

    if (existingInvitation) {
      return errorResponse(res, 'An invitation has already been sent to this email', 400);
    }

    // Generate invitation token
    const { token, hashedToken, expiresAt } = SubAdminInvitation.generateInvitationToken();

    // Create invitation
    const invitation = await SubAdminInvitation.create({
      email: sanitizedEmail,
      invitedBy: req.user._id,
      permissions,
      token: hashedToken,
      expiresAt
    });

    // Send invitation email
    const invitationUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/accept-invitation/${token}`;

    try {
      await sendSubAdminInvitation({
        email: sanitizedEmail,
        inviterName: req.user.name,
        permissions,
        invitationUrl,
        expiresAt
      });
    } catch (emailError) {
      console.error('Failed to send invitation email:', emailError);
      // Delete the invitation if email fails
      await SubAdminInvitation.findByIdAndDelete(invitation._id);
      return errorResponse(res, 'Failed to send invitation email', 500);
    }

    successResponse(res, {
      invitation: {
        _id: invitation._id,
        email: invitation.email,
        permissions: invitation.permissions,
        expiresAt: invitation.expiresAt,
        status: invitation.status
      }
    }, 'Invitation sent successfully');
  } catch (error) {
    console.error('Error sending invitation:', error);
    errorResponse(res, 'Failed to send invitation', 500);
  }
});

// Get pending invitations (super admin only)
router.get('/invitations', protect, superAdmin, async (req, res) => {
  try {
    const invitations = await SubAdminInvitation.find({ status: 'pending' })
      .populate('invitedBy', 'name email')
      .sort({ createdAt: -1 });

    // Mark expired invitations
    const now = new Date();
    const updatedInvitations = invitations.map(inv => {
      if (inv.expiresAt < now && inv.status === 'pending') {
        inv.status = 'expired';
        inv.save();
      }
      return inv;
    });

    successResponse(res, { invitations: updatedInvitations }, 'Invitations retrieved successfully');
  } catch (error) {
    console.error('Error fetching invitations:', error);
    errorResponse(res, 'Failed to fetch invitations', 500);
  }
});

// Cancel an invitation (super admin only)
router.delete('/invitations/:id', protect, superAdmin, async (req, res) => {
  try {
    const invitation = await SubAdminInvitation.findById(req.params.id);

    if (!invitation) {
      return errorResponse(res, 'Invitation not found', 404);
    }

    if (invitation.status !== 'pending') {
      return errorResponse(res, 'Cannot cancel a non-pending invitation', 400);
    }

    invitation.status = 'cancelled';
    await invitation.save();

    successResponse(res, null, 'Invitation cancelled successfully');
  } catch (error) {
    console.error('Error cancelling invitation:', error);
    errorResponse(res, 'Failed to cancel invitation', 500);
  }
});

// Update sub-admin permissions (super admin only)
router.put('/sub-admins/:id/permissions', protect, superAdmin, [
  body('permissions').isArray({ min: 1 }).withMessage('At least one permission must be selected')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return errorResponse(res, 'Validation failed', 400, errors.array());
    }

    const { permissions } = req.body;

    const subAdmin = await User.findOne({
      _id: req.params.id,
      role: 'sub_admin'
    });

    if (!subAdmin) {
      return errorResponse(res, 'Sub-admin not found', 404);
    }

    subAdmin.adminPermissions = permissions;
    await subAdmin.save();

    successResponse(res, {
      subAdmin: {
        _id: subAdmin._id,
        name: subAdmin.name,
        email: subAdmin.email,
        adminPermissions: subAdmin.adminPermissions
      }
    }, 'Permissions updated successfully');
  } catch (error) {
    console.error('Error updating permissions:', error);
    errorResponse(res, 'Failed to update permissions', 500);
  }
});

// Remove a sub-admin (super admin only)
router.delete('/sub-admins/:id', protect, superAdmin, async (req, res) => {
  try {
    const subAdmin = await User.findOne({
      _id: req.params.id,
      role: 'sub_admin'
    });

    if (!subAdmin) {
      return errorResponse(res, 'Sub-admin not found', 404);
    }

    // Change role to 'user' instead of deleting
    subAdmin.role = 'user';
    subAdmin.adminPermissions = [];
    await subAdmin.save();

    successResponse(res, null, 'Sub-admin access revoked successfully');
  } catch (error) {
    console.error('Error removing sub-admin:', error);
    errorResponse(res, 'Failed to remove sub-admin', 500);
  }
});

// Validate invitation token (public route)
router.get('/invitation/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const hashedToken = SubAdminInvitation.verifyToken(token);

    const invitation = await SubAdminInvitation.findOne({
      token: hashedToken,
      status: 'pending'
    }).populate('invitedBy', 'name');

    if (!invitation) {
      return errorResponse(res, 'Invalid or expired invitation token', 400);
    }

    if (!invitation.isValid()) {
      invitation.status = 'expired';
      await invitation.save();
      return errorResponse(res, 'This invitation has expired', 400);
    }

    successResponse(res, {
      email: invitation.email,
      permissions: invitation.permissions,
      invitedBy: invitation.invitedBy?.name || 'Admin',
      expiresAt: invitation.expiresAt
    }, 'Invitation valid');
  } catch (error) {
    console.error('Error validating invitation:', error);
    errorResponse(res, 'Failed to validate invitation', 500);
  }
});

// Accept invitation and create sub-admin account (public route)
router.post('/invitation/accept', [
  body('token').notEmpty().withMessage('Token is required'),
  body('name').isLength({ min: 2, max: 50 }).withMessage('Name must be between 2 and 50 characters'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/)
    .withMessage('Password must contain uppercase, lowercase, number, and special character'),
  body('phone').isMobilePhone().withMessage('Please enter a valid phone number')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return errorResponse(res, 'Validation failed', 400, errors.array());
    }

    const { token, name, password, phone } = req.body;
    const hashedToken = SubAdminInvitation.verifyToken(token);

    const invitation = await SubAdminInvitation.findOne({
      token: hashedToken,
      status: 'pending'
    });

    if (!invitation || !invitation.isValid()) {
      return errorResponse(res, 'Invalid or expired invitation', 400);
    }

    // Create the sub-admin user
    const subAdmin = await User.create({
      name: sanitizeInput(name),
      email: invitation.email,
      password,
      phone: sanitizeInput(phone),
      nationality: 'N/A', // Can be updated later in profile
      role: 'sub_admin',
      adminPermissions: invitation.permissions,
      invitedBy: invitation.invitedBy,
      isEmailVerified: true // Already verified via invitation email
    });

    // Update invitation status
    invitation.status = 'accepted';
    invitation.acceptedAt = new Date();
    await invitation.save();

    // Generate token for auto-login
    const { generateToken } = require('../utils/helpers');
    const authToken = generateToken(subAdmin._id);

    successResponse(res, {
      user: subAdmin,
      token: authToken
    }, 'Account created successfully', 201);
  } catch (error) {
    console.error('Error accepting invitation:', error);
    if (error.code === 11000) {
      return errorResponse(res, 'An account with this email already exists', 400);
    }
    errorResponse(res, 'Failed to create account', 500);
  }
});

module.exports = router;

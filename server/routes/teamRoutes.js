// HEXY.PRO Express Server - /server/routes/teamRoutes.js - Express route for team management.
// Do not remove any comments in this file, including the one above.

const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const router = express.Router();

// Middleware to verify JWT token
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error) throw error;
    if (!user) {
      return res.status(403).json({ error: 'User not found' });
    }
    req.user = user;
    next();
  } catch (error) {
    console.error('Error verifying token:', error);
    return res.status(403).json({ error: 'Invalid token', details: error.message });
  }
};

router.post('/invite-member', authenticateToken, async (req, res) => {
  const { teamId, inviteeEmail } = req.body;
  const inviterUserId = req.user.id;

  try {
    // Verify the inviter is a team owner or admin
    const { data: teamData, error: teamError } = await supabase
      .from('teams')
      .select('*')
      .eq('id', teamId)
      .eq('owner_id', inviterUserId)
      .single();

    if (teamError || !teamData) {
      return res.status(403).json({ error: 'Unauthorized to invite to this team' });
    }

    // Check if the invitee already exists
    const { data: userData, error: userError } = await supabase
      .from('profiles')
      .select('id')
      .eq('display_name', inviteeEmail)
      .single();

    let inviteeUserId;
    if (userError) {
      if (userError.code === 'PGRST116') {
        // User doesn't exist, create a placeholder profile
        const { data: newUser, error: newUserError } = await supabase
          .from('profiles')
          .insert({ email: inviteeEmail })
          .select('id')
          .single();

        if (newUserError) {
          console.error('Error creating placeholder profile:', newUserError);
          return res.status(500).json({ error: 'Failed to create placeholder profile', details: newUserError });
        }
        inviteeUserId = newUser.id;
      } else {
        console.error('Error checking user existence:', userError);
        return res.status(500).json({ error: 'Error checking user existence', details: userError });
      }
    } else {
      inviteeUserId = userData.id;
    }

    // Check if the user is already a member of the team
    const { data: existingMember, error: memberError } = await supabase
      .from('team_members')
      .select('*')
      .eq('team_id', teamId)
      .eq('user_id', inviteeUserId)
      .single();

    if (memberError && memberError.code !== 'PGRST116') {
      console.error('Error checking existing team member:', memberError);
      return res.status(500).json({ error: 'Error checking team membership', details: memberError });
    }

    if (existingMember) {
      return res.status(400).json({ error: 'User is already a member of this team' });
    }

    // Create the team invitation
    const { error: inviteError } = await supabase
      .from('team_members')
      .insert({
        team_id: teamId,
        user_id: inviteeUserId,
        role: 'member',
        status: 'invited',
        invited_by: inviterUserId
      });

      if (inviteError) {
        console.error('Error creating invitation:', inviteError);
        return res.status(500).json({ error: 'Failed to create invitation', details: inviteError });
      }
  
      res.status(200).json({ message: 'Invitation sent successfully' });
    } catch (error) {
      console.error('Server error:', error);
      res.status(500).json({ error: 'Server error', details: error.message });
    }
  });
  
  // Additional routes can be added here, such as:
  
  // Get team details
  router.get('/:teamId', authenticateToken, async (req, res) => {
    const { teamId } = req.params;
    const userId = req.user.id;
  
    try {
      // Check if the user is a member of the team
      const { data: memberData, error: memberError } = await supabase
        .from('team_members')
        .select('*')
        .eq('team_id', teamId)
        .eq('user_id', userId)
        .single();
  
      if (memberError) {
        return res.status(403).json({ error: 'Not a member of this team' });
      }
  
      // Fetch team details
      const { data: teamData, error: teamError } = await supabase
        .from('teams')
        .select('*')
        .eq('id', teamId)
        .single();
  
      if (teamError) {
        return res.status(404).json({ error: 'Team not found' });
      }
  
      res.status(200).json(teamData);
    } catch (error) {
      console.error('Server error:', error);
      res.status(500).json({ error: 'Server error', details: error.message });
    }
  });
  
  // Update team details
  router.put('/:teamId', authenticateToken, async (req, res) => {
    const { teamId } = req.params;
    const { name } = req.body;
    const userId = req.user.id;
  
    try {
      // Check if the user is the team owner
      const { data: teamData, error: teamError } = await supabase
        .from('teams')
        .select('*')
        .eq('id', teamId)
        .eq('owner_id', userId)
        .single();
  
      if (teamError || !teamData) {
        return res.status(403).json({ error: 'Unauthorized to update this team' });
      }
  
      // Update team name
      const { data: updatedTeam, error: updateError } = await supabase
        .from('teams')
        .update({ name })
        .eq('id', teamId)
        .single();
  
      if (updateError) {
        return res.status(500).json({ error: 'Failed to update team', details: updateError });
      }
  
      res.status(200).json(updatedTeam);
    } catch (error) {
      console.error('Server error:', error);
      res.status(500).json({ error: 'Server error', details: error.message });
    }
  });
  
  // Delete team
  router.delete('/:teamId', authenticateToken, async (req, res) => {
    const { teamId } = req.params;
    const userId = req.user.id;
  
    try {
      // Check if the user is the team owner
      const { data: teamData, error: teamError } = await supabase
        .from('teams')
        .select('*')
        .eq('id', teamId)
        .eq('owner_id', userId)
        .single();
  
      if (teamError || !teamData) {
        return res.status(403).json({ error: 'Unauthorized to delete this team' });
      }
  
      // Delete team members
      const { error: membersDeleteError } = await supabase
        .from('team_members')
        .delete()
        .eq('team_id', teamId);
  
      if (membersDeleteError) {
        return res.status(500).json({ error: 'Failed to delete team members', details: membersDeleteError });
      }
  
      // Delete team
      const { error: teamDeleteError } = await supabase
        .from('teams')
        .delete()
        .eq('id', teamId);
  
      if (teamDeleteError) {
        return res.status(500).json({ error: 'Failed to delete team', details: teamDeleteError });
      }
  
      res.status(200).json({ message: 'Team deleted successfully' });
    } catch (error) {
      console.error('Server error:', error);
      res.status(500).json({ error: 'Server error', details: error.message });
    }
  });
  
  module.exports = router;
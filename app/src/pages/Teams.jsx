// HEXY.PRO App - /app/src/pages/Teams.jsx - Page component that displays teams and team management features.
 

/* eslint-disable no-unused-vars */

import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import '../styles/Teams.css';

const Teams = () => {
  const { session, getAccessToken } = useAuth();
  const [ownedTeams, setOwnedTeams] = useState([]);
  const [joinedTeams, setJoinedTeams] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [newTeamName, setNewTeamName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [selectedTeam, setSelectedTeam] = useState('');
  const [error, setError] = useState(null);
  const [userTier, setUserTier] = useState('Free');
  const [expandedTeams, setExpandedTeams] = useState({});

  useEffect(() => {
    if (session) {
      fetchUserTier();
      fetchOwnedTeams();
      fetchJoinedTeams();
      fetchInvitations();
    }
  }, [session]);

  const fetchUserTier = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('tier')
      .eq('id', session.user.id)
      .single();

    if (error) {
      console.error('Error fetching user tier:', error);
    } else {
      setUserTier(data.tier || 'Free');
    }
  };
  const toggleTeamExpansion = (teamId) => {
    setExpandedTeams(prev => ({
      ...prev,
      [teamId]: !prev[teamId]
    }));
  };
  const fetchOwnedTeams = async () => {
    try {
      const { data: teamsData, error: teamsError } = await supabase
        .from('teams')
        .select('*')
        .eq('owner_id', session.user.id);
  
      if (teamsError) throw teamsError;
  
      const { data: membersData, error: membersError } = await supabase
        .from('team_members')
        .select(`
          team_id,
          user_id,
          profiles:user_id (email)
        `)
        .in('team_id', teamsData.map(team => team.id));
  
      if (membersError) throw membersError;
  
      const teamsWithMembers = teamsData.map(team => ({
        ...team,
        team_members: membersData
          .filter(member => member.team_id === team.id)
          .map(member => ({
            ...member,
            email: member.profiles?.email || 'Name not set'
          }))
      }));
  
      setOwnedTeams(teamsWithMembers);
    } catch (error) {
      console.error('Error fetching owned teams:', error);
      setError('Failed to fetch owned teams');
    }
  };

  const fetchJoinedTeams = async () => {
    const { data, error } = await supabase
      .from('team_members')
      .select('team_id')
      .eq('user_id', session.user.id)
      .eq('status', 'active');

    if (error) {
      console.error('Error fetching joined teams:', error);
      setError('Failed to fetch joined teams');
    } else {
      const teamIds = data.map(tm => tm.team_id);
      const { data: teamsData, error: teamsError } = await supabase
        .from('teams')
        .select('*')
        .in('id', teamIds);

      if (teamsError) {
        console.error('Error fetching joined team details:', teamsError);
        setError('Failed to fetch joined team details');
      } else {
        setJoinedTeams(teamsData || []);
      }
    }
  };

  const fetchInvitations = async () => {
    const { data, error } = await supabase
      .from('team_members')
      .select('team_id')
      .eq('user_id', session.user.id)
      .eq('status', 'invited');

    if (error) {
      console.error('Error fetching invitations:', error);
      setError('Failed to fetch invitations');
    } else {
      const teamIds = data.map(tm => tm.team_id);
      const { data: teamsData, error: teamsError } = await supabase
        .from('teams')
        .select('*')
        .in('id', teamIds);

      if (teamsError) {
        console.error('Error fetching invitation team details:', teamsError);
        setError('Failed to fetch invitation team details');
      } else {
        setInvitations(teamsData || []);
      }
    }
  };

  const createTeam = async (e) => {
    e.preventDefault();
    if (userTier !== 'Pro') {
      setError('Only Pro members can create teams');
      return;
    }

    const { data, error } = await supabase
      .from('teams')
      .insert({ name: newTeamName, owner_id: session.user.id })
      .select();

    if (error) {
      console.error('Error creating team:', error);
      setError('Failed to create team');
    } else {
      setOwnedTeams([...ownedTeams, data[0]]);
      setNewTeamName('');
    }
  };

  const inviteMember = async (e) => {
    e.preventDefault();
    if (!selectedTeam) {
      setError('Please select a team to invite to');
      return;
    }
  
    try {
      const token = await getAccessToken();
      if (!token) {
        throw new Error('No valid access token');
      }

      const response = await fetch('/api/teams/invite-member', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          teamId: selectedTeam,
          inviteeEmail: inviteEmail
        })
      });
  
      const data = await response.json();
  
      if (!response.ok) {
        throw new Error(data.error || `HTTP error! status: ${response.status}`);
      }
  
      setInviteEmail('');
      setError('Invitation sent successfully');
    } catch (error) {
      console.error('Error inviting member:', error);
      setError(error.message || 'Failed to invite member');
    }
  };

  const handleInviteResponse = async (teamId, status) => {
    if (!teamId) {
      console.error('Team ID is undefined');
      setError('Invalid team ID');
      return;
    }
  
    try {
      const { error } = await supabase
        .from('team_members')
        .update({ 
          status: status, 
          joined_at: status === 'active' ? new Date().toISOString() : null 
        })
        .eq('team_id', teamId)
        .eq('user_id', session.user.id);
  
      if (error) throw error;
  
      fetchInvitations();
      fetchJoinedTeams();
      setError(status === 'active' ? 'Invitation accepted' : 'Invitation refused');
    } catch (error) {
      console.error(`Error ${status === 'active' ? 'accepting' : 'refusing'} invitation:`, error);
      setError(`Failed to ${status === 'active' ? 'accept' : 'refuse'} invitation`);
    }
  };

  const kickMember = async (teamId, userId) => {
    try {
      const { error } = await supabase
        .from('team_members')
        .delete()
        .eq('team_id', teamId)
        .eq('user_id', userId);

      if (error) throw error;

      fetchOwnedTeams();
      setError('Member removed from the team');
    } catch (error) {
      console.error('Error kicking member:', error);
      setError('Failed to remove member from the team');
    }
  };

  if (!session) {
    return <div>Please log in to view teams.</div>;
  }

  return (
    <div className="teams-container">
  <div className="teams-grid">
    <section className="teams-section create-team">
      <h2>Create a New Team</h2>
      <form onSubmit={createTeam}>
        <div className="form-group">
          <input
            type="text"
            value={newTeamName}
            onChange={(e) => setNewTeamName(e.target.value)}
            placeholder="Team Name"
            required
          />
          <button type="submit" className="action-button">Create Team</button>
        </div>
      </form>
    </section>

    <section className="teams-section invite-member">
      <h2>Invite a Member</h2>
      <form onSubmit={inviteMember}>
        <div className="form-group">
          <select
            value={selectedTeam}
            onChange={(e) => setSelectedTeam(e.target.value)}
            required
          >
            <option value="">Select a team</option>
            {ownedTeams.map((team) => (
              <option key={team.id} value={team.id}>{team.name}</option>
            ))}
          </select>
          <input
            type="email"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            placeholder="Member's email"
            required
          />
          <button type="submit" className="action-button">Invite</button>
        </div>
      </form>
    </section>

    <section className="teams-section owned-teams">
      <h2>My Owned Teams</h2>
      {ownedTeams.length === 0 ? (
        <p>You haven&apos;t created any teams yet.</p>
      ) : (
        <ul className="team-list">
          {ownedTeams.map((team) => (
            <li key={team.id} className="team-item">
              <div className="team-header" onClick={() => toggleTeamExpansion(team.id)}>
                <h3>{team.name}</h3>
                <button className={`team-toggle ${expandedTeams[team.id] ? 'expanded' : ''}`}>
                  ▼
                </button>
              </div>
              {expandedTeams[team.id] && (
                <div className="team-members">
                  {team.team_members.map((member) => (
                    <div key={member.user_id} className="member-item">
                      <span className="member-name">{member.display_name || member.user_id || 'Error fetching username'}</span>
                      {team.owner_id !== member.user_id && (
                        <button 
                          className="remove-button"
                          onClick={() => kickMember(team.id, member.user_id)}
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>

    <section className="teams-section joined-teams">
      <h2>Teams I&apos;ve Joined</h2>
      {joinedTeams.length === 0 ? (
        <p>You haven&apos;t joined any teams yet.</p>
      ) : (
        <ul className="team-list">
          {joinedTeams.map((team) => (
            <li key={team.id} className="team-item">
              <div className="team-header">
                <h3>{team.name}</h3>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>

    <section className="teams-section invitations">
      <h2>Invitations</h2>
      {invitations.length === 0 ? (
        <p>No pending invitations.</p>
      ) : (
        <ul className="team-list">
          {invitations.map((invitation) => (
            <li key={invitation.id} className="team-item">
              <div className="team-header">
                <h3>{invitation.name || 'Unknown Team'}</h3>
              </div>
              <div className="team-members">
              <button 
  className="action-button"
  onClick={() => handleInviteResponse(invitation.id, 'active')}
>
  Accept
</button>
                <button 
                  className="remove-button"
                  onClick={() => handleInviteResponse(invitation.team_id, 'inactive')}
                >
                  Decline
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  </div>
</div>
  );
};

export default Teams;
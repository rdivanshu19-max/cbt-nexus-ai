import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/DashboardLayout';
import { NexusAIChat } from '@/components/NexusAIChat';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { User, Trash2, Save, LogOut } from 'lucide-react';

const Profile = () => {
  const { profile, updateProfile, deleteAccount, signOut } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [username, setUsername] = useState(profile?.username || '');
  const [bio, setBio] = useState(profile?.bio || '');
  const [saving, setSaving] = useState(false);
  const [showDelete, setShowDelete] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateProfile({ username, bio });
      toast({ title: 'Profile updated!' });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteAccount();
      toast({ title: 'Account deleted. Goodbye!' });
      navigate('/');
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold">Profile Settings</h1>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><User className="h-5 w-5 text-primary" /> Edit Profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Username</Label>
              <Input value={username} onChange={e => setUsername(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Bio</Label>
              <Textarea value={bio} onChange={e => setBio(e.target.value)} placeholder="Tell us about yourself..." rows={3} />
            </div>
            <Button onClick={handleSave} disabled={saving} className="gradient-primary text-primary-foreground">
              <Save className="h-4 w-4 mr-2" /> {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </CardContent>
        </Card>

        <Card className="glass-card border-destructive/20">
          <CardHeader>
            <CardTitle className="text-destructive flex items-center gap-2"><Trash2 className="h-5 w-5" /> Danger Zone</CardTitle>
          </CardHeader>
          <CardContent>
            {!showDelete ? (
              <Button variant="destructive" onClick={() => setShowDelete(true)}>Delete Account</Button>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">This will permanently delete your account and all data. This action cannot be undone. You can create a new account with the same email.</p>
                <div className="flex gap-2">
                  <Button variant="destructive" onClick={handleDelete}>Yes, Delete My Account</Button>
                  <Button variant="outline" onClick={() => setShowDelete(false)}>Cancel</Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      <NexusAIChat />
    </DashboardLayout>
  );
};

export default Profile;

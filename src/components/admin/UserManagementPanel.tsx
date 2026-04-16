import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Trash2 } from 'lucide-react';

type UserData = {
  user_id: string;
  username: string;
  bio: string | null;
  created_at: string;
};

interface UserManagementPanelProps {
  currentUserId?: string;
}

export const UserManagementPanel = ({ currentUserId }: UserManagementPanelProps) => {
  const { toast } = useToast();
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUsers = async () => {
      const { data, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });

      if (error) {
        toast({ title: 'Error', description: error.message, variant: 'destructive' });
        setLoading(false);
        return;
      }

      setUsers((data || []).map((profile) => ({
        user_id: profile.user_id,
        username: profile.username,
        bio: profile.bio,
        created_at: profile.created_at,
      })));
      setLoading(false);
    };

    fetchUsers();
  }, [toast]);

  const handleDeleteUser = async (userId: string) => {
    if (!window.confirm('Delete this user? This cannot be undone.')) return;

    await supabase.from('profiles').delete().eq('user_id', userId);
    await supabase.from('chat_messages').delete().eq('user_id', userId);
    await supabase.from('test_attempts').delete().eq('user_id', userId);
    await supabase.from('study_streaks').delete().eq('user_id', userId);

    setUsers((prev) => prev.filter((entry) => entry.user_id !== userId));
    toast({ title: 'User deleted' });
  };

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle>All Users ({users.length})</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Username</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.user_id}>
                  <TableCell className="font-medium">{user.username}</TableCell>
                  <TableCell className="text-muted-foreground">{new Date(user.created_at).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDeleteUser(user.user_id)}
                      disabled={user.user_id === currentUserId}
                    >
                      <Trash2 className="h-3 w-3 mr-1" /> Delete
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};

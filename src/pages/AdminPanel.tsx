import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Shield, Users, Upload } from 'lucide-react';
import { UserManagementPanel } from '@/components/admin/UserManagementPanel';
import { OfficialTestsManager } from '@/components/admin/OfficialTestsManager';

const AdminPanel = () => {
  const { user } = useAuth();

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Shield className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">Admin Panel</h1>
            <p className="text-muted-foreground">Manage users and official tests</p>
          </div>
        </div>

        <Tabs defaultValue="users">
          <TabsList>
            <TabsTrigger value="users"><Users className="h-4 w-4 mr-1" /> Users</TabsTrigger>
            <TabsTrigger value="upload"><Upload className="h-4 w-4 mr-1" /> Official Tests</TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="mt-6">
            <UserManagementPanel currentUserId={user?.id} />
          </TabsContent>

          <TabsContent value="upload" className="mt-6">
            <OfficialTestsManager />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default AdminPanel;

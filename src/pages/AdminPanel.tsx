import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Shield, Users, Upload, Layers } from 'lucide-react';
import { TestSeriesManager } from '@/components/admin/TestSeriesManager';
import { UserManagementPanel } from '@/components/admin/UserManagementPanel';
import { OfficialTestsManager } from '@/components/admin/OfficialTestsManager';
import { PageHeader, WindowCard } from '@/components/ui/page-header';

const AdminPanel = () => {
  const { user } = useAuth();

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader chip="ADMIN CONSOLE" title="Control center" subtitle="Manage students and official tests." />

        <Tabs defaultValue="users">
          <TabsList className="w-full sm:w-auto grid grid-cols-3 rounded-full h-auto p-1">
            <TabsTrigger value="users"><Users className="h-4 w-4 mr-1" /> Users</TabsTrigger>
            <TabsTrigger value="upload"><Upload className="h-4 w-4 mr-1" /> Official Tests</TabsTrigger>
            <TabsTrigger value="series"><Layers className="h-4 w-4 mr-1" /> Series</TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="mt-6">
            <UserManagementPanel currentUserId={user?.id} />
          </TabsContent>

          <TabsContent value="upload" className="mt-6">
            <OfficialTestsManager />
          </TabsContent>

          <TabsContent value="series" className="mt-6">
            <TestSeriesManager />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default AdminPanel;

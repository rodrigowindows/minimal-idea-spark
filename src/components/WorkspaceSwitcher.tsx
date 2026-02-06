import { useState, useEffect } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Check, ChevronsUpDown, Plus } from 'lucide-react';
import { supabase } from '@/lib/audio-transcription';
import type { Organization } from '@/lib/db/schema-organizations';
import { toast } from 'sonner';

export function WorkspaceSwitcher() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [currentOrg, setCurrentOrg] = useState<Organization | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadOrganizations();
  }, []);

  const loadOrganizations = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: members } = await supabase
        .from('organization_members')
        .select('organization_id, organizations(*)')
        .eq('user_id', user.id)
        .eq('status', 'active');

      if (members) {
        const orgs = members.map(m => m.organizations).filter(Boolean) as Organization[];
        setOrganizations(orgs);

        const savedOrgId = localStorage.getItem('current_organization_id');
        const current = orgs.find(o => o.id === savedOrgId) || orgs[0];
        setCurrentOrg(current);
      }
    } catch (error) {
      console.error('Error loading organizations:', error);
      toast.error('Erro ao carregar workspaces');
    } finally {
      setIsLoading(false);
    }
  };

  const switchOrganization = (org: Organization) => {
    setCurrentOrg(org);
    localStorage.setItem('current_organization_id', org.id);
    toast.success(`Mudou para ${org.name}`);
    window.location.reload();
  };

  if (isLoading) {
    return <div className="w-[200px] h-10 bg-muted animate-pulse rounded" />;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="w-[200px] justify-between">
          {currentOrg?.name || 'Selecionar workspace'}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[200px]">
        <DropdownMenuLabel>Workspaces</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {organizations.map((org) => (
          <DropdownMenuItem
            key={org.id}
            onClick={() => switchOrganization(org)}
          >
            <Check
              className={`mr-2 h-4 w-4 ${
                currentOrg?.id === org.id ? 'opacity-100' : 'opacity-0'
              }`}
            />
            {org.name}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem>
          <Plus className="mr-2 h-4 w-4" />
          Criar workspace
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

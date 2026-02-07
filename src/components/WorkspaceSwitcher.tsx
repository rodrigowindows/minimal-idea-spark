import { useState } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Check, ChevronsUpDown, Plus, Users, Building2 } from 'lucide-react';
import { useWorkspaceContext } from '@/contexts/WorkspaceContext';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface WorkspaceSwitcherProps {
  collapsed?: boolean;
}

export function WorkspaceSwitcher({ collapsed = false }: WorkspaceSwitcherProps) {
  const {
    organizations,
    currentOrg,
    switchOrganization,
    createOrganization,
    orgMembers,
  } = useWorkspaceContext();

  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');

  const handleCreate = () => {
    if (!newName.trim()) return;
    const org = createOrganization(newName.trim());
    switchOrganization(org.id);
    toast.success(`Workspace "${org.name}" criado!`);
    setNewName('');
    setShowCreate(false);
  };

  const handleSwitch = (orgId: string) => {
    if (orgId === currentOrg?.id) return;
    switchOrganization(orgId);
    const org = organizations.find(o => o.id === orgId);
    toast.success(`Mudou para ${org?.name}`);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className={cn(
              'justify-between gap-2 text-left font-normal',
              collapsed ? 'w-10 px-2' : 'w-full'
            )}
          >
            <div className="flex items-center gap-2 min-w-0">
              <Building2 className="h-4 w-4 shrink-0 text-primary" />
              {!collapsed && (
                <span className="truncate text-sm font-medium">
                  {currentOrg?.name || 'Workspace'}
                </span>
              )}
            </div>
            {!collapsed && <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 opacity-50" />}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-[220px]">
          <DropdownMenuLabel className="flex items-center gap-2">
            <Building2 className="h-3.5 w-3.5" />
            Workspaces
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {organizations.map((org) => {
            const memberCount = orgMembers.filter(m => m.organization_id === org.id).length ||
              (org.id === currentOrg?.id ? orgMembers.length : 0);
            return (
              <DropdownMenuItem
                key={org.id}
                onClick={() => handleSwitch(org.id)}
                className="flex items-center gap-2"
              >
                <Check
                  className={cn(
                    'h-3.5 w-3.5 shrink-0',
                    currentOrg?.id === org.id ? 'opacity-100' : 'opacity-0'
                  )}
                />
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm">{org.name}</p>
                  <p className="text-xs text-muted-foreground">
                    <Users className="mr-1 inline h-3 w-3" />
                    {memberCount || 1} membro{(memberCount || 1) > 1 ? 's' : ''}
                  </p>
                </div>
              </DropdownMenuItem>
            );
          })}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setShowCreate(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Criar workspace
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Novo Workspace</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => { e.preventDefault(); handleCreate(); }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="ws-name">Nome</Label>
              <Input
                id="ws-name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Ex: Minha Empresa, Projeto Pessoal"
                autoFocus
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={!newName.trim()}>
                Criar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

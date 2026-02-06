import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Plus, TrendingUp, AlertCircle } from 'lucide-react';
import { getUserPriorities, suggestActionsBasedOnPriorities } from '@/lib/rag/priority-context';
import type { Priority } from '@/lib/rag/priority-context';
import { toast } from 'sonner';

export function PriorityDashboard({ userId }: { userId: string }) {
  const [priorities, setPriorities] = useState<Priority[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadPriorities();
  }, [userId]);

  const loadPriorities = async () => {
    try {
      const data = await getUserPriorities(userId);
      setPriorities(data);

      const actions = await suggestActionsBasedOnPriorities(
        userId,
        'Current dashboard view'
      );
      setSuggestions(actions);
    } catch (error) {
      console.error('Error loading priorities:', error);
      toast.error('Erro ao carregar prioridades');
    } finally {
      setIsLoading(false);
    }
  };

  const getPriorityColor = (level: Priority['priority_level']) => {
    switch (level) {
      case 'critical': return 'destructive';
      case 'high': return 'default';
      case 'medium': return 'secondary';
      case 'low': return 'outline';
    }
  };

  if (isLoading) {
    return <div className="grid gap-4"><div className="h-40 bg-muted animate-pulse rounded" /></div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Suas Prioridades
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Adicionar
            </Button>
          </CardTitle>
          <CardDescription>
            Mantenha o foco no que realmente importa
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {priorities.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhuma prioridade definida ainda
              </div>
            ) : (
              priorities.map((priority) => (
                <div
                  key={priority.id}
                  className="flex items-start justify-between p-4 border rounded-lg"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant={getPriorityColor(priority.priority_level)}>
                        {priority.priority_level}
                      </Badge>
                      <Badge variant="outline">{priority.category}</Badge>
                    </div>
                    <h4 className="font-semibold mb-1">{priority.title}</h4>
                    <p className="text-sm text-muted-foreground">
                      {priority.description}
                    </p>
                  </div>
                  {priority.due_date && (
                    <div className="text-sm text-muted-foreground">
                      {new Date(priority.due_date).toLocaleDateString()}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {suggestions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Ações Sugeridas por IA
            </CardTitle>
            <CardDescription>
              Baseado nas suas prioridades atuais
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {suggestions.map((suggestion, i) => (
                <li key={i} className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 mt-0.5 text-primary" />
                  <span className="text-sm">{suggestion}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

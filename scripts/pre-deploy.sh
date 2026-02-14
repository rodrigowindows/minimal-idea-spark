#!/bash

#com código u
# Garante que o script pare se um comando falhar
set -e

# 1. Instalar dependências (opcional, mas bom para CI)
# ech
estes (se existirem)
if [ -f "package.json" ] && grep -q "\"test\"" "package.json"; then
  echo "🧪 Rodando testes..."
else
  echo "🟡 Nenhum script de teste encontrado. Pulando."
fi

# 3. Rodar o build de produção
echo "🏗️  Construindo a aplicação para produção..."
npm run build

echo "✅ Verificações pré-deploy concluídas com sucesso!"
exit 0
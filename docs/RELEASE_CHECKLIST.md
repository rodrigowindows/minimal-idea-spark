# Checklist de Release e Pré-Deploy

Este documento contém os passos essenciais a serem verificados antes de cada deploy para garantir a qualidade e estabilidade da aplicação.

---

## ✅ Checklist Pré-Deploy

- [ ] **Build sem erros**: O comando `npm run build` executa até o fim sem nenhum erro.
- [ ] **Variáveis de Ambiente**: O arquivo `.env` de produção (ou as variáveis no ambiente de deploy, como Vercel/Netlify) está configurado com os valores corretos para `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY`.
- [ ] **Testes Passando**: Todos os testes automatizados estão passando (`npm run test`, se aplicável).
- [ ] **Linting e Formatação**: O código está formatado e sem erros de lint (`npm run lint`).
- [ ] **Sem Erros no Console**: Não há `console.error` ou avisos críticos de acessibilidade (a11y) nos fluxos principais durante o desenvolvimento.
- [ ] **Changelog Atualizado**: O arquivo `CHANGELOG.md` foi atualizado com as mudanças desta versão (opcional, mas recomendado).
- [ ] **Secrets Verificados**: Nenhum segredo (chaves de API, tokens) foi commitado acidentalmente no Git. O `.gitignore` inclui `.env*`.

---

## 🧪 Smoke Tests Pós-Deploy

Após o deploy em **staging** ou **produção**, execute manualmente os seguintes testes para garantir que as funcionalidades críticas estão operando como esperado.

- [ ] **1. Abertura e Login**:
    - [ ] Acessar a URL da aplicação.
    - [ ] A página de login carrega corretamente.
    - [ ] Realizar o login com um usuário de teste.

- [ ] **2. Funcionalidade Principal (Criar Item)**:
    - [ ] Navegar para a área de criação de um item principal (ex: Oportunidade, Prompt).
    - [ ] Criar um novo item e verificar se ele aparece na lista.

- [ ] **3. Busca Global (Cmd+K)**:
    - [ ] Abrir a busca global com o atalho `Cmd+K` (ou `Ctrl+K`).
    - [ ] Digitar um termo e verificar se os resultados aparecem.
    - [ ] Clicar em um resultado e verificar se a navegação ocorre corretamente.

- [ ] **4. Navegação e Layout**:
    - [ ] Verificar se a sidebar e o conteúdo principal estão alinhados e sem overflow horizontal.
    - [ ] Reduzir a janela do navegador para o tamanho de um celular.
    - [ ] Verificar se o header mobile e a barra de navegação inferior (`BottomNav`) estão visíveis e funcionais.

- [ ] **5. Troca de Tema**:
    - [ ] Clicar no ícone de troca de tema (sol/lua).
    - [ ] Verificar se a interface muda corretamente entre os temas claro e escuro.
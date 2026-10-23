# Vidra Aria — custos, preços e orçamentos

Aplicação web interna para uma indústria de esquadrias de alumínio, portas,
janelas, boxes, guarda-corpos, espelhos e vidros: calcula o **custo real
estimado** de cada produto, forma o **preço de venda** pela margem desejada e
gera **orçamentos** com fotografia imutável dos custos usados.

- Next.js 16 (App Router) · TypeScript · Tailwind CSS 4 · shadcn/ui
- Supabase (PostgreSQL, Auth, RLS) · Zod · decimal.js · Vitest
- Português do Brasil, moeda BRL, datas dd/mm/aaaa, medidas em milímetros

Documentação técnica:

- [docs/ARQUITETURA.md](docs/ARQUITETURA.md) — camadas, pastas, modelo de dados e decisões
- [docs/MOTOR-DE-CUSTOS.md](docs/MOTOR-DE-CUSTOS.md) — fórmulas de custo, preço e margens

## Módulos

| Módulo | O que faz |
| --- | --- |
| Painel | Quantidade de orçamentos, valor cotado, aprovados, conversão, margem líquida ponderada e alertas (preços vencidos/desatualizados, materiais sem preço, produtos sem ficha, rascunhos sem cálculo). |
| Materiais | Código interno, descrição, categoria, linha de aplicação, unidades de compra e consumo, fator de conversão, comprimento comercial, ativo/inativo. |
| Fornecedores | Razão social, nome fantasia, CNPJ opcional (validado), contatos, condições de pagamento e observações. |
| Preços de fornecedores | Várias ofertas por material: preço, unidade de compra, quantidade por embalagem, desconto, tributos não recuperáveis, frete alocado, validade, data da cotação, preferencial. Histórico imutável a cada alteração. |
| Produtos e fichas | Produtos com fichas técnicas **versionadas** (rascunho → publicada → arquivada): componentes com base de dimensionamento, coeficiente, ajuste e perda; tempos de fabricação e instalação; limites de medidas; simulador de custo. |
| Orçamentos | Cliente, itens com medidas/quantidade/instalação, frete e outros custos, margem e desconto autorizado; cálculo grava fotografia imutável; visão interna (custos, margens, necessidade de compra, memória de cálculo) separada da **proposta ao cliente** (imprimível). |
| Configurações | Mão de obra (R$/h), custos indiretos, tributos e comissões, parâmetros gerais e usuários (papel, liberação, limite de desconto). |

## Executar localmente

Pré-requisitos: Node.js ≥ 20.9, Docker (para o Supabase local) e o Supabase CLI
(`npx supabase` já funciona).

```bash
npm install

# 1. Sobe Postgres, Auth, API REST e Studio locais (Docker)
npx supabase start

# 2. Aplica as migrações e os dados DEMONSTRATIVOS de supabase/seed.sql
npx supabase db reset

# 3. Configure as variáveis com os valores de `npx supabase status`
cp .env.example .env.local
#   NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
#   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<publishable key ou anon key>

# 4. Inicie a aplicação
npm run dev   # http://localhost:3000
```

### Primeiro administrador

Cadastros públicos ficam desativados e todo usuário novo entra **inativo**.

1. Crie o usuário no Studio (`http://127.0.0.1:54323` › Authentication › Add user)
   ou, em produção, use **Invite user** no painel do Supabase.
2. Promova-o no SQL Editor:

```sql
update public.profiles
set role = 'admin', active = true
where email = 'seu-email@empresa.com.br';
```

Os demais usuários são liberados pela tela **Configurações › Usuários**
(papel `admin`, `gestor` ou `vendedor` e limite de desconto).

### Primeiros cadastros sugeridos

1. Configurações: mão de obra (R$/h), custos indiretos, tributos e comissões,
   margem sugerida e prazo para preço desatualizado.
2. Fornecedores → Materiais → Preços (ofertas).
3. Produtos → criar ficha (v1) → componentes e operações → simular → publicar.
4. Orçamentos.

> `supabase/seed.sql` contém apenas registros **fictícios**, marcados com
> `DEMO`/`[DEMONSTRAÇÃO]`. Ele roda só no `db reset` local, nunca em produção.

## Produção (Supabase Cloud + Vercel ou similar)

```bash
npx supabase link --project-ref <ref-do-projeto>
npx supabase db push          # aplica supabase/migrations
```

No painel do Supabase:

- **Authentication › Sign In / Providers**: desative "Allow new users to sign up".
- **Authentication › URL Configuration**: Site URL = URL da aplicação; adicione
  `https://SEU-DOMINIO/auth/confirm` às Redirect URLs.
- **Authentication › Email Templates** (fluxo SSR): nos modelos *Invite user* e
  *Reset password*, use links no formato
  `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=invite`
  (ou `type=recovery`). A rota `/auth/confirm` valida o token e leva à tela de
  definição de senha.

Na hospedagem, defina apenas `NEXT_PUBLIC_SUPABASE_URL` e
`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. A aplicação **não usa** a chave
secreta/service role.

## Scripts

| Comando | Descrição |
| --- | --- |
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` / `npm start` | Build e execução de produção |
| `npm run typecheck` | Gera tipos de rotas do Next e roda `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm test` | Testes Vitest (unitários; os de banco são pulados sem `TEST_DATABASE_URL`) |
| `npm run db:test` | Recria um banco descartável, aplica as migrações e roda os testes de banco |
| `npm run db:types` | Regera `src/server/db/database.types.ts` a partir de um banco migrado |
| `npm run check` | typecheck + lint + testes |

### Testes de banco

Exigem um PostgreSQL acessível e o `psql`. O nome do banco precisa conter
`test` (proteção contra apagar o banco errado):

```bash
TEST_DATABASE_URL=postgres://postgres:postgres@localhost:54322/vidra_test npm run db:test
```

`tests/db/supabase-shim.sql` emula o mínimo do Supabase (papéis `anon`,
`authenticated`, `auth.users`, `auth.uid()`) para testar triggers e políticas
RLS num Postgres comum. Os testes cobrem: acesso anônimo bloqueado, usuário
inativo sem dados, escalonamento de papel impedido, histórico de preços
imutável, oferta preferencial única, fichas publicadas congeladas, limite de
desconto, fotografias imutáveis, invalidação do cálculo ao editar, auditoria e
gravação do resultado real do motor via `save_quote_calculation`.

Com o Supabase CLI, `npx supabase db reset` seguido de `npm run db:types` com
`TEST_DATABASE_URL=postgres://postgres:postgres@127.0.0.1:54322/postgres`
também serve para regerar os tipos (ou use `npx supabase gen types typescript --local`).

## Segurança

- RLS habilitada em todas as tabelas; o papel `anon` não tem privilégio algum.
- Novos usuários entram inativos; somente administradores alteram papéis.
- Escrita em materiais, preços, fichas e taxas: `admin` e `gestor`.
  Clientes e orçamentos: qualquer usuário ativo (orçamento editável pelo autor
  ou por gestores).
- Limite de desconto por usuário validado no banco (trigger), não só na tela.
- Histórico de preços, fotografias de custo e auditoria são imutáveis
  (triggers bloqueiam UPDATE/DELETE).
- Sessão validada no servidor com `getClaims()`; toda Server Action reverifica
  autenticação e papel; somente a chave publicável chega ao navegador.

## Limitações conhecidas e próximos passos

- **Fórmulas técnicas da linha Suprema**: não implementadas de propósito. As
  fichas usam bases genéricas (fixa, largura, altura, perímetro, área) com
  coeficientes e ajustes informados pela empresa. Quando as fórmulas de corte
  forem validadas, elas devem entrar como um novo tipo de regra versionada,
  com testes próprios.
- **Plano de corte / otimização de barras**: a necessidade de compra é uma
  estimativa por metragem total arredondada à unidade de compra.
- **Parâmetros técnicos de materiais** (peso linear, espessura): adiados até
  existirem regras que os usem (ver docs/ARQUITETURA.md).
- O cálculo roda no servidor da aplicação e é gravado pela função
  `save_quote_calculation`. Um usuário autenticado com acesso direto à API
  poderia gravar uma fotografia própria; o risco é mitigado por RLS, autoria
  registrada (`calculated_by`) e auditoria. Se necessário, mover a gravação
  para uma Edge Function com chave de serviço.
- Proposta em PDF é feita pela impressão do navegador ("Salvar como PDF").
- Sistema de empresa única (sem multiempresa).

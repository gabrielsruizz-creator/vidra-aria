# Arquitetura — Vidra Aria

Sistema interno de custos, formação de preços e orçamentos para uma indústria de
esquadrias de alumínio, vidros, boxes, guarda-corpos e espelhos.

## Camadas

```
┌──────────────────────────────────────────────────────────────────────┐
│ Interface (src/app, src/components)                                  │
│   Server Components para leitura · Client Components só p/ interação │
│   Server Actions recebem FormData → validam com Zod → chamam serviços│
├──────────────────────────────────────────────────────────────────────┤
│ Regras de negócio e motor de cálculo (src/domain)                    │
│   TypeScript puro, sem I/O, sem React, sem Supabase.                 │
│   decimal.js para todo valor monetário/quantidade. 100% testável.    │
├──────────────────────────────────────────────────────────────────────┤
│ Acesso a dados (src/server)                                          │
│   "server-only". Repositórios por agregado, montagem das entradas do │
│   motor a partir do banco e gravação das fotografias de custo.       │
├──────────────────────────────────────────────────────────────────────┤
│ Banco (supabase/migrations)                                          │
│   PostgreSQL + RLS. Integridade (FKs, checks, triggers), histórico   │
│   de preços, auditoria, versões congeladas e snapshots imutáveis.    │
└──────────────────────────────────────────────────────────────────────┘
```

Regras de dependência: `app` → `server` → `domain`; `domain` não importa nada
das outras camadas. Validações (Zod) ficam em `src/domain/**/schemas.ts` e são
compartilhadas por formulários e ações.

## Estrutura de pastas

```
supabase/
  migrations/                 # SQL versionado (aplicar em ordem)
  seed.sql                    # dados DEMONSTRATIVOS (apenas ambiente local)
scripts/
  db-test.sh                  # cria banco descartável + migrações + testes de banco
  gen-db-types.mjs            # gera src/server/db/database.types.ts
src/
  app/
    (auth)/login, esqueci-senha
    auth/confirm/route.ts     # links de e-mail (convite, recuperação)
    redefinir-senha, acesso-pendente
    (app)/                    # área autenticada (layout com navegação lateral)
      dashboard/
      orcamentos/[id]/proposta  # visão interna × proposta ao cliente
      clientes/ produtos/ materiais/ fornecedores/ precos/ configuracoes/
  components/
    ui/                       # componentes shadcn/ui
    layout/ forms/ shared/
  domain/                     # regras de negócio puras
    shared/decimal.ts         # Decimal, arredondamento, escalas
    units/                    # conversão de unidades métricas
    pricing/                  # custo efetivo de ofertas, seleção de oferta
    costing/                  # motor de custos e formação de preço
    quotes/                   # status, permissões de transição
    */schemas.ts              # validação Zod por entidade
  lib/
    supabase/                 # clientes SSR (server) e renovação de sessão (proxy)
    format.ts parse.ts        # pt-BR: moeda, datas, números, CPF/CNPJ
  server/
    auth.ts                   # sessão, perfil, papéis
    db/database.types.ts      # tipos gerados do banco
    repositories/             # consultas por agregado
    services/                 # orquestração (ex.: calcular e gravar orçamento)
  proxy.ts                    # Next 16: renova sessão e protege rotas
tests/
  db/                         # integração com Postgres (RLS, triggers)
docs/
```

## Modelo de dados

### Tabelas principais (pedidas no escopo)

| Tabela | Finalidade |
| --- | --- |
| `customers` | Clientes (PF/PJ), documento opcional e validado, endereço. |
| `suppliers` | Fornecedores: razão social, nome fantasia, CNPJ opcional, condições de pagamento. |
| `materials` | Código interno, descrição, categoria, linha de aplicação, unidade de compra, unidade de consumo, fator de conversão, comprimento comercial, ativo. |
| `supplier_material_offers` | N:N fornecedor × material com preço, unidade de compra, quantidade por embalagem, desconto, tributos não recuperáveis, frete alocado, validade, data da cotação e flag de preferencial. |
| `material_price_history` | Imutável. Uma linha por criação/alteração de preço de oferta (trigger). |
| `products` | Modelos comerciais (código, categoria, linha, se exige medidas, padronizado/sob medida). |
| `product_versions` | Ficha técnica versionada: `rascunho` → `publicada` → `arquivada`. Publicada é imutável. |
| `product_components` | Materiais da ficha: base de dimensionamento, coeficiente, ajuste em mm, perda %. |
| `labor_rates` | Custo/hora de mão de obra direta por função/setor. |
| `overhead_rates` | Custos indiretos: % sobre custo direto ou R$/hora de MO. |
| `quotes` | Orçamento: cliente, status, margem desejada, desconto, frete, outros custos, condições. |
| `quote_items` | Itens: produto + versão publicada, largura/altura (mm), quantidade, instalação, custos específicos. |
| `quote_cost_snapshots` | Fotografia imutável de cada cálculo (parâmetros e totais). |

### Tabelas auxiliares (avaliadas e adotadas)

| Tabela | Por quê |
| --- | --- |
| `profiles` | Papel (`admin`, `gestor`, `vendedor`), status ativo e limite de desconto por usuário — base das políticas RLS. |
| `units` | Unidades métricas com dimensão e fator para a unidade-base; evita texto livre e permite validar compatibilidade (base linear exige comprimento, base de área exige m²). |
| `material_categories`, `product_categories` | Categorias como dados (não enum) para a empresa ajustar sem migração. |
| `product_lines` | Linhas de aplicação (ex.: Suprema). |
| `product_labor_operations` | Tempos de fabricação/instalação por versão da ficha, ligados a `labor_rates`. |
| `sale_deduction_rates` | Tributos, comissões e taxas incidentes sobre o preço de venda. |
| `supplier_contacts` | Contatos do fornecedor de forma relacional (não JSON). |
| `company_settings` | Parâmetros gerais (dias para preço desatualizado, validade padrão, margem sugerida). |
| `quote_snapshot_items`, `quote_snapshot_lines`, `quote_snapshot_purchase_needs` | Detalhe relacional da fotografia: custo por item, cada linha de material/MO/rateio/dedução com preço e fornecedor usados, e necessidade de compra por material. |
| `audit_log` | Histórico genérico de alterações (JSONB com a imagem da linha — uso adequado de JSON). |

**Parâmetros técnicos de materiais** (peso linear, espessura etc.) foram
avaliados e **adiados**: só fazem sentido junto com fórmulas técnicas
validadas. Quando forem necessários, a recomendação é uma tabela
`material_attributes (material_id, attribute_code, numeric_value, unit_code)`.

### Diagrama simplificado

```
customers 1─N quotes 1─N quote_items N─1 product_versions N─1 products
                 │                              │
                 1─N quote_cost_snapshots       ├─1─N product_components N─1 materials
                        ├─N quote_snapshot_items│                              │
                        ├─N quote_snapshot_lines└─1─N product_labor_operations │
                        └─N quote_snapshot_purchase_needs        N─1 labor_rates
suppliers 1─N supplier_material_offers N─1 materials ─N─1 material_categories / units / product_lines
                 └─1─N material_price_history
```

### Decisões importantes

- **Dinheiro sem ponto flutuante.** `numeric` no banco; `decimal.js` na
  aplicação (`src/domain/shared/decimal.ts`). Valores são enviados ao banco como
  strings. Arredondamento comercial (meio para cima) somente nos pontos
  definidos: preço unitário de venda, totais e descontos.
- **Histórico preservado.** Mudanças em ofertas geram `material_price_history`.
  Cada cálculo de orçamento grava uma fotografia completa e imutável
  (triggers bloqueiam UPDATE/DELETE). Alterar preços depois não altera
  orçamentos salvos. Editar itens/parâmetros de um rascunho invalida o
  cálculo vigente (é preciso recalcular para enviar).
- **Fichas versionadas.** Itens de orçamento apontam para uma versão
  publicada; versões publicadas não podem ser editadas, só arquivadas.
- **Sem fórmulas técnicas presumidas.** As bases de dimensionamento são
  genéricas (fixa, largura, altura, perímetro, área) com coeficiente e
  ajuste configurados pela empresa. Planos de corte e otimização de barras
  **não** são calculados; a necessidade de compra é uma estimativa por
  metragem total arredondada para a unidade de compra.
- **Segurança.** RLS em todas as tabelas; anônimos sem privilégios; usuários
  novos entram inativos; papéis e limites de desconto validados no banco.
  A aplicação usa somente a chave publicável — nenhuma chave secreta.

## Renderização e cache

Next.js 16 com App Router. `cacheComponents` está **desligado**: todas as
telas dependem da sessão e de dados atualizados; o ganho de prerenderização
seria pequeno e a complexidade (limites de Suspense em cada leitura de
sessão) alta. Dados são lidos em Server Components; mutações via Server
Actions seguidas de `revalidatePath`.

## Fórmulas do motor de custos

Ver [MOTOR-DE-CUSTOS.md](./MOTOR-DE-CUSTOS.md).

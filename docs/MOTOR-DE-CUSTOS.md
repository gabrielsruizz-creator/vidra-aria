# Motor de custos e formação de preços

Código: `src/domain/costing/` (TypeScript puro, `decimal.js`, sem acesso a banco).
Versão das regras: `ENGINE_VERSION` em `engine.ts`, gravada em cada fotografia.

> As bases de dimensionamento abaixo são **genéricas e configuráveis**. Elas não
> substituem fórmulas técnicas de corte da linha Suprema (ou de qualquer outra
> linha), que devem ser validadas pela engenharia da empresa antes de entrar no
> sistema.

## 1. Custo do material (por unidade de consumo)

Para cada material escolhe-se uma oferta de fornecedor:

1. a oferta **preferencial** ativa e não vencida;
2. senão, a de **menor custo por unidade de consumo** entre as não vencidas;
3. se todas estiverem vencidas, a mesma regra entre as vencidas, **com aviso**.

```
custo efetivo da unidade de compra = preço × (1 − desconto%) × (1 + tributos não recuperáveis%) + frete alocado
custo por unidade de consumo       = custo efetivo / quantidade por unidade de compra
```

Avisos: preço vencido (passou da validade), desatualizado (cotação mais antiga
que `company_settings.price_stale_after_days`, padrão 90 dias) e frete não
informado.

## 2. Consumo de materiais (custo de consumo)

Por componente da ficha técnica, para **uma** unidade de produto
(largura `L` e altura `A` em metros):

| Base | Quantidade |
| --- | --- |
| fixa | coeficiente (já na unidade de consumo) |
| largura | coeficiente × (L + ajuste) |
| altura | coeficiente × (A + ajuste) |
| perímetro | coeficiente × (2L + 2A + ajuste) |
| área | coeficiente × L × A |

O resultado em metros/m² é convertido para a unidade de consumo do material
(ex.: mm). Bases lineares exigem unidade de comprimento; área exige unidade de
área (validado no banco e no motor).

```
consumo líquido = quantidade por unidade × quantidade do item
consumo bruto   = consumo líquido × (1 + perda%)
custo de consumo = consumo bruto × custo por unidade de consumo
```

## 3. Necessidade de compra

Por material, somando todos os itens do orçamento:

```
unidades de compra = arredondar_para_cima(consumo bruto total / quantidade por unidade de compra)
custo da compra    = unidades de compra × custo efetivo da unidade de compra
sobra              = unidades de compra × quantidade por unidade − consumo bruto total
```

É uma estimativa de desembolso. **Não** há plano de corte nem otimização de
barras; o preço é formado pelo **custo de consumo**, não pelo custo da compra.

## 4. Mão de obra direta e instalação

```
minutos = minutos da operação × base (fixa = 1; m para bases lineares; m² para área) × quantidade
custo   = minutos / 60 × custo/hora da função
```

Operações de `instalacao` só entram quando o item marca "incluir instalação".

## 5. Outros custos específicos e frete

- Custo específico do item: valor total informado na linha do item.
- Frete e outros custos do orçamento: rateados entre os itens
  proporcionalmente ao custo direto (materiais + MO + instalação + específico).

## 6. Custos indiretos (rateio)

Para cada taxa ativa em `overhead_rates`:

- `percentual_custo_direto`: % × (materiais + mão de obra + instalação);
- `valor_por_hora_mo`: R$/h × horas de mão de obra direta do item.

## 7. Preço recomendado

```
D = soma das deduções sobre a venda (tributos, comissões, taxas) em %
M = margem de lucro líquido desejada em % do preço
custo total = custos variáveis + custos indiretos
preço recomendado = custo total / (1 − D − M)            (exige D + M < 100%)
preço de equilíbrio (lucro zero) = custo total / (1 − D)
```

Arredondamento: preço **unitário** arredondado a centavos (meio para cima);
total do item = unitário × quantidade, arredondado. Totais de custo são a soma
dos valores sem arredondamento, arredondada no final.

## 8. Desconto, margem de contribuição e lucro líquido

```
desconto              = preço recomendado × desconto%     (limitado por usuário)
preço final           = preço recomendado − desconto
deduções sobre venda  = preço final × D
margem de contribuição = preço final − custos variáveis − deduções
lucro líquido         = margem de contribuição − custos indiretos
```

Custos variáveis = materiais + mão de obra direta + instalação + custos
específicos + frete + outros custos do orçamento. A mão de obra direta é tratada
como custo direto do produto (apontada por tempo); se a empresa preferir
tratá-la como fixa, basta modelá-la como custo indireto por hora.

Percentuais de margem são calculados sobre o **preço final**.

## 9. Fotografia (snapshot)

Ao salvar um cálculo, a aplicação grava em uma transação
(`save_quote_calculation`):

- parâmetros (margem, desconto, deduções, frete) e totais;
- custo e preço por item (com versão da ficha usada);
- cada linha de material (oferta, fornecedor, data da cotação, custo
  unitário, quantidades líquida/bruta, perda), mão de obra, rateios e deduções;
- a necessidade de compra por material;
- avisos emitidos e versão do motor.

Esses registros não podem ser alterados nem excluídos. Mudanças posteriores de
preços, taxas ou fichas não afetam orçamentos já calculados.

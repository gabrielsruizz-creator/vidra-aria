-- =============================================================================
-- DADOS DEMONSTRATIVOS — NÃO SÃO DADOS REAIS DA EMPRESA
-- =============================================================================
-- Executado apenas no ambiente LOCAL por `supabase db reset` (nunca por
-- `supabase db push`). Todos os registros têm o prefixo "DEMO" / "[DEMONSTRAÇÃO]"
-- e valores fictícios, servindo só para explorar as telas.
-- Para removê-los: veja o bloco comentado no final do arquivo.
-- =============================================================================

insert into public.suppliers (id, legal_name, trade_name, payment_terms, notes) values
  ('d0000000-0000-4000-8000-000000000001', '[DEMONSTRAÇÃO] Fornecedor de Perfis Ltda', 'DEMO Perfis', '28 dias', 'Fornecedor fictício para demonstração.'),
  ('d0000000-0000-4000-8000-000000000002', '[DEMONSTRAÇÃO] Distribuidora de Vidros Ltda', 'DEMO Vidros', '30/60 dias', 'Fornecedor fictício para demonstração.');

insert into public.materials (id, internal_code, description, category_id, product_line_id, purchase_unit_code, consumption_unit_code, conversion_factor, commercial_length_mm, notes)
select v.id::uuid, v.code, v.descr, c.id,
       case when v.suprema then (select id from public.product_lines where name = 'Suprema') end,
       v.pu, v.cu, v.factor::numeric, v.len, 'Material fictício para demonstração.'
from (values
  ('d1000000-0000-4000-8000-000000000001', 'DEMO-PERF-01', '[DEMONSTRAÇÃO] Perfil de alumínio genérico', 'perfis_aluminio', true, 'barra', 'm', '6', 6000),
  ('d1000000-0000-4000-8000-000000000002', 'DEMO-VID-08', '[DEMONSTRAÇÃO] Vidro temperado incolor 8 mm', 'vidros', false, 'm2', 'm2', '1', null),
  ('d1000000-0000-4000-8000-000000000003', 'DEMO-KIT-01', '[DEMONSTRAÇÃO] Kit de ferragens genérico', 'ferragens', false, 'cx', 'un', '10', null),
  ('d1000000-0000-4000-8000-000000000004', 'DEMO-ESC-01', '[DEMONSTRAÇÃO] Escova de vedação', 'borrachas_escovas', false, 'rolo', 'm', '50', null)
) as v(id, code, descr, cat, suprema, pu, cu, factor, len)
join public.material_categories c on c.code = v.cat;

insert into public.supplier_material_offers (supplier_id, material_id, purchase_unit_code, package_quantity, price, freight_per_unit, quoted_at, is_preferred, notes) values
  ('d0000000-0000-4000-8000-000000000001', 'd1000000-0000-4000-8000-000000000001', 'barra', 6, 100.0000, 0, current_date, true, 'Preço fictício.'),
  ('d0000000-0000-4000-8000-000000000002', 'd1000000-0000-4000-8000-000000000002', 'm2', 1, 100.0000, null, current_date - 120, false, 'Preço fictício e propositalmente desatualizado (demonstra o alerta).'),
  ('d0000000-0000-4000-8000-000000000001', 'd1000000-0000-4000-8000-000000000003', 'cx', 10, 100.0000, 0, current_date, false, 'Preço fictício.'),
  ('d0000000-0000-4000-8000-000000000001', 'd1000000-0000-4000-8000-000000000004', 'rolo', 50, 100.0000, 0, current_date, false, 'Preço fictício.');

insert into public.labor_rates (id, name, description, hourly_cost) values
  ('d2000000-0000-4000-8000-000000000001', 'DEMO Fabricação', '[DEMONSTRAÇÃO] Valor fictício.', 50),
  ('d2000000-0000-4000-8000-000000000002', 'DEMO Instalação', '[DEMONSTRAÇÃO] Valor fictício.', 50);

insert into public.overhead_rates (name, method, rate, notes) values
  ('DEMO Rateio de despesas fixas', 'percentual_custo_direto', 10, '[DEMONSTRAÇÃO] Percentual fictício.');

insert into public.sale_deduction_rates (name, kind, percent, notes) values
  ('DEMO Tributos sobre a venda', 'tributo', 10, '[DEMONSTRAÇÃO] Alíquota fictícia — confirme com a contabilidade.'),
  ('DEMO Comissão', 'comissao', 3, '[DEMONSTRAÇÃO] Percentual fictício.');

insert into public.products (id, code, name, category_id, description) values
  ('d3000000-0000-4000-8000-000000000001', 'DEMO-BOX', '[DEMONSTRAÇÃO] Box de vidro genérico',
   (select id from public.product_categories where name = 'Boxes de vidro'),
   'Produto fictício. A ficha usa regras genéricas, não fórmulas técnicas reais.');

insert into public.product_versions (id, product_id, version_number, notes) values
  ('d4000000-0000-4000-8000-000000000001', 'd3000000-0000-4000-8000-000000000001', 1, '[DEMONSTRAÇÃO] Coeficientes ilustrativos.');

insert into public.product_components (product_version_id, position, material_id, description, quantity_basis, coefficient, offset_mm, waste_percent) values
  ('d4000000-0000-4000-8000-000000000001', 1, 'd1000000-0000-4000-8000-000000000002', 'vidro (ilustrativo)', 'area', 1, 0, 5),
  ('d4000000-0000-4000-8000-000000000001', 2, 'd1000000-0000-4000-8000-000000000001', 'perfil (ilustrativo)', 'perimetro', 1, 0, 5),
  ('d4000000-0000-4000-8000-000000000001', 3, 'd1000000-0000-4000-8000-000000000004', 'escova (ilustrativo)', 'altura', 2, 0, 0),
  ('d4000000-0000-4000-8000-000000000001', 4, 'd1000000-0000-4000-8000-000000000003', 'kit (ilustrativo)', 'fixa', 1, 0, 0);

insert into public.product_labor_operations (product_version_id, position, labor_rate_id, stage, description, time_basis, minutes) values
  ('d4000000-0000-4000-8000-000000000001', 1, 'd2000000-0000-4000-8000-000000000001', 'fabricacao', 'Montagem (ilustrativo)', 'fixa', 30),
  ('d4000000-0000-4000-8000-000000000001', 2, 'd2000000-0000-4000-8000-000000000002', 'instalacao', 'Instalação (ilustrativo)', 'area', 20);

select public.publish_product_version('d4000000-0000-4000-8000-000000000001', 'Versão de demonstração');

insert into public.customers (name, person_type, notes) values
  ('[DEMONSTRAÇÃO] Cliente fictício', 'fisica', 'Cliente fictício para demonstração.');

-- Remoção dos dados demonstrativos (execute manualmente se necessário):
-- delete from public.customers where name like '[DEMONSTRAÇÃO]%';
-- (produtos/ofertas com histórico não são excluídos: desative-os em vez disso.)

/* =========================================================================
   CONFIGURAÇÕES DO SITE — edite somente este arquivo para trocar contatos,
   o link da Área do Condômino (Superlógica) e a lista de imóveis.
   ========================================================================= */
window.NOBRE = {
  nome: 'Nobre Gestão de Condomínios',
  whatsapp: '5521000000000',            // DDI + DDD + número, somente dígitos
  telefone: '(21) 00000-0000',
  email: 'contato@nobregestaodecondominios.com.br',
  cidade: 'Rio de Janeiro - RJ',
  instagram: '',                         // usuário sem @ (deixe vazio para ocultar)
  mensagemWhatsapp: 'Olá! Vim pelo site da Nobre Gestão de Condomínios e gostaria de mais informações.',

  /* Área do Condômino (Superlógica)
     Troque SUALICENCA pelo nome da licença da administradora na Superlógica
     (é o endereço que vocês usam hoje: https://SUALICENCA.superlogica.net). */
  areaCondomino: 'https://SUALICENCA.superlogica.net/clients/areadocondomino',
};

/* =========================================================================
   IMÓVEIS — cada item é um card. Os abaixo são EXEMPLOS: substitua pelos reais.
   finalidade: 'venda' ou 'aluguel'  |  destaque: true aparece na página inicial
   preco: número (aluguel = valor mensal)  |  fotos: a primeira é a capa
   ========================================================================= */
const U = (id) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=1200&q=70`;

window.IMOVEIS = [
  {
    id: 'vila-valqueire-3q', finalidade: 'venda', tipo: 'Apartamento', destaque: true,
    titulo: 'Apartamento amplo com varanda', bairro: 'Vila Valqueire', cidade: 'Rio de Janeiro/RJ',
    preco: 780000, quartos: 3, banheiros: 2, area: 98, vagas: 2, condominio: 950, iptu: 210,
    descricao: 'Apartamento iluminado, sala ampla integrada à varanda, cozinha planejada e duas vagas de garagem. Condomínio com lazer completo.',
    fotos: [U('photo-1560448204-e02f11c3d0e2'), U('photo-1502672260266-1c1ef2d93688'), U('photo-1522708323590-d24dbb6b0267')],
  },
  {
    id: 'recreio-2q', finalidade: 'venda', tipo: 'Apartamento', destaque: true,
    titulo: 'Apartamento em condomínio clube', bairro: 'Recreio dos Bandeirantes', cidade: 'Rio de Janeiro/RJ',
    preco: 450000, quartos: 2, banheiros: 2, area: 68, vagas: 1, condominio: 720, iptu: 120,
    descricao: 'Condomínio clube com piscina, academia e segurança 24h. Próximo à praia, ao comércio e ao BRT.',
    fotos: [U('photo-1545324418-cc1a3fa10c00'), U('photo-1600607687939-ce8a6c25118c')],
  },
  {
    id: 'botafogo-2q-aluguel', finalidade: 'aluguel', tipo: 'Apartamento', destaque: true,
    titulo: 'Apartamento mobiliado próximo ao metrô', bairro: 'Botafogo', cidade: 'Rio de Janeiro/RJ',
    preco: 3200, quartos: 2, banheiros: 1, area: 75, vagas: 1, condominio: 880, iptu: 150,
    descricao: 'Mobiliado e pronto para morar, a poucos minutos do metrô. Prédio com portaria 24h.',
    fotos: [U('photo-1522708323590-d24dbb6b0267'), U('photo-1560448204-e02f11c3d0e2')],
  },
  {
    id: 'barra-tijuca-casa-4q', finalidade: 'venda', tipo: 'Casa', destaque: true,
    titulo: 'Casa com piscina em condomínio fechado', bairro: 'Barra da Tijuca', cidade: 'Rio de Janeiro/RJ',
    preco: 1250000, quartos: 4, banheiros: 4, area: 180, vagas: 3, condominio: 1400, iptu: 380,
    descricao: 'Casa em condomínio fechado com piscina, área gourmet e jardim. Suíte master com closet.',
    fotos: [U('photo-1613490493576-7fde63acd811'), U('photo-1600596542815-ffad4c1539a9')],
  },
  {
    id: 'tijuca-2q-aluguel', finalidade: 'aluguel', tipo: 'Apartamento', destaque: false,
    titulo: 'Apartamento reformado', bairro: 'Tijuca', cidade: 'Rio de Janeiro/RJ',
    preco: 2400, quartos: 2, banheiros: 1, area: 70, vagas: 1, condominio: 650, iptu: 90,
    descricao: 'Totalmente reformado, com armários planejados. Rua tranquila, próxima à Praça Saens Peña.',
    fotos: [U('photo-1502672260266-1c1ef2d93688')],
  },
  {
    id: 'freguesia-cobertura', finalidade: 'venda', tipo: 'Cobertura', destaque: false,
    titulo: 'Cobertura duplex com terraço', bairro: 'Freguesia (Jacarepaguá)', cidade: 'Rio de Janeiro/RJ',
    preco: 890000, quartos: 3, banheiros: 3, area: 140, vagas: 2, condominio: 1100, iptu: 260,
    descricao: 'Cobertura duplex com terraço, churrasqueira e vista livre. Condomínio com lazer completo.',
    fotos: [U('photo-1600585154340-be6161a56a0c')],
  },
  {
    id: 'centro-sala', finalidade: 'aluguel', tipo: 'Sala comercial', destaque: false,
    titulo: 'Sala comercial pronta para uso', bairro: 'Centro', cidade: 'Rio de Janeiro/RJ',
    preco: 1800, quartos: 0, banheiros: 1, area: 35, vagas: 0, condominio: 520, iptu: 80,
    descricao: 'Sala com divisórias, ar-condicionado e copa. Prédio com recepção e próximo ao VLT.',
    fotos: [U('photo-1497366216548-37526070297c')],
  },
];

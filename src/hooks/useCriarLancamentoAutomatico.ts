import { supabase } from "@/integrations/supabase/client";

interface DadosAgendamentoAvulso {
  nomeCliente: string;
  nomePet: string;
  nomeServico: string;
  dataAgendamento: string; // formato YYYY-MM-DD
  dataVenda: string; // formato YYYY-MM-DD
  ownerId: string;
}

interface DadosAgendamentoPacote {
  nomeCliente: string;
  nomePet: string;
  nomePacote: string;
  dataVenda: string; // formato YYYY-MM-DD
  primeiraDataServico: string; // formato YYYY-MM-DD (para determinar mês/ano)
  ownerId: string;
}

export const criarLancamentoFinanceiroAvulso = async (dados: DadosAgendamentoAvulso) => {
  try {
    const { nomeCliente, nomePet, nomeServico, dataAgendamento, dataVenda, ownerId } = dados;

    // 1. Buscar cliente_id pelo nome
    const { data: clientesData } = await supabase
      .from("clientes")
      .select("id")
      .eq("user_id", ownerId)
      .ilike("nome_cliente", nomeCliente)
      .limit(1);

    const clienteId = clientesData?.[0]?.id || null;

    // 2. Buscar pet_id pelo nome e cliente_id
    let petId: string | null = null;
    if (clienteId) {
      const { data: petsData } = await supabase
        .from("pets")
        .select("id")
        .eq("user_id", ownerId)
        .eq("cliente_id", clienteId)
        .ilike("nome_pet", nomePet)
        .limit(1);
      
      petId = petsData?.[0]?.id || null;
    } else {
      // Se não encontrou cliente, buscar pet apenas pelo nome
      const { data: petsData } = await supabase
        .from("pets")
        .select("id")
        .eq("user_id", ownerId)
        .ilike("nome_pet", nomePet)
        .limit(1);
      
      petId = petsData?.[0]?.id || null;
    }

    // 3. Buscar valor do serviço
    const { data: servicosData } = await supabase
      .from("servicos")
      .select("valor")
      .eq("user_id", ownerId)
      .ilike("nome", nomeServico)
      .limit(1);

    const valorServico = servicosData?.[0]?.valor ? Number(servicosData[0].valor) : 0;

    // 4. Buscar primeira conta bancária
    const { data: contasData } = await supabase
      .from("contas_bancarias")
      .select("id")
      .eq("user_id", ownerId)
      .order("created_at", { ascending: true })
      .limit(1);

    const contaId = contasData?.[0]?.id || null;

    // 5. Extrair ano e mês da data do agendamento
    const [ano, mes] = dataAgendamento.split("-");

    // 6. Criar lançamento financeiro
    const { data: lancamentoData, error: lancamentoError } = await supabase
      .from("lancamentos_financeiros")
      .insert([
        {
          user_id: ownerId,
          ano: ano,
          mes_competencia: mes,
          tipo: "Receita",
          descricao1: "Receita Operacional",
          cliente_id: clienteId,
          pet_ids: petId ? [petId] : [],
          valor_total: valorServico,
          data_pagamento: dataVenda,
          conta_id: contaId,
          pago: false,
        },
      ])
      .select("id")
      .single();

    if (lancamentoError) {
      console.error("Erro ao criar lançamento financeiro:", lancamentoError);
      return;
    }

    // 7. Criar item do lançamento
    const { error: itemError } = await supabase
      .from("lancamentos_financeiros_itens")
      .insert([
        {
          lancamento_id: lancamentoData.id,
          descricao2: "Serviços",
          produto_servico: nomeServico,
          valor: valorServico,
          quantidade: 1,
        },
      ]);

    if (itemError) {
      console.error("Erro ao criar item do lançamento:", itemError);
    }

    console.log("Lançamento financeiro criado automaticamente para agendamento avulso");
  } catch (error) {
    console.error("Erro na automação de lançamento financeiro (avulso):", error);
  }
};

export const criarLancamentoFinanceiroPacote = async (dados: DadosAgendamentoPacote) => {
  try {
    const { nomeCliente, nomePet, nomePacote, dataVenda, primeiraDataServico, ownerId } = dados;

    // 1. Buscar cliente_id pelo nome
    const { data: clientesData } = await supabase
      .from("clientes")
      .select("id")
      .eq("user_id", ownerId)
      .ilike("nome_cliente", nomeCliente)
      .limit(1);

    const clienteId = clientesData?.[0]?.id || null;

    // 2. Buscar pet_id pelo nome e cliente_id
    let petId: string | null = null;
    if (clienteId) {
      const { data: petsData } = await supabase
        .from("pets")
        .select("id")
        .eq("user_id", ownerId)
        .eq("cliente_id", clienteId)
        .ilike("nome_pet", nomePet)
        .limit(1);
      
      petId = petsData?.[0]?.id || null;
    } else {
      const { data: petsData } = await supabase
        .from("pets")
        .select("id")
        .eq("user_id", ownerId)
        .ilike("nome_pet", nomePet)
        .limit(1);
      
      petId = petsData?.[0]?.id || null;
    }

    // 3. Buscar valor_final do pacote
    const { data: pacotesData } = await supabase
      .from("pacotes")
      .select("valor_final")
      .eq("user_id", ownerId)
      .ilike("nome", nomePacote)
      .limit(1);

    const valorPacote = pacotesData?.[0]?.valor_final ? Number(pacotesData[0].valor_final) : 0;

    // 4. Buscar primeira conta bancária
    const { data: contasData } = await supabase
      .from("contas_bancarias")
      .select("id")
      .eq("user_id", ownerId)
      .order("created_at", { ascending: true })
      .limit(1);

    const contaId = contasData?.[0]?.id || null;

    // 5. Extrair ano e mês da primeira data de serviço
    const [ano, mes] = primeiraDataServico.split("-");

    // 6. Criar lançamento financeiro
    const { data: lancamentoData, error: lancamentoError } = await supabase
      .from("lancamentos_financeiros")
      .insert([
        {
          user_id: ownerId,
          ano: ano,
          mes_competencia: mes,
          tipo: "Receita",
          descricao1: "Receita Operacional",
          cliente_id: clienteId,
          pet_ids: petId ? [petId] : [],
          valor_total: valorPacote,
          data_pagamento: dataVenda,
          conta_id: contaId,
          pago: false,
        },
      ])
      .select("id")
      .single();

    if (lancamentoError) {
      console.error("Erro ao criar lançamento financeiro:", lancamentoError);
      return;
    }

    // 7. Criar item do lançamento
    const { error: itemError } = await supabase
      .from("lancamentos_financeiros_itens")
      .insert([
        {
          lancamento_id: lancamentoData.id,
          descricao2: "Serviços",
          produto_servico: nomePacote,
          valor: valorPacote,
          quantidade: 1,
        },
      ]);

    if (itemError) {
      console.error("Erro ao criar item do lançamento:", itemError);
    }

    console.log("Lançamento financeiro criado automaticamente para agendamento de pacote");
  } catch (error) {
    console.error("Erro na automação de lançamento financeiro (pacote):", error);
  }
};

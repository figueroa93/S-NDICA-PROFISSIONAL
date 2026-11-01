# Portaria Dom Duarte — controle de veículos

Aplicativo web para registrar entrada e saída de veículos na portaria do Condomínio Dom Duarte.
Ele roda 100% no Google (Apps Script + Planilha Google), sem servidor próprio e sem custo.

- **Conta dona:** domduartecondominio@gmail.com
- **Planilha:** `1o1gCe6_qwFHPogIimGcwJHhzkP_Zhy4FgBOCYitv7_g`, aba **Movimentos**
- **Script (vinculado à planilha):** `1zkQ7HjSVSPzfrKcP8-yn4TWvzKjSW1nMdu_qcmeHrG9Ef0b82_dR336Q`
- **deploymentId:** `AKfycby482MjwrMZPOi1pO4AJp_AHerg8p5hj-oj5CCfiWG8xAwRsoGT_8_FkL5cbYDJmW0gwQ`
- **Link do app:** https://script.google.com/macros/s/AKfycby482MjwrMZPOi1pO4AJp_AHerg8p5hj-oj5CCfiWG8xAwRsoGT_8_FkL5cbYDJmW0gwQ/exec No celular, abra no Chrome e use
  *⋮ → Adicionar à tela inicial*. No iPhone, abra no Safari e use *Compartilhar → Adicionar à Tela de Início*.

## Arquivos

| Arquivo | O que é |
|---|---|
| `Codigo.gs` | Servidor: grava e lê a planilha, valida PIN, placa e porteiro |
| `Index.html` | Interface do celular |
| `appsscript.json` | Configuração: fuso America/Sao_Paulo, executa como o dono, acesso a qualquer pessoa com o link |
| `.clasp.json` | Liga esta pasta ao projeto Apps Script (gerado pelo clasp) |
| `teste/teste-servidor.js` | Teste da lógica do servidor com planilha simulada (`node teste/teste-servidor.js`) |

## Regras

- Uma linha por passagem de veículo (colunas A–Q).
- Qualquer porteiro pode dar a **saída** de um veículo que entrou com outro porteiro. A saída fecha a
  entrada aberta mais recente daquela placa e calcula a permanência em minutos.
- Sem entrada aberta, a saída é gravada como **"Saída sem entrada"** depois de um segundo toque.
- Uma entrada duplicada (veículo que já está no pátio) também pede um segundo toque.
- A **unidade de destino** fica em destaque logo abaixo da placa. Se já houver veículo no pátio para a mesma
  unidade, o app avisa (sem bloquear) e marca "N carros na unidade" na lista do pátio.
- A coluna **Q — Tempo de permanência** (horas:minutos) é uma fórmula: para veículos no pátio ela conta até agora
  e se atualiza a cada minuto; depois da saída mostra o tempo final. A coluna M continua com os minutos.

## Publicar pela primeira vez

Pré-requisitos: Node.js e `npm i -g @google/clasp`.

1. Ative a API do Apps Script em https://script.google.com/home/usersettings (logado na conta do condomínio).
2. `clasp login` (entre com domduartecondominio@gmail.com).
3. O `.clasp.json` desta pasta já aponta para o script vinculado à planilha. Não rode `clasp create`:
   o clasp 3 ignora `--parentId` e cria uma planilha nova.
4. `clasp push -f`
5. Abra o editor (`clasp open-script`). Em **Configurações do projeto (⚙) → Propriedades do script**,
   adicione a propriedade `PIN` com o PIN da portaria. Depois, no editor, escolha a função **preparar**
   e clique em **Executar**.
   Autorize o acesso à planilha quando o Google pedir. Esse passo é obrigatório uma vez.
6. `clasp deploy -d "Portaria Dom Duarte"`. Guarde o **deploymentId** que aparecer.
   A URL do app é `https://script.google.com/macros/s/<deploymentId>/exec`.

## Atualizar mantendo o mesmo link

Depois de alterar `Codigo.gs` ou `Index.html`:

```bash
clasp push -f
```

```bash
clasp deploy -i AKfycby482MjwrMZPOi1pO4AJp_AHerg8p5hj-oj5CCfiWG8xAwRsoGT_8_FkL5cbYDJmW0gwQ -d "descrição da mudança"
```

Use **sempre** `-i <deploymentId>`. Sem ele, o clasp cria uma implantação nova com outro link.
Para ver os deploymentIds: `clasp deployments`.

## Trocar o PIN

O PIN **não fica no código**, porque este repositório é público. Ele fica guardado no projeto Apps Script:

1. Abra o editor do Apps Script (`clasp open-script`, ou pela planilha em *Extensões → Apps Script*).
2. Vá em **Configurações do projeto (⚙) → Propriedades do script** e edite o valor de `PIN`.
   Deixe o valor vazio para não exigir PIN. Se você apagar a propriedade, o app fica bloqueado.
3. Salve. A troca vale na hora, sem precisar publicar de novo.
4. No celular da portaria, o app vai mostrar a tela de PIN. Digite o novo PIN uma vez; ele fica salvo no aparelho.

## Dicas

- O app sincroniza a cada 20 s e quando volta para a tela.
- Sem internet, o app avisa: **"O registro NÃO foi salvo. Tente de novo."**
- Os dados ficam só na planilha. Corrija um registro errado editando a linha diretamente na aba Movimentos.

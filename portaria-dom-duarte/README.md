# Portaria Dom Duarte — controle de veículos

Aplicativo web para registrar entrada e saída de veículos na portaria do Condomínio Dom Duarte.
Ele roda 100% no Google (Apps Script + Planilha Google), sem servidor próprio e sem custo.

- **Conta dona:** domduartecondominio@gmail.com
- **Planilha:** `1o1gCe6_qwFHPogIimGcwJHhzkP_Zhy4FgBOCYitv7_g`, aba **Movimentos**
- **Link do app:** a URL `/exec` da implantação (veja abaixo). No celular, abra no Chrome e use
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

- Uma linha por passagem de veículo (colunas A–P).
- Qualquer porteiro pode dar a **saída** de um veículo que entrou com outro porteiro. A saída fecha a
  entrada aberta mais recente daquela placa e calcula a permanência em minutos.
- Sem entrada aberta, a saída é gravada como **"Saída sem entrada"** depois de um segundo toque.
- Uma entrada duplicada (veículo que já está no pátio) também pede um segundo toque.

## Publicar pela primeira vez

Pré-requisitos: Node.js e `npm i -g @google/clasp`.

1. Ative a API do Apps Script em https://script.google.com/home/usersettings (logado na conta do condomínio).
2. `clasp login` (entre com domduartecondominio@gmail.com).
3. Nesta pasta, se ainda não houver `.clasp.json`:
   ```bash
   clasp create --type sheets --title "Portaria Dom Duarte" --parentId 1o1gCe6_qwFHPogIimGcwJHhzkP_Zhy4FgBOCYitv7_g --rootDir .
   ```
   Se o `create` sobrescrever o `appsscript.json`, recupere a versão deste repositório antes do push.
4. `clasp push -f`
5. Abra o editor (`clasp open-script`), escolha a função **preparar** e clique em **Executar**.
   Autorize o acesso à planilha quando o Google pedir. Esse passo é obrigatório uma vez.
6. `clasp deploy -d "Portaria Dom Duarte"`. Guarde o **deploymentId** que aparecer.
   A URL do app é `https://script.google.com/macros/s/<deploymentId>/exec`.

## Atualizar mantendo o mesmo link

Depois de alterar `Codigo.gs` ou `Index.html`:

```bash
clasp push -f
```

```bash
clasp deploy -i <deploymentId> -d "descrição da mudança"
```

Use **sempre** `-i <deploymentId>`. Sem ele, o clasp cria uma implantação nova com outro link.
Para ver os deploymentIds: `clasp deployments`.

## Trocar o PIN

1. Em `Codigo.gs`, altere a linha do topo: `const PIN = '1234';` (use `''` para não exigir PIN).
2. Rode `clasp push -f` e depois `clasp deploy -i <deploymentId>`. Também dá para editar direto no editor
   do Apps Script e usar *Implantar → Gerenciar implantações → editar → Nova versão*.
3. No celular da portaria, o app vai mostrar a tela de PIN. Digite o novo PIN uma vez; ele fica salvo no aparelho.

## Dicas

- O app sincroniza a cada 20 s e quando volta para a tela.
- Sem internet, o app avisa: **"O registro NÃO foi salvo. Tente de novo."**
- Os dados ficam só na planilha. Corrija um registro errado editando a linha diretamente na aba Movimentos.

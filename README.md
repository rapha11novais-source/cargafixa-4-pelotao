# Carga Fixa · Conferência individual

Plataforma nova e independente, com formulário em quatro etapas e integração ao Google Sheets. Não depende das outras plataformas do usuário nem altera seus repositórios.

## Funcionamento

- Identificação por nome e matrícula.
- Carga fixa de pistola: Sim exibe modelo PT100/PT840/GLOCK, série, quantidade inteira de munições e necessidade de substituição. Não omite esses dados.
- Carga fixa de placa de colete: Sim exibe série e validade. Não omite esses dados.
- ACAF: data obrigatória; se vencida ou com vencimento até o dia correspondente a dois meses de calendário a partir de hoje, inclusive, exige ciência de renovação e das sanções administrativas conforme as normas aplicáveis. O texto não especifica penalidades que não foram fornecidas pela corporação.
- Datas verificadas no horário de São Paulo. Nos meses sem dia correspondente, o limite usa o último dia do mês. Em 04/11/2026, a ciência é obrigatória para validade até 04/01/2027.
- Conferência repetida no servidor antes da gravação. A ciência não vem marcada.
- Confirmação e protocolo apresentados pelo Google somente depois de gravar na planilha.

## Ativar Google Sheets

1. Crie um novo projeto em [Google Apps Script](https://script.google.com/home/start).
2. Substitua o conteúdo de Código.gs pelo arquivo [google-apps-script/Code.gs](google-apps-script/Code.gs). Ele já inclui todas as regras; não é necessário copiar outros arquivos de código.
3. Selecione a função `instalar`, execute e revise a autorização de acesso ao Google Sheets. Será criada uma planilha nova chamada **Carga Fixa — Conferências e ACAF**. Executar novamente reutiliza a mesma planilha; não apaga registros. O link da planilha aparece no registro de execução.
4. Clique em **Implantar → Nova implantação → App da Web**. Execute como o proprietário. Escolha quem poderá enviar conforme o público autorizado pela unidade; com Google Workspace, prefira o domínio institucional. Em conta pessoal, as opções podem ser mais amplas. A planilha continua privada, sem compartilhamento automático.
5. Copie a URL final terminada em `/exec` e informe-a em `public/config.js`, na propriedade `endpoint`. Execute `npm run build` e envie as alterações de `public/config.js` e `docs/config.js` ao GitHub. Quem editar diretamente pelo GitHub deve atualizar ambos os arquivos.
6. Em **Settings → Pages**, escolha **Deploy from a branch → main → /docs** e salve.
7. Abra o site e faça um teste com dados claramente fictícios. A aba do Google deve mostrar o protocolo e a aba **Conferências** da planilha deve conter exatamente uma linha. Teste também a ACAF vencida sem ciência: o envio deve ser impedido.

O conector não possui função que exponha registros. Seu endereço /exec é público de configuração e não substitui autenticação. O site do GitHub não armazena respostas no repositório, nem no armazenamento local do navegador. Só a planilha recebe os dados enviados. Não publique a planilha, cópias de respostas, senhas ou chaves.

## Por que a confirmação abre em outra aba?

O GitHub Pages hospeda arquivos estáticos. O envio usa POST de formulário HTML para o Apps Script, que valida e grava antes de exibir a confirmação. Isso evita depender de CORS, iframe ou `fetch` em modo `no-cors`, que não permite conferir a resposta. O site não declara sucesso apenas porque tentou enviar. Em erro, corrija na aba original e tente novamente. Repetir o mesmo protocolo com os mesmos dados não duplica o registro.

## Campos da planilha

Protocolo, data/hora do registro, nome, matrícula, carga de pistola, modelo, série, munições, substituição, carga de colete, série, validade da placa, validade da ACAF, situação no envio, ciência, texto e versão do termo, referência diária e resumo de integridade. O resumo é usado para identificar repetição de envio; não é assinatura digital.

Não renomeie nem reordene as colunas da aba de registros; o conector interrompe o envio se o cabeçalho for alterado. Para relatórios, use outra aba. Séries e matrículas são mantidas como texto, e entradas que poderiam virar fórmulas são neutralizadas.

## Desenvolvimento e verificação

Sem dependências externas de execução. `npm run build` prepara `/docs` para o Pages e junta as regras no conector `Code.gs`. `npm test` verifica datas, quatro combinações de carga, confirmação obrigatória no servidor, gravação e repetição de protocolo com serviços Google simulados. `npm start` abre o servidor local na porta 8787.

O formulário desativa o envio e mostra um aviso quando a integração ainda não está configurada. A autorização Google, a implantação e o teste real de gravação precisam ser concluídos antes do uso operacional. A validação da ACAF usa as datas informadas; não verifica autenticidade documental nem impõe sanções.

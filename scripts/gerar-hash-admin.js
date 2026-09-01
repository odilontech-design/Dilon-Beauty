/**
 * Gera o hash bcrypt da senha do painel administrativo.
 *
 * Uso:
 *   node scripts/gerar-hash-admin.js
 *
 * A senha e digitada aqui e NAO aparece na tela, nao fica no historico do
 * terminal e nao sai desta maquina. O que o script imprime e o hash, que e
 * seguro colar na Vercel: dele nao da pra voltar pra senha.
 *
 * Depois de configurar ADMIN_PASSWORD_HASH nas variaveis de ambiente,
 * REMOVA a ADMIN_PASSWORD antiga. Enquanto as duas existirem, o codigo usa o
 * hash, mas deixar a senha em texto puro configurada nao tem beneficio e
 * mantem o risco.
 */
const bcrypt = require("bcryptjs");
const readline = require("readline");

function perguntarSenha(rotulo) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    // Silencia o eco: o terminal nao mostra o que esta sendo digitado.
    const escrever = rl._writeToOutput;
    rl._writeToOutput = function (texto) {
      if (texto.includes(rotulo)) escrever.call(rl, texto);
    };
    rl.question(rotulo, (valor) => {
      rl._writeToOutput = escrever;
      rl.close();
      process.stdout.write("\n");
      resolve(valor);
    });
  });
}

(async () => {
  const senha = await perguntarSenha("Senha do painel: ");
  if (senha.length < 8) {
    console.error("\nSenha curta demais. Use pelo menos 8 caracteres.");
    process.exit(1);
  }

  const confirmacao = await perguntarSenha("Digite de novo: ");
  if (senha !== confirmacao) {
    console.error("\nAs duas nao batem. Nada foi gerado.");
    process.exit(1);
  }

  const hash = await bcrypt.hash(senha, 10);

  console.log("\nConfigure esta variavel na Vercel (Settings > Environment Variables):\n");
  console.log("  ADMIN_PASSWORD_HASH=" + hash);
  console.log("\nDepois remova a ADMIN_PASSWORD antiga e faca um novo deploy.");
})();

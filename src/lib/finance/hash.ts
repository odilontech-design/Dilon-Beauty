import crypto from "crypto";

// Hash estável de uma linha de extrato, usado como externalId quando o
// arquivo não traz um identificador único (FITID do OFX). Mesma
// data+descrição+valor+tipo => mesmo hash, o que é exatamente o que
// queremos pra não deixar importar a mesma linha duas vezes.
export function hashRow(parts: (string | number)[]): string {
  return crypto.createHash("sha1").update(parts.join("|")).digest("hex");
}

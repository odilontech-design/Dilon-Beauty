export { default } from "next-auth/middleware";

// Tudo que estiver sob esses caminhos exige sessão válida.
// A página de login e os assets públicos ficam de fora.
export const config = {
  matcher: [
    "/dashboard/:path*",
    "/agenda/:path*",
    "/clientes/:path*",
    "/financeiro/:path*",
    "/comissoes/:path*",
    "/estoque/:path*",
    "/configuracoes/:path*",
  ],
};

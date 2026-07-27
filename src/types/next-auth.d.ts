import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id?: string;
      name?: string | null;
      email?: string | null;
      salonId: string;
      salonName: string;
      salonPlan: string;
      role: string;
    };
  }
}

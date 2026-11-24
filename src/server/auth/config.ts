import type { NextAuthConfig } from "next-auth";

const AUTH_ROUTES = ["/login", "/register"];

export const authConfig = {
  pages: { signIn: "/login", error: "/login" },
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 7 },
  providers: [],
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = Boolean(auth?.user);
      const isAuthRoute = AUTH_ROUTES.some((r) => nextUrl.pathname.startsWith(r));

      if (isAuthRoute) {
        const showingError = nextUrl.searchParams.has("error");
        return isLoggedIn && !showingError ? Response.redirect(new URL("/events", nextUrl)) : true;
      }
      return isLoggedIn;
    },
    jwt({ token, user }) {
      if (user?.id) token.sub = user.id;
      return token;
    },
    session({ session, token }) {
      if (token.sub) session.user.id = token.sub;
      return session;
    },
  },
} satisfies NextAuthConfig;

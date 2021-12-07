import { User } from "@prisma/client";
import bcrypt from "bcrypt";
import { createCookieSessionStorage, redirect } from "remix";
import { db } from "./db.server";

type LoginForm = {
    username: string;
    password: string;
};

export async function login({ username, password }: LoginForm) {
    let user = await db.user.findUnique({
        where: { username },
    });
    if (!user) return null;
    let isCorrectPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isCorrectPassword) return null;
    return user;
}

let sessionSecret = process.env.SESSION_SECRET;
if (!sessionSecret) {
    throw new Error("SESSION_SECRET must be set");
}

let storage = createCookieSessionStorage({
    cookie: {
        name: "RJ_session",
        secure: true,
        secrets: [sessionSecret],
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 30,
        httpOnly: true,
    },
});

/**
 * Simple helper that just pulls the cookie off the request header and passes
 * it to getSession
 */
export function getUserSession(request: Request) {
    return storage.getSession(request.headers.get("Cookie"));
}

/**
 * Gets the userId from the request session
 */
export async function getUserId(request: Request) {
    let session = await getUserSession(request);
    let userId = session.get("userId");
    if (!userId || typeof userId !== "string") return null;
    return userId;
}

/**
 * Requires that a userId exists on the session of the incoming request and returns
 * that userId
 *
 * If no userId exists, user is redirected to the login page with the redirectTo parameter
 * set so that the user gets to the page they were originally trying to get to after logging
 * in.
 */
export async function requireUserId(
    request: Request,
    redirectTo: string = new URL(request.url).pathname
) {
    let session = await getUserSession(request);
    let userId = session.get("userId");
    if (!userId || typeof userId !== "string") {
        let searchParams = new URLSearchParams([["redirectTo", redirectTo]]);
        /**
         * Throws a redirect so that the caller can safely assume they're always going to get a userId
         *
         * We could return the redirect here but then the caller is responsible for checking whether they get
         * a userId or a Response and handling them accordingly
         */
        throw redirect(`/login?${searchParams}`);
    }
    return userId;
}

/**
 * Creates a session object with the `userId` set, commits that session, and redirects to redirectTo
 */
export async function createUserSession(userId: string, redirectTo: string) {
    let session = await storage.getSession();
    session.set("userId", userId);
    return redirect(redirectTo, {
        headers: {
            "Set-Cookie": await storage.commitSession(session),
        },
    });
}

export async function getUser(request: Request) {
    let userId = await getUserId(request);
    if (typeof userId !== "string") {
        return null;
    }

    try {
        let user = await db.user.findUnique({
            where: { id: userId },
        });
        return user;
    } catch {
        throw logout(request);
    }
}

/**
 * Destroys the session and redirects the user to the home page
 */
export async function logout(request: Request) {
    const session = await getUserSession(request);

    return redirect("/login", {
        headers: {
            "Set-Cookie": await storage.destroySession(session),
        },
    });
}

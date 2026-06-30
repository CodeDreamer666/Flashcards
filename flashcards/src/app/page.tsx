import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { FlashcardApp } from "~/app/_components/FlashcardApp";
import { auth } from "~/server/better-auth";
import { getSession } from "~/server/better-auth/server";
import { HydrateClient } from "~/trpc/server";

export default async function Home() {
    const session = await getSession();

    return (
        <HydrateClient>
            <main className="min-h-screen bg-[#f6ead0] text-[#2d2215]">
                {session?.user ? (
                    <FlashcardApp />
                ) : (
                    <div className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center px-4 text-center">
                        <div className="rounded-[2rem] border border-amber-200 bg-[#fff8dd] p-8 shadow-[0_18px_80px_rgba(93,64,20,0.12)]">
                            <p className="text-sm font-semibold text-amber-700 uppercase">
                                Warm Vocabulary Desk
                            </p>
                            <h1 className="mt-4 text-4xl font-semibold text-[#2d2215] sm:text-5xl">
                                English flashcards
                            </h1>
                            <p className="mt-4 text-base leading-7 text-[#6a573c]">
                                Build a focused library of weak words and review them by random
                                practice or A-Z letter study.
                            </p>
                            <form className="mt-6">
                                <button
                                    className="rounded-full bg-amber-400 cursor-pointer px-6 py-3 text-sm font-semibold text-[#2d2215] shadow-sm transition hover:bg-amber-300"
                                    formAction={async () => {
                                        "use server";
                                        const res = await auth.api.signInSocial({
                                            body: {
                                                provider: "github",
                                                callbackURL: "/",
                                            },
                                        });

                                        if (!res.url) {
                                            throw new Error("No URL returned from signInSocial");
                                        }

                                        redirect(res.url);
                                    }}
                                >
                                    Sign in with Github
                                </button>
                            </form>
                        </div>
                    </div>
                )}
            </main>
        </HydrateClient>
    );
}

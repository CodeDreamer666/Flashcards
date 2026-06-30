import { TRPCError } from "@trpc/server";
import { z } from "zod";
import sanitizeHtml from "sanitize-html";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

const cleanText = (value: string) =>
    sanitizeHtml(value.trim(), {
        allowedTags: [],
        allowedAttributes: {},
    });

const optionalCleanText = (value?: string) => {
    const cleaned = cleanText(value ?? "");

    return cleaned.length > 0 ? cleaned : undefined;
};

const flashcardInput = z.object({
    word: z
        .string()
        .min(1, "Word is required.")
        .transform(cleanText)
        .refine((value) => value.length > 0, "Word is required."),

    meaning: z
        .string()
        .min(1, "Meaning is required.")
        .transform(cleanText)
        .refine((value) => value.length > 0, "Meaning is required."),

    partOfSpeech: z
        .string()
        .min(1, "Part of speech is required.")
        .transform(cleanText)
        .refine((value) => value.length > 0, "Part of speech is required."),

    example: z
        .string()
        .min(1, "Example sentence is required.")
        .transform(cleanText)
        .refine((value) => value.length > 0, "Example sentence is required."),

    mySentence: z
        .string()
        .optional()
        .transform(optionalCleanText),

    notes: z
        .string()
        .optional()
        .transform(optionalCleanText),
});

const importFlashcardInput = flashcardInput.extend({
    word: z.string().trim().min(1, "Word is required."),
});

function getLetter(word: string) {
    const firstCharacter = word.trim().charAt(0).toUpperCase();

    if (/^[A-Z]$/.test(firstCharacter)) {
        return firstCharacter;
    }

    return "#";
}

function optionalText(value: string | undefined) {
    if (!value) {
        return null;
    }

    const trimmedValue = value.trim();

    return trimmedValue.length > 0 ? trimmedValue : null;
}

export const flashcardRouter = createTRPCRouter({
    getAll: protectedProcedure.query(async ({ ctx }) => {
        return ctx.db.flashcard.findMany({
            where: {
                userId: ctx.session.user.id,
            },
            orderBy: [
                {
                    letter: "asc",
                },
                {
                    word: "asc",
                },
            ],
        });
    }),

    create: protectedProcedure
        .input(flashcardInput)
        .mutation(async ({ ctx, input }) => {
            const word = input.word.trim();
            const duplicate = await ctx.db.flashcard.findFirst({
                where: {
                    userId: ctx.session.user.id,
                    word: {
                        equals: word,
                        mode: "insensitive",
                    },
                },
            });

            if (duplicate) {
                throw new TRPCError({
                    code: "CONFLICT",
                    message: "You already saved this word.",
                });
            }

            return ctx.db.flashcard.create({
                data: {
                    userId: ctx.session.user.id,
                    word,
                    letter: getLetter(word),
                    meaning: input.meaning,
                    partOfSpeech: input.partOfSpeech,
                    example: input.example,
                    mySentence: optionalText(input.mySentence),
                    notes: optionalText(input.notes),
                },
            });
        }),

    delete: protectedProcedure
        .input(
            z.object({
                id: z.string().min(1, "Flashcard id is required."),
            }),
        )
        .mutation(async ({ ctx, input }) => {
            const existingFlashcard = await ctx.db.flashcard.findFirst({
                where: {
                    id: input.id,
                    userId: ctx.session.user.id,
                },
            });

            if (!existingFlashcard) {
                throw new TRPCError({
                    code: "NOT_FOUND",
                    message: "Flashcard not found.",
                });
            }

            await ctx.db.flashcard.delete({
                where: {
                    id: input.id,
                },
            });

            return {
                id: input.id,
            };
        }),

    importMany: protectedProcedure
        .input(
            z.object({
                flashcards: z.array(z.unknown()).min(1, "Paste at least one item."),
            }),
        )
        .mutation(async ({ ctx, input }) => {
            const failures: Array<{ index: number; word?: string; reason: string }> =
                [];
            const parsedFlashcards: Array<z.infer<typeof importFlashcardInput>> = [];

            input.flashcards.forEach((item, index) => {
                const parsedItem = importFlashcardInput.safeParse(item);

                if (!parsedItem.success) {
                    failures.push({
                        index,
                        reason: parsedItem.error.errors
                            .map((error) => error.message)
                            .join(" "),
                    });
                    return;
                }

                parsedFlashcards.push(parsedItem.data);
            });

            const existingFlashcards = await ctx.db.flashcard.findMany({
                where: {
                    userId: ctx.session.user.id,
                },
                select: {
                    word: true,
                },
            });
            const existingWords = new Set(
                existingFlashcards.map((flashcard) => flashcard.word.toLowerCase()),
            );
            const batchWords = new Set<string>();
            const skippedDuplicates: string[] = [];
            const flashcardsToCreate = parsedFlashcards.flatMap((flashcard) => {
                const word = flashcard.word.trim();
                const normalizedWord = word.toLowerCase();

                if (
                    existingWords.has(normalizedWord) ||
                    batchWords.has(normalizedWord)
                ) {
                    skippedDuplicates.push(word);
                    return [];
                }

                batchWords.add(normalizedWord);

                return {
                    userId: ctx.session.user.id,
                    word,
                    letter: getLetter(word),
                    meaning: flashcard.meaning,
                    partOfSpeech: flashcard.partOfSpeech,
                    example: flashcard.example,
                    mySentence: optionalText(flashcard.mySentence),
                    notes: optionalText(flashcard.notes),
                };
            });

            if (flashcardsToCreate.length > 0) {
                await ctx.db.flashcard.createMany({
                    data: flashcardsToCreate,
                });
            }

            return {
                importedCount: flashcardsToCreate.length,
                skippedDuplicates,
                failures,
            };
        }),
});

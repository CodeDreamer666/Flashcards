"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";

import { api, type RouterOutputs } from "~/trpc/react";

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

type Flashcard = RouterOutputs["flashcard"]["getAll"][number];

type FlashcardFormValues = {
    word: string;
    meaning: string;
    partOfSpeech: string;
    example: string;
    mySentence: string;
    notes: string;
};

const emptyFormValues: FlashcardFormValues = {
    word: "",
    meaning: "",
    partOfSpeech: "",
    example: "",
    mySentence: "",
    notes: "",
};

function validateForm(values: FlashcardFormValues) {
    const errors: Partial<Record<keyof FlashcardFormValues, string>> = {};

    if (!values.word.trim()) {
        errors.word = "Word is required.";
    }

    if (!values.meaning.trim()) {
        errors.meaning = "Meaning is required.";
    }

    if (!values.partOfSpeech.trim()) {
        errors.partOfSpeech = "Part of speech is required.";
    }

    if (!values.example.trim()) {
        errors.example = "Example sentence is required.";
    }

    return errors;
}

export function FlashcardApp() {
    const utils = api.useUtils();
    const [view, setView] = useState<"library" | "study">("library");
    const [initialStudyMode, setInitialStudyMode] = useState<"random" | "letter">(
        "random",
    );
    const [selectedLetter, setSelectedLetter] = useState("A");
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [formValues, setFormValues] =
        useState<FlashcardFormValues>(emptyFormValues);
    const [formErrors, setFormErrors] = useState<
        Partial<Record<keyof FlashcardFormValues, string>>
    >({});
    const [formMessage, setFormMessage] = useState("");
    const [importText, setImportText] = useState("");
    const [importMessage, setImportMessage] = useState("");

    const flashcardsQuery = api.flashcard.getAll.useQuery();

    const createFlashcard = api.flashcard.create.useMutation({
        onSuccess: async () => {
            await utils.flashcard.getAll.invalidate();
            setFormValues(emptyFormValues);
            setFormErrors({});
            setFormMessage("Word saved.");
            setIsFormOpen(false);
        },
        onError: (error) => {
            setFormMessage(error.message);
        },
    });

    const deleteFlashcard = api.flashcard.delete.useMutation({
        onSuccess: async () => {
            await utils.flashcard.getAll.invalidate();
        },
        onError: (error) => {
            setFormMessage(error.message);
        },
    });

    const importFlashcards = api.flashcard.importMany.useMutation({
        onSuccess: async (result) => {
            await utils.flashcard.getAll.invalidate();
            const duplicateText =
                result.skippedDuplicates.length > 0
                    ? ` Skipped duplicates: ${result.skippedDuplicates.join(", ")}.`
                    : "";
            const failureText = result.failures.length > 0 ? " Invalid format." : "";

            setImportMessage(
                `Imported ${result.importedCount} word${result.importedCount === 1 ? "" : "s"
                }.${duplicateText}${failureText}`,
            );

            if (result.importedCount > 0) {
                setImportText("");
            }
        },
        onError: () => {
            setImportMessage("Invalid format.");
        },
    });

    const flashcards = useMemo(
        () => flashcardsQuery.data ?? [],
        [flashcardsQuery.data],
    );
    const groupedFlashcards = useMemo(() => {
        return LETTERS.reduce<Record<string, Flashcard[]>>((groups, letter) => {
            groups[letter] = flashcards.filter(
                (flashcard) => flashcard.letter === letter,
            );

            return groups;
        }, {});
    }, [flashcards]);
    const selectedLetterFlashcards = groupedFlashcards[selectedLetter] ?? [];

    function openCreateForm() {
        setFormValues(emptyFormValues);
        setFormErrors({});
        setFormMessage("");
        setIsFormOpen(true);
    }

    function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const errors = validateForm(formValues);
        setFormErrors(errors);

        if (Object.keys(errors).length > 0) {
            setFormMessage("Please fix the highlighted fields.");
            return;
        }

        const payload = {
            word: formValues.word.trim(),
            meaning: formValues.meaning.trim(),
            partOfSpeech: formValues.partOfSpeech.trim(),
            example: formValues.example.trim(),
            mySentence: formValues.mySentence.trim(),
            notes: formValues.notes.trim(),
        };

        createFlashcard.mutate(payload);
    }

    function handleDelete(flashcard: Flashcard) {
        const confirmed = window.confirm(
            `Delete "${flashcard.word}" from your flashcards?`,
        );

        if (!confirmed) {
            return;
        }

        deleteFlashcard.mutate({
            id: flashcard.id,
        });
    }

    function handleImport() {
        setImportMessage("");

        try {
            const parsedJson = JSON.parse(importText) as unknown;

            if (!Array.isArray(parsedJson)) {
                setImportMessage("Invalid format.");
                return;
            }

            importFlashcards.mutate({
                flashcards: parsedJson,
            });
        } catch {
            setImportMessage("Invalid format.");
        }
    }

    function startStudy(mode: "random" | "letter") {
        setInitialStudyMode(mode);
        setView("study");
    }

    if (view === "study") {
        return (
            <StudyPanel
                flashcards={flashcards}
                groupedFlashcards={groupedFlashcards}
                initialMode={initialStudyMode}
                selectedLetter={selectedLetter}
                onSelectLetter={setSelectedLetter}
                onBack={() => setView("library")}
            />
        );
    }

    return (
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
            <section className="grid gap-5 rounded-[2rem] border border-amber-200 bg-[#fff8dd] p-6 shadow-[0_18px_80px_rgba(93,64,20,0.12)] md:grid-cols-[1.2fr_0.8fr] md:p-8">
                <div className="flex flex-col gap-5">
                    <div>
                        <p className="text-sm font-semibold text-amber-700 uppercase">
                            Warm Vocabulary Desk
                        </p>
                        <h1 className="mt-3 text-4xl font-semibold text-[#2d2215] sm:text-5xl">
                            English flashcards
                        </h1>
                        <p className="mt-4 max-w-2xl text-base leading-7 text-[#6a573c]">
                            Save weak words, group them automatically from A to Z, and review
                            a small set whenever you have a focused study window.
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-3">
                        <button
                            type="button"
                            className="cursor-pointer rounded-full border border-amber-300 bg-white/70 px-5 py-3 text-sm font-semibold text-[#3d2c17] transition hover:border-amber-500 hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-60"
                            onClick={() => startStudy("random")}
                            disabled={flashcards.length === 0}
                        >
                            Study Random
                        </button>
                        <button
                            type="button"
                            className="cursor-pointer rounded-full border border-amber-300 bg-white/70 px-5 py-3 text-sm font-semibold text-[#3d2c17] transition hover:border-amber-500 hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-60"
                            onClick={() => startStudy("letter")}
                            disabled={flashcards.length === 0}
                        >
                            Study by Letter
                        </button>
                    </div>
                </div>
            </section>

            {isFormOpen && (
                <FlashcardForm
                    values={formValues}
                    errors={formErrors}
                    message={formMessage}
                    isPending={createFlashcard.isPending}
                    onChange={setFormValues}
                    onClose={() => setIsFormOpen(false)}
                    onSubmit={handleSubmit}
                />
            )}

            <ImportPanel
                value={importText}
                message={importMessage}
                isPending={importFlashcards.isPending}
                onChange={setImportText}
                onImport={handleImport}
            />

            <section className="flex flex-col gap-4">
                <LetterSelector
                    selectedLetter={selectedLetter}
                    onSelectLetter={setSelectedLetter}
                />

                {flashcardsQuery.isLoading ? (
                    <div className="rounded-2xl border border-amber-200 bg-[#fffaf0] p-8 text-center text-[#6a573c]">
                        Loading your words...
                    </div>
                ) : flashcards.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-amber-300 bg-[#fffaf0] p-8 text-center">
                        <h2 className="text-2xl font-semibold text-[#2d2215]">
                            Your vocabulary desk is empty.
                        </h2>
                        <p className="mt-3 text-[#6a573c]">
                            Add your first weak word and start building a daily review list.
                        </p>
                        <button
                            type="button"
                            className="mt-5 rounded-full bg-amber-400 px-5 py-3 text-sm font-semibold text-[#2d2215] transition hover:bg-amber-300"
                            onClick={openCreateForm}
                        >
                            Add First Word
                        </button>
                    </div>
                ) : (
                    <div className="grid gap-4">
                        <LetterGroup
                            letter={selectedLetter}
                            flashcards={selectedLetterFlashcards}
                            isSelected
                            onDelete={handleDelete}
                        />
                    </div>
                )}
            </section>
        </div>
    );
}

function FlashcardForm({
    values,
    errors,
    message,
    isPending,
    onChange,
    onClose,
    onSubmit,
}: {
    values: FlashcardFormValues;
    errors: Partial<Record<keyof FlashcardFormValues, string>>;
    message: string;
    isPending: boolean;
    onChange: (values: FlashcardFormValues) => void;
    onClose: () => void;
    onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
    function updateField(field: keyof FlashcardFormValues, value: string) {
        onChange({
            ...values,
            [field]: value,
        });
    }

    return (
        <section className="rounded-2xl border border-amber-200 bg-[#fffdf2] p-5 shadow-sm">
            <div className="flex items-center justify-between gap-4">
                <h2 className="text-2xl font-semibold text-[#2d2215]">Add word</h2>
                <button
                    type="button"
                    className="rounded-full border border-amber-200 px-4 py-2 text-sm font-semibold text-[#6a573c] transition hover:bg-amber-50"
                    onClick={onClose}
                >
                    Close
                </button>
            </div>
            <form className="mt-5 grid gap-4 md:grid-cols-2" onSubmit={onSubmit}>
                <TextField
                    label="Word"
                    value={values.word}
                    error={errors.word}
                    onChange={(value) => updateField("word", value)}
                />
                <TextField
                    label="Part of speech"
                    value={values.partOfSpeech}
                    error={errors.partOfSpeech}
                    placeholder="noun, verb, adjective..."
                    onChange={(value) => updateField("partOfSpeech", value)}
                />
                <TextArea
                    label="Meaning"
                    value={values.meaning}
                    error={errors.meaning}
                    onChange={(value) => updateField("meaning", value)}
                />
                <TextArea
                    label="Example sentence"
                    value={values.example}
                    error={errors.example}
                    onChange={(value) => updateField("example", value)}
                />
                <TextArea
                    label="My own sentence"
                    value={values.mySentence}
                    onChange={(value) => updateField("mySentence", value)}
                />
                <TextArea
                    label="Notes"
                    value={values.notes}
                    onChange={(value) => updateField("notes", value)}
                />
                <div className="flex flex-col gap-3 md:col-span-2 md:flex-row md:items-center">
                    <button
                        type="submit"
                        className="rounded-full bg-amber-400 px-5 py-3 text-sm font-semibold text-[#2d2215] transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-60"
                        disabled={isPending}
                    >
                        {isPending ? "Saving..." : "Save Word"}
                    </button>
                    {message && (
                        <p className="text-sm font-medium text-[#7a4f15]">{message}</p>
                    )}
                </div>
            </form>
        </section>
    );
}

function TextField({
    label,
    value,
    error,
    placeholder,
    onChange,
}: {
    label: string;
    value: string;
    error?: string;
    placeholder?: string;
    onChange: (value: string) => void;
}) {
    return (
        <label className="flex flex-col gap-2 text-sm font-semibold text-[#3d2c17]">
            {label}
            <input
                className="rounded-2xl border border-amber-200 bg-white px-4 py-3 text-base font-normal text-[#2d2215] transition outline-none placeholder:text-[#9a8565] focus:border-amber-500 focus:ring-4 focus:ring-amber-100"
                value={value}
                placeholder={placeholder}
                onChange={(event) => onChange(event.target.value)}
            />
            {error && (
                <span className="text-sm font-medium text-red-700">{error}</span>
            )}
        </label>
    );
}

function TextArea({
    label,
    value,
    error,
    onChange,
}: {
    label: string;
    value: string;
    error?: string;
    onChange: (value: string) => void;
}) {
    return (
        <label className="flex flex-col gap-2 text-sm font-semibold text-[#3d2c17]">
            {label}
            <textarea
                className="min-h-28 rounded-2xl border border-amber-200 bg-white px-4 py-3 text-base leading-7 font-normal text-[#2d2215] transition outline-none placeholder:text-[#9a8565] focus:border-amber-500 focus:ring-4 focus:ring-amber-100"
                value={value}
                onChange={(event) => onChange(event.target.value)}
            />
            {error && (
                <span className="text-sm font-medium text-red-700">{error}</span>
            )}
        </label>
    );
}

function ImportPanel({
    value,
    message,
    isPending,
    onChange,
    onImport,
}: {
    value: string;
    message: string;
    isPending: boolean;
    onChange: (value: string) => void;
    onImport: () => void;
}) {
    return (
        <section className="rounded-2xl border border-amber-200 bg-[#fffdf2] p-5 shadow-sm">
            <h2 className="text-2xl font-semibold text-[#2d2215]">
                Import flashcards
            </h2>
            <p className="mt-2 text-sm leading-6 text-[#6a573c]">
                Paste a JSON array with word, meaning, partOfSpeech, and example.
                Optional fields: mySentence and notes.
            </p>
            <textarea
                className="mt-4 min-h-48 w-full rounded-2xl border border-amber-200 bg-white px-4 py-3 font-mono text-sm leading-6 text-[#2d2215] transition outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-100"
                value={value}
                onChange={(event) => onChange(event.target.value)}
                placeholder='[{"word":"obstacle","meaning":"something that makes progress difficult","partOfSpeech":"noun","example":"Lack of time is an obstacle to progress."}]'
            />
            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
                <button
                    type="button"
                    className="rounded-full bg-amber-400 px-5 py-3 text-sm font-semibold text-[#2d2215] transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-60"
                    onClick={onImport}
                    disabled={isPending || !value.trim()}
                >
                    {isPending ? "Importing..." : "Import Words"}
                </button>
                {message && (
                    <p className="text-sm font-medium text-[#7a4f15]">{message}</p>
                )}
            </div>
        </section>
    );
}

function LetterSelector({
    selectedLetter,
    onSelectLetter,
}: {
    selectedLetter: string;
    onSelectLetter: (letter: string) => void;
}) {
    const scrollRef = useRef<HTMLDivElement | null>(null);

    function scrollLetters(direction: "left" | "right") {
        scrollRef.current?.scrollBy({
            left: direction === "left" ? -240 : 240,
            behavior: "smooth",
        });
    }

    return (
        <div className="flex items-center gap-2">
            <button
                type="button"
                className="hidden h-9 w-9 shrink-0 rounded-full border border-amber-200 bg-[#fffaf0] text-sm font-semibold text-[#6a573c] transition hover:border-amber-400 hover:bg-amber-50 focus:ring-4 focus:ring-amber-100 focus:outline-none md:inline-flex md:items-center md:justify-center"
                aria-label="Scroll letters left"
                onClick={() => scrollLetters("left")}
            >
                ‹
            </button>
            <div
                ref={scrollRef}
                className="no-scrollbar flex min-w-0 flex-1 flex-nowrap gap-2 overflow-x-auto pb-1"
            >
                {LETTERS.map((letter) => (
                    <button
                        key={letter}
                        type="button"
                        className={`h-10 w-10 shrink-0 cursor-pointer rounded-full border text-sm font-semibold transition ${selectedLetter === letter
                                ? "border-amber-500 bg-amber-300 text-[#2d2215]"
                                : "border-amber-200 bg-[#fffaf0] text-[#6a573c] hover:border-amber-400"
                            }`}
                        onClick={() => onSelectLetter(letter)}
                    >
                        {letter}
                    </button>
                ))}
            </div>
            <button
                type="button"
                className="hidden h-9 w-9 shrink-0 rounded-full border border-amber-200 bg-[#fffaf0] text-sm font-semibold text-[#6a573c] transition hover:border-amber-400 hover:bg-amber-50 focus:ring-4 focus:ring-amber-100 focus:outline-none md:inline-flex md:items-center md:justify-center"
                aria-label="Scroll letters right"
                onClick={() => scrollLetters("right")}
            >
                ›
            </button>
        </div>
    );
}

function LetterGroup({
    letter,
    flashcards,
    isSelected,
    onDelete,
}: {
    letter: string;
    flashcards: Flashcard[];
    isSelected: boolean;
    onDelete: (flashcard: Flashcard) => void;
}) {
    return (
        <section
            className={`rounded-2xl border p-5 transition ${isSelected
                    ? "border-amber-400 bg-[#fff7cf]"
                    : "border-amber-200 bg-[#fffdf2]"
                }`}
        >
            <div className="flex items-center justify-between gap-4">
                <h2 className="text-2xl font-semibold text-[#2d2215]">{letter}</h2>
                <p className="text-sm text-[#7a633f]">
                    {flashcards.length} {flashcards.length === 1 ? "word" : "words"}
                </p>
            </div>
            {flashcards.length === 0 ? (
                <p className="mt-4 rounded-2xl border border-dashed border-amber-200 bg-white/60 p-4 text-sm text-[#7a633f]">
                    No words under this letter yet.
                </p>
            ) : (
                <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                    {flashcards.map((flashcard) => (
                        <article
                            key={flashcard.id}
                            className="rounded-2xl border border-amber-100 bg-white p-4 shadow-sm"
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <h3 className="text-xl font-semibold text-[#2d2215]">
                                        {flashcard.word}
                                    </h3>
                                    <p className="mt-1 text-sm font-medium text-amber-700">
                                        {flashcard.partOfSpeech}
                                    </p>
                                </div>
                            </div>
                            <p className="mt-3 line-clamp-2 text-sm leading-6 text-[#6a573c]">
                                {flashcard.meaning}
                            </p>
                            <div className="mt-4 flex gap-2">
                                <button
                                    type="button"
                                    className="rounded-full cursor-pointer border border-red-200 px-3 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50"
                                    onClick={() => onDelete(flashcard)}
                                >
                                    Delete
                                </button>
                            </div>
                        </article>
                    ))}
                </div>
            )}
        </section>
    );
}

function StudyPanel({
    flashcards,
    groupedFlashcards,
    initialMode,
    selectedLetter,
    onSelectLetter,
    onBack,
}: {
    flashcards: Flashcard[];
    groupedFlashcards: Record<string, Flashcard[]>;
    initialMode: "random" | "letter";
    selectedLetter: string;
    onSelectLetter: (letter: string) => void;
    onBack: () => void;
}) {
    const [mode, setMode] = useState<"random" | "letter">(initialMode);
    const [isFlipped, setIsFlipped] = useState(false);
    const [currentRandomCard, setCurrentRandomCard] = useState<Flashcard | null>(
        null,
    );
    const [letterIndex, setLetterIndex] = useState(0);
    const [finishMessage, setFinishMessage] = useState("");

    const letterCards = groupedFlashcards[selectedLetter] ?? [];
    const currentLetterCard = letterCards[letterIndex] ?? null;
    const currentCard = mode === "random" ? currentRandomCard : currentLetterCard;

    useEffect(() => {
        setMode(initialMode);
    }, [initialMode]);

    useEffect(() => {
        if (flashcards.length === 0) {
            setCurrentRandomCard(null);
            return;
        }

        setCurrentRandomCard(
            flashcards[Math.floor(Math.random() * flashcards.length)] ?? null,
        );
    }, [flashcards]);

    useEffect(() => {
        setLetterIndex(0);
        setFinishMessage("");
        setIsFlipped(false);
    }, [selectedLetter, mode]);

    function nextRandomCard() {
        if (flashcards.length === 0) {
            return;
        }

        const nextCards = flashcards.filter(
            (flashcard) => flashcard.id !== currentRandomCard?.id,
        );
        const cardPool = nextCards.length > 0 ? nextCards : flashcards;

        setCurrentRandomCard(
            cardPool[Math.floor(Math.random() * cardPool.length)] ?? null,
        );
        setIsFlipped(false);
        setFinishMessage("");
    }

    function nextLetterCard() {
        if (letterIndex + 1 < letterCards.length) {
            setLetterIndex((current) => current + 1);
            setIsFlipped(false);
            return;
        }

        const currentLetterPosition = LETTERS.indexOf(selectedLetter);
        const nextLetter = LETTERS.slice(currentLetterPosition + 1).find(
            (letter) => (groupedFlashcards[letter]?.length ?? 0) > 0,
        );

        if (nextLetter) {
            onSelectLetter(nextLetter);
            setLetterIndex(0);
            setIsFlipped(false);
            return;
        }

        setFinishMessage("You finished the available letter study cards.");
        setIsFlipped(false);
    }

    if (flashcards.length === 0) {
        return (
            <div className="mx-auto flex min-h-screen w-full max-w-3xl flex-col items-center justify-center gap-5 px-4 text-center">
                <div className="rounded-3xl border border-dashed border-amber-300 bg-[#fffaf0] p-8">
                    <h1 className="text-3xl font-semibold text-[#2d2215]">
                        No words to study yet.
                    </h1>
                    <p className="mt-3 text-[#6a573c]">
                        Add a few words first, then come back for random or letter review.
                    </p>
                    <button
                        type="button"
                        className="mt-5 rounded-full bg-amber-400 px-5 py-3 text-sm font-semibold text-[#2d2215] transition hover:bg-amber-300"
                        onClick={onBack}
                    >
                        Back to Library
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
            <div className="flex flex-col gap-4 rounded-3xl border border-amber-200 bg-[#fff8dd] p-5 md:flex-row md:items-center md:justify-between">
                <div>
                    <p className="text-sm font-semibold text-amber-700 uppercase">
                        Study Mode
                    </p>
                    <h1 className="mt-2 text-3xl font-semibold text-[#2d2215]">
                        {mode === "random" ? "Random review" : `Letter ${selectedLetter}`}
                    </h1>
                </div>
                <div className="flex flex-wrap gap-2">
                    <button
                        type="button"
                        className={`rounded-full cursor-pointer px-4 py-2 text-sm font-semibold transition ${mode === "random"
                                ? "bg-amber-400 text-[#2d2215]"
                                : "border border-amber-300 bg-white/70 text-[#5f421b]"
                            }`}
                        onClick={() => {
                            setMode("random");
                            nextRandomCard();
                        }}
                    >
                        Random
                    </button>
                    <button
                        type="button"
                        className={`rounded-full cursor-pointer px-4 py-2 text-sm font-semibold transition ${mode === "letter"
                                ? "bg-amber-400 text-[#2d2215]"
                                : "border border-amber-300 bg-white/70 text-[#5f421b]"
                            }`}
                        onClick={() => setMode("letter")}
                    >
                        Letter
                    </button>
                    <button
                        type="button"
                        className="rounded-full border cursor-pointer border-amber-300 bg-white/70 px-4 py-2 text-sm font-semibold text-[#5f421b] transition hover:bg-amber-50"
                        onClick={onBack}
                    >
                        Back to Library
                    </button>
                </div>
            </div>

            {mode === "letter" && (
                <LetterSelector
                    selectedLetter={selectedLetter}
                    onSelectLetter={onSelectLetter}
                />
            )}

            {mode === "letter" && letterCards.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-amber-300 bg-[#fffaf0] p-8 text-center text-[#6a573c]">
                    No words under this letter yet.
                </div>
            ) : (
                <div className="flex flex-1 items-center justify-center">
                    <button
                        type="button"
                        className="min-h-[22rem] w-full max-w-2xl rounded-[2rem] border border-amber-200 bg-[#fffdf2] p-8 text-left shadow-[0_22px_90px_rgba(93,64,20,0.14)] transition hover:border-amber-400"
                        onClick={() => setIsFlipped((current) => !current)}
                    >
                        {!currentCard ? (
                            <p className="text-center text-[#6a573c]">No card selected.</p>
                        ) : isFlipped ? (
                            <div className="flex flex-col gap-5">
                                <div>
                                    <p className="text-sm font-semibold text-amber-700 uppercase">
                                        {currentCard.partOfSpeech}
                                    </p>
                                    <h2 className="mt-2 text-4xl font-semibold text-[#2d2215]">
                                        {currentCard.word}
                                    </h2>
                                </div>
                                <div>
                                    <p className="text-sm font-semibold text-[#7a633f]">
                                        Meaning
                                    </p>
                                    <p className="mt-1 text-xl leading-8 text-[#2d2215]">
                                        {currentCard.meaning}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-sm font-semibold text-[#7a633f]">
                                        Example
                                    </p>
                                    <p className="mt-1 text-lg leading-8 text-[#3d2c17]">
                                        {currentCard.example}
                                    </p>
                                </div>
                                {currentCard.mySentence && (
                                    <div>
                                        <p className="text-sm font-semibold text-[#7a633f]">
                                            My sentence
                                        </p>
                                        <p className="mt-1 text-lg leading-8 text-[#3d2c17]">
                                            {currentCard.mySentence}
                                        </p>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="flex min-h-[18rem] items-center justify-center">
                                <h2 className="text-center text-5xl font-semibold text-[#2d2215]">
                                    {currentCard.word}
                                </h2>
                            </div>
                        )}
                    </button>
                </div>
            )}

            <div className="flex flex-col items-center justify-between gap-3 rounded-3xl border border-amber-200 bg-[#fff8dd] p-4 sm:flex-row">
                <p className="text-sm font-medium text-[#6a573c]">
                    {finishMessage ||
                        (mode === "random"
                            ? "Tap the card to flip it. Next chooses another saved word."
                            : `Card ${Math.min(letterIndex + 1, letterCards.length)} of ${letterCards.length
                            } for ${selectedLetter}.`)}
                </p>
                <button
                    type="button"
                    className="rounded-full cursor-pointer bg-amber-400 px-5 py-3 text-sm font-semibold text-[#2d2215] transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-60"
                    onClick={mode === "random" ? nextRandomCard : nextLetterCard}
                    disabled={mode === "letter" && letterCards.length === 0}
                >
                    Next Card
                </button>
            </div>
        </div>
    );
}

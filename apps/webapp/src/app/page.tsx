"use client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageSquare, Zap, Sparkles, Brain, MessageCircle, Rocket, TestTube, User } from "lucide-react";
import { useAuth } from "@/context/auth";
import { useBetterChat } from "@/context/betterChatContext";
import { Fragment, useState, useRef, useEffect } from "react";
import { SignInDialog } from "@/components/dialog/sign-in";
import { useRouter } from "next/navigation";

function formatTime(dateString: string) {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function HomePage() {
    const { user } = useAuth();
    const {
        messages,
        selectedThreadId: threadId,
        startNewThread,
        isStreaming,
    } = useBetterChat();
    const [open, setOpen] = useState(false);
    const [showChat, setShowChat] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);
    const router = useRouter();

    // Auto-scroll to bottom when messages change
    useEffect(() => {
        if (scrollRef.current && showChat) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, showChat]);

    // Navigate to chat page when a thread is created
    useEffect(() => {
        if (threadId && messages.length > 0) {
            router.push(`/chat/${threadId}`);
        }
    }, [threadId, messages.length, router]);

    // Show chat if there are messages
    useEffect(() => {
        if (messages.length > 0 && !showChat) {
            setShowChat(true);
        }
    }, [messages.length, showChat]);

    // Determine current streaming assistant message, if any
    const streamingMessage = messages
        .filter(m => m.role === 'assistant' && m.status === 'streaming')
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

    const displayContent = streamingMessage?.content ?? '';
    const displayStatus: 'streaming' | 'complete' | 'error' = streamingMessage?.status ?? 'complete';

    const handleStartNewThread = () => {
        startNewThread();
        setShowChat(true);
    };

    return (
        <Fragment>
            <SignInDialog open={open} onOpenChange={setOpen} />
            <div className="flex bg-background text-foreground">
                {/* Main Content */}
                <div className="flex-1 flex flex-col">
                    {!showChat ? (
                        /* Hero Section */
                        <div className="flex-1 flex flex-col items-center justify-center p-8 max-w-4xl mx-auto w-full">
                            <div className="text-center mb-12">
                                <div className="inline-flex items-center justify-center w-20 h-20 bg-primary rounded-2xl mb-6">
                                    <Rocket className="w-10 h-10 text-primary-foreground" />
                                </div>
                                <h1 className="text-5xl font-bold text-foreground mb-4">Fast Chat App</h1>
                                <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                                    Experience lightning-fast AI conversations with real-time streaming responses. Powered by Claude, GPT, and
                                    Gemini models.
                                </p>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex items-center justify-center mb-16">
                                {user ? (
                                    <Button size="lg" className="px-8" onClick={handleStartNewThread}>
                                        <MessageCircle className="w-5 h-5 mr-2" />
                                        Start Chatting
                                    </Button>
                                ) : (
                                    <Button size="lg" className="px-8" onClick={() => setOpen(true)}>
                                        <MessageCircle className="w-5 h-5 mr-2" />
                                        Start Chatting
                                    </Button>
                                )}
                            </div>

                            {/* Feature Cards */}
                            <div className="grid md:grid-cols-3 gap-6 w-full mb-16">
                                <Card>
                                    <CardHeader className="pb-4">
                                        <div className="flex items-center space-x-3">
                                            <div className="w-10 h-10 bg-accent rounded-lg flex items-center justify-center">
                                                <Zap className="w-5 h-5 text-accent-foreground" />
                                            </div>
                                            <CardTitle>Sync & Resume Streams</CardTitle>
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        <CardDescription>
                                            Seamlessly sync conversations across devices with resumeable streaming technology. Never lose progress
                                            even if connections drop.
                                        </CardDescription>
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardHeader className="pb-4">
                                        <div className="flex items-center space-x-3">
                                            <div className="w-10 h-10 bg-accent rounded-lg flex items-center justify-center">
                                                <Brain className="w-5 h-5 text-accent-foreground" />
                                            </div>
                                            <CardTitle>Multiple AI Models</CardTitle>
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        <CardDescription>
                                            Choose from 17+ AI models including Claude 3.5 Sonnet, GPT-4o, and Gemini 2.5 Pro for diverse
                                            capabilities.
                                        </CardDescription>
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardHeader className="pb-4">
                                        <div className="flex items-center space-x-3">
                                            <div className="w-10 h-10 bg-accent rounded-lg flex items-center justify-center">
                                                <Sparkles className="w-5 h-5 text-accent-foreground" />
                                            </div>
                                            <CardTitle>Modern Interface</CardTitle>
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        <CardDescription>
                                            Clean, responsive design with sidebar navigation and beautiful message bubbles. Works seamlessly
                                            across devices.
                                        </CardDescription>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Getting Started Section */}
                            <div className="w-full max-w-3xl">
                                <div className="text-center mb-8">
                                    <h2 className="text-2xl font-semibold text-foreground mb-2">Getting Started</h2>
                                    <p className="text-muted-foreground">
                                        Jump right into the conversation or test the streaming functionality
                                    </p>
                                </div>

                                <div className="grid md:grid-cols-2 gap-6">
                                    {user ? (
                                        <Card>
                                            <CardHeader>
                                                <CardTitle className="flex items-center">
                                                    <MessageSquare className="w-5 h-5 mr-2 text-primary" />
                                                    Ready to chat
                                                </CardTitle>
                                                <CardDescription>
                                                    Start a new conversation or continue from where you left off.
                                                </CardDescription>
                                            </CardHeader>
                                            <CardFooter>
                                                <Button className="w-full" onClick={handleStartNewThread}>
                                                    Start New Conversation
                                                </Button>
                                            </CardFooter>
                                        </Card>
                                    ) : (
                                        <Card>
                                            <CardHeader>
                                                <CardTitle className="flex items-center">
                                                    <User className="w-5 h-5 mr-2 text-primary" />
                                                    Sign in to start chatting
                                                </CardTitle>
                                                <CardDescription>
                                                    Sign in to start chatting with your favorite AI models.
                                                </CardDescription>
                                            </CardHeader>
                                            <CardFooter>
                                                <Button className="w-full" onClick={() => { setOpen(true) }}>Sign in</Button>
                                            </CardFooter>
                                        </Card>
                                    )}
                                    <Card>
                                        <CardHeader>
                                            <CardTitle className="flex items-center">
                                                <TestTube className="w-5 h-5 mr-2 text-destructive" />
                                                Debug & Reliability Test
                                            </CardTitle>
                                            <CardDescription>
                                                Advanced debugging interface to test streaming reliability, monitor connection stability, and
                                                analyze response performance metrics.
                                            </CardDescription>
                                        </CardHeader>
                                        <CardContent>
                                            <Button
                                                variant="outline"
                                                className="w-full border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
                                            >
                                                Test Streaming
                                            </Button>
                                        </CardContent>
                                    </Card>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div
                            ref={scrollRef}
                            className="flex-1 flex flex-col gap-6 p-4 pb-32 max-w-4xl w-full mx-auto overflow-y-auto"
                        >
                            {messages.map((msg) => (
                                <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    {msg.role === 'user' ? (
                                        // User message with bubble
                                        <div className="max-w-[80%] lg:max-w-[70%]">
                                            <div className="bg-primary text-primary-foreground rounded-2xl rounded-br-md px-4 py-3 shadow-sm">
                                                <div className="whitespace-pre-wrap break-words text-sm leading-relaxed">
                                                    {msg.content}
                                                </div>
                                            </div>
                                            <div className="text-xs text-muted-foreground text-right mt-1 px-1">
                                                {formatTime(msg.createdAt)}
                                            </div>
                                        </div>
                                    ) : (
                                        // Assistant message without bubble
                                        <div className="max-w-[85%] lg:max-w-[75%]">
                                            {/* Don't render the content if this message is currently streaming - let the streaming component handle it */}
                                            {msg.status === 'streaming' ? null : (
                                                <>
                                                    <div className="text-foreground">
                                                        <div className="prose prose-sm max-w-none dark:prose-invert prose-p:leading-relaxed prose-pre:bg-muted prose-pre:border prose-pre:border-border">
                                                            <div className="whitespace-pre-wrap break-words text-sm leading-relaxed">
                                                                {msg.content}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="text-xs text-muted-foreground text-left mt-2 px-1">
                                                        {formatTime(msg.createdAt)}
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))}
                            {/* Streaming message bubble - appears after the last message or replaces the streaming message */}
                            {streamingMessage && displayContent && (
                                <div className="flex justify-start">
                                    <div className="max-w-[85%] lg:max-w-[75%]">
                                        <div className="text-foreground">
                                            <div className="prose prose-sm max-w-none dark:prose-invert prose-p:leading-relaxed prose-pre:bg-muted prose-pre:border prose-pre:border-border">
                                                <div className="whitespace-pre-wrap break-words text-sm leading-relaxed min-h-[20px]">
                                                    {displayContent}
                                                </div>
                                            </div>
                                        </div>
                                        {/* Show timestamp if the message is completed */}
                                        {displayStatus === 'complete' && (
                                            <div className="text-xs text-muted-foreground text-left mt-2 px-1">
                                                {streamingMessage?.createdAt ? formatTime(streamingMessage.createdAt) : 'Pending...'}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Streaming status */}
                            {streamingMessage && displayStatus === 'streaming' && (
                                <div className="pl-2">
                                    <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                                        <div className="flex items-center gap-2">
                                            <div className="flex space-x-1">
                                                <div className="w-1.5 h-1.5 bg-current rounded-full animate-bounce"></div>
                                                <div className="w-1.5 h-1.5 bg-current rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                                                <div className="w-1.5 h-1.5 bg-current rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                                            </div>
                                            <span className="text-xs">
                                                {streamingMessage?.content ? 'Thinking...' : 'Resuming stream...'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </Fragment>
    );
}
"use client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageSquare, Zap, Globe, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";

export default function HomePage() {
    const router = useRouter();

    return (
        <div className="container mx-auto max-w-4xl p-6 space-y-8">
            {/* Hero Section */}
            <div className="text-center space-y-4 py-12">
                <div className="text-6xl mb-4">🚀</div>
                <h1 className="text-4xl font-bold tracking-tight">
                    Fast Chat App
                </h1>
                <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                    Experience lightning-fast AI conversations with real-time streaming responses.
                    Powered by Claude, GPT, and Gemini models.
                </p>
                <div className="flex gap-4 justify-center pt-6">
                    <Button
                        size="lg"
                        onClick={() => router.push('/chat')}
                        className="gap-2"
                    >
                        <MessageSquare className="h-5 w-5" />
                        Start Chatting
                    </Button>
                    <Button
                        variant="outline"
                        size="lg"
                        onClick={() => router.push('/chat/test')}
                        className="gap-2"
                    >
                        <Zap className="h-5 w-5" />
                        Test Streaming
                    </Button>
                </div>
            </div>

            {/* Features Grid */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Zap className="h-5 w-5 text-yellow-500" />
                            Real-time Streaming
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <CardDescription>
                            Watch AI responses appear in real-time with our custom streaming hook.
                            No waiting for complete responses.
                        </CardDescription>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Globe className="h-5 w-5 text-blue-500" />
                            Multiple AI Models
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <CardDescription>
                            Choose from 17+ AI models including Claude 3.5 Sonnet, GPT-4o,
                            and Gemini 2.5 Pro for diverse capabilities.
                        </CardDescription>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Sparkles className="h-5 w-5 text-purple-500" />
                            Modern Interface
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <CardDescription>
                            Clean, responsive design with sidebar navigation and beautiful
                            message bubbles. Works seamlessly across devices.
                        </CardDescription>
                    </CardContent>
                </Card>
            </div>

            {/* Getting Started */}
            <Card>
                <CardHeader>
                    <CardTitle>Getting Started</CardTitle>
                    <CardDescription>
                        Jump right into the conversation or test the streaming functionality
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <h4 className="font-medium">Main Chat Interface</h4>
                            <p className="text-sm text-muted-foreground">
                                Full-featured chat with sidebar navigation and streaming responses.
                                Perfect for extended conversations.
                            </p>
                            <Button
                                variant="outline"
                                onClick={() => router.push('/chat')}
                                className="w-full"
                            >
                                Open Chat
                            </Button>
                        </div>
                        <div className="space-y-2">
                            <h4 className="font-medium">Streaming Test</h4>
                            <p className="text-sm text-muted-foreground">
                                Simple interface to test the streaming functionality with
                                debug information and connection status.
                            </p>
                            <Button
                                variant="outline"
                                onClick={() => router.push('/chat/test')}
                                className="w-full"
                            >
                                Test Streaming
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
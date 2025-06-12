"use client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageSquare, Zap, Sparkles, Brain, MessageCircle, Rocket, TestTube, User } from "lucide-react";
import { useAuth } from "@/components/provider/context";

import { Fragment, useState } from "react";
import { SignInDialog } from "@/components/dialog/sign-in";
export default function HomePage() {
    const { user } = useAuth();
    const [open, setOpen] = useState(false);
    return (
        <Fragment>
            <SignInDialog open={open} onOpenChange={setOpen} />
            <div className="flex bg-background text-foreground">
                {/* Main Content */}
                <div className="flex-1 flex flex-col">
                    {/* Hero Section */}
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
                            <Button size="lg" className="px-8">
                                <MessageCircle className="w-5 h-5 mr-2" />
                                Start Chatting
                            </Button>
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
                                    <Fragment>

                                    </Fragment>
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
                </div>
            </div>
        </Fragment>
    );
}